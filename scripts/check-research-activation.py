import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('activation', Path(__file__).with_name('activate-research-library.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ActivationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='research-publish-test-')
        self.base = Path(self.temp.name)
        self.web = self.base / 'web'
        self.root = self.base / 'publisher'
        (self.web / 'content').mkdir(parents=True)
        self.catalog = {'fingerprint': 'old', 'collections': [{'id': 'test'}],
                        'entries': [{'href': 'content/report.html'}], 'attachments': []}
        (self.web / 'catalog.json').write_text(json.dumps(self.catalog))
        (self.web / 'content/report.html').write_text('old')

    def tearDown(self):
        self.temp.cleanup()

    def bundle(self, baseline=None):
        catalog = {**self.catalog, 'fingerprint': 'new'}
        files = {'catalog.json': json.dumps(catalog).encode(), 'content/report.html': b'new'}
        request = {'base': baseline or module.status(self.web)['base'], 'revision': 'test',
                   'files': {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}}
        files['_publish-request.json'] = json.dumps(request).encode()
        bundle = self.base / 'delta.tar.gz'
        with tarfile.open(bundle, 'w:gz') as archive:
            for name, data in files.items():
                member = tarfile.TarInfo(name)
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
        return bundle

    def test_success_keeps_previous_bytes_and_web_pointer(self):
        result = module.activate(self.bundle(), self.root, self.web, lambda _: None)
        self.assertEqual((self.web / 'content/report.html').read_text(), 'new')
        self.assertEqual((Path(result['rollback']) / 'content/report.html').read_text(), 'old')
        self.assertTrue(self.web.is_symlink())
        self.assertEqual(result['collections'], 1)

    def test_failed_probe_restores_original_web(self):
        def fail(_):
            raise RuntimeError('HTTP failure')
        with self.assertRaisesRegex(RuntimeError, 'HTTP failure'):
            module.activate(self.bundle(), self.root, self.web, fail)
        self.assertEqual((self.web / 'content/report.html').read_text(), 'old')

    def test_concurrent_release_is_rejected_before_swap(self):
        with self.assertRaisesRegex(AssertionError, 'Live content changed'):
            module.activate(self.bundle('stale-baseline'), self.root, self.web, lambda _: None)
        self.assertEqual((self.web / 'content/report.html').read_text(), 'old')

    def test_paths_cannot_escape_release(self):
        for value in ['../outside', '/etc/passwd', 'foo/../../outside', 'foo\\bar', './a']:
            with self.assertRaises(ValueError):
                module.safe_relative(value)


if __name__ == '__main__':
    unittest.main()
