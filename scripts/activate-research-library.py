"""Publish research static files independently of the frontend checkout/build.

Each release preserves its predecessor using hardlinks. Changed files are unlinked
before replacement; the live pointer moves only after checks. No release pruning.
"""
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import urllib.parse
import urllib.request
import uuid

ROOT = Path('/data/research-library-publisher')
WEB = Path('/var/www/html/financial-data-platform-main/research-library')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_relative(name):
    p = PurePosixPath(name)
    if not name or '\\' in name or p.is_absolute() or '..' in p.parts or str(p) != name:
        raise ValueError('Invalid package path: ' + name)
    return p


def file_hashes(directory):
    result = {}
    for p in sorted(directory.rglob('*')):
        if p.is_symlink():
            raise ValueError('Unexpected symlink inside content: ' + str(p))
        if p.is_file():
            result[p.relative_to(directory).as_posix()] = digest(p.read_bytes())
    return result


def fingerprint(files):
    return digest(json.dumps(files, sort_keys=True, separators=(',', ':')).encode())


def status(web=WEB):
    files = file_hashes(web.resolve(strict=True))
    catalog = json.loads((web / 'catalog.json').read_text())
    return {'base': fingerprint(files), 'files': files,
            'collections': [g['id'] for g in catalog['collections']],
            'fingerprint': catalog['fingerprint']}


def replace_link(link, target):
    temporary = link.with_name(link.name + '.next-' + uuid.uuid4().hex)
    temporary.symlink_to(target, target_is_directory=True)
    os.replace(temporary, link)


def validate_catalog(directory, previous):
    catalog = json.loads((directory / 'catalog.json').read_text())
    assert set(previous).issubset({g['id'] for g in catalog['collections']}), 'Collection loss'
    for entry in catalog['entries'] + catalog['attachments']:
        relative = urllib.parse.unquote(entry['href'])
        safe_relative(relative)
        assert relative.startswith('content/'), 'Unexpected catalog URL'
        assert (directory / relative).is_file(), 'Missing catalog file: ' + relative
    return catalog


def probe_catalog(expected):
    url = 'http://127.0.0.1:3667/research-library/catalog.json?verify=' + uuid.uuid4().hex
    with urllib.request.urlopen(url, timeout=15) as response:
        assert digest(response.read()) == expected, 'Served catalog does not match release'
    for url in ['http://127.0.0.1:3667/', 'http://127.0.0.1:3667/api/health']:
        with urllib.request.urlopen(url, timeout=15) as response:
            assert response.status == 200, 'Frontend/API probe failed'


def activate(bundle, root=ROOT, web=WEB, probe=probe_catalog):
    root.mkdir(parents=True, exist_ok=True)
    with (root / 'publish.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        baseline = status(web)
        with tarfile.open(bundle, 'r:gz') as archive:
            members = archive.getmembers()
            assert len({m.name for m in members}) == len(members), 'Duplicate archive paths'
            for member in members:
                safe_relative(member.name)
                assert member.isfile(), 'Only regular package files allowed'
            request = json.load(archive.extractfile('_publish-request.json'))
            assert request['base'] == baseline['base'], 'Live content changed; retry against new baseline'
            for name in request['files']:
                safe_relative(name)
            assert all(m.name == '_publish-request.json' or m.name in request['files'] for m in members)
            changed_bytes = sum(m.size for m in members)
            assert shutil.disk_usage(root).free > changed_bytes + 512 * 1024**2, 'Insufficient content-release headroom'
            release_id = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ-') + uuid.uuid4().hex[:8]
            release = root / 'releases' / release_id
            release.parent.mkdir(exist_ok=True)
            shutil.copytree(web.resolve(strict=True), release, copy_function=os.link)
            for member in members:
                if member.name == '_publish-request.json':
                    continue
                destination = release / member.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists():
                    destination.unlink()  # Break hardlink; never overwrite a prior release.
                with archive.extractfile(member) as source, destination.open('wb') as output:
                    shutil.copyfileobj(source, output)
                destination.chmod(0o644)
            for name, expected in request['files'].items():
                assert digest((release / name).read_bytes()) == expected, 'Hash mismatch: ' + name
            catalog = validate_catalog(release, baseline['collections'])
            current = root / 'current'
            previous_target = os.readlink(current) if current.is_symlink() else None
            bootstrap = None
            previous_web_link = os.readlink(web) if web.is_symlink() else None
            replace_link(current, release)
            try:
                if not web.is_symlink():
                    bootstrap = web.with_name('research-library.rollback-' + release_id)
                    os.replace(web, bootstrap)
                    replace_link(web, current)
                elif web.resolve() != current.resolve():
                    replace_link(web, current)
                probe(request['files']['catalog.json'])
            except Exception:
                if previous_target:
                    replace_link(current, previous_target)
                if bootstrap:
                    web.unlink()
                    os.replace(bootstrap, web)
                elif previous_web_link:
                    replace_link(web, previous_web_link)
                raise
            result = {'status': 'published', 'release': str(release),
                      'rollback': str(bootstrap or previous_target), 'revision': request['revision'],
                      'fingerprint': catalog['fingerprint'], 'collections': len(catalog['collections']),
                      'pages': len(catalog['entries']), 'changedFiles': len(members) - 1}
            (root / 'last-publish.json').write_text(json.dumps(result, indent=2) + '\n')
            return result


if __name__ == '__main__':
    if sys.argv[1:] == ['status']:
        print(json.dumps(status(), separators=(',', ':')))
    elif len(sys.argv) == 3 and sys.argv[1] == 'activate':
        bundle = Path(sys.argv[2]).resolve(strict=True)
        assert bundle.parent == ROOT / 'incoming', 'Bundle must be in dedicated incoming directory'
        print(json.dumps(activate(bundle)))
        bundle.unlink()  # Only the successfully consumed transport bundle, never a release.
    else:
        raise SystemExit('Usage: activate-research-library.py status | activate <bundle>')
