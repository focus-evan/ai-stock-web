"""UTF-8/PAX transport, including Windows paths longer than MAX_PATH."""
import json
import os
from pathlib import Path, PurePosixPath
import sys
import tarfile


def native_path(path):
    value = str(Path(path).resolve())
    return '\\\\?\\' + value if os.name == 'nt' and not value.startswith('\\\\?\\') else value


def pack(source, request_path, output, names):
    with tarfile.open(native_path(output), 'w:gz', format=tarfile.PAX_FORMAT, compresslevel=3) as archive:
        for name in names:
            relative = PurePosixPath(name)
            if relative.is_absolute() or '..' in relative.parts or '\\' in name:
                raise ValueError('Invalid package path: ' + name)
            filename = Path(source) / name
            if filename.is_symlink():
                raise ValueError('Only regular files may be published')
            archive.add(native_path(filename), arcname=name, recursive=False)
        archive.add(native_path(request_path), arcname='_publish-request.json', recursive=False)


if __name__ == '__main__':
    source, request, output, listing = sys.argv[1:]
    names = json.loads(Path(listing).read_text(encoding='utf-8'))
    pack(source, request, output, names)
    print(json.dumps({'files': len(names), 'bytes': Path(output).stat().st_size}))
