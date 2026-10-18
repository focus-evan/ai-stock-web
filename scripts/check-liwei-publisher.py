"""Focused regression checks for scoped publication, history and navigation."""
import copy, importlib.util, json, pathlib, tempfile, unittest
P=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('publisher',P/'publish-liwei-model.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class Checks(unittest.TestCase):
    def test_navigation_preserves_yeren_and_is_idempotent(self):
        original='<main><nav class="portal-menu"><a href="methods/index.html">野人交易手册</a></nav><h2>账号</h2></main>'
        result=m.navigation(original)
        self.assertIn('<a href="methods/index.html">野人交易手册</a>',result)
        self.assertEqual(result,m.navigation(result));self.assertEqual(result.count('data-liwei-portal'),1)
    def test_corpus_refresh_preserves_independent_report(self):
        before={'entries':[{'id':'douyin/liwei-model/index.html','collection':'douyin','generatedAt':'2026-10-18T20:48:28+08:00'}], 'attachments':[{'id':'douyin/liwei-model/latest.json','collection':'douyin'}]}
        after={'entries':[{'id':'other/index.html','collection':'other'}], 'attachments':[], 'collections':[{'id':'other','pageCount':1},{'id':'douyin','pageCount':0}]}
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);m.write(root/'catalog.json',after);(root/'content/douyin').mkdir(parents=True);(root/'content/douyin/index.html').write_text('<h2>账号</h2>')
            m.preserve_liwei(root,before);result=m.read(root/'catalog.json')
            self.assertEqual(result['entries'][0],after['entries'][0]);self.assertEqual(result['entries'][1],before['entries'][0]);self.assertEqual(result['collections'][0],after['collections'][0])
            m.preserve_liwei(root,before);self.assertEqual(result,m.read(root/'catalog.json'))
    def test_public_export_has_no_machine_paths(self):
        value={'source_path':'/Users/person/private.json','nested':['file:///Users/person/private','normal']}
        self.assertNotIn('/Users/',json.dumps(m.clean(value)));self.assertNotIn('source_path',m.clean(value))
    def test_only_configured_nginx_head_filter_is_accepted(self):
        raw=b'<head><title>report</title></head><body>unchanged</body>'
        replacement='<script type="module" src="/assets/research-theme-example.js"></script></head>'
        served=m.served_html(raw,replacement)
        self.assertEqual(served,raw.replace(b'</head>',replacement.encode(),1))
        self.assertNotEqual(served,served.replace(b'unchanged',b'changed'))
        self.assertEqual(m.served_html(b'no explicit head',replacement),b'no explicit head')
    def test_frozen_inputs_reproduce_price_state(self):
        spec=importlib.util.spec_from_file_location('liwei_engine',P.parent/'research-library/liwei-model/engine.py')
        engine=importlib.util.module_from_spec(spec);spec.loader.exec_module(engine)
        root=P.parent/'public/research-library/content/douyin/liwei-model'
        history=m.read(root/'history.json');snapshot=root/pathlib.Path(history[0]['href']).parent
        result=engine.evaluate(m.read(snapshot/'market-history.json'),m.read(snapshot/'context.json'))
        original=m.read(snapshot/'result.json')
        for key in ['state','conclusion','indices','data_errors','original_indicators']:
            self.assertEqual(result[key],original[key])
    def test_static_links_and_latest_snapshot(self):
        root=P.parent/'public/research-library/content/douyin/liwei-model'
        self.assertGreater(m.validate_export(root),0)
        history=m.read(root/'history.json');result=m.read(root/pathlib.Path(history[0]['href']).parent/'result.json')
        self.assertEqual(m.read(root/'latest.json'),result)
        self.assertIn('本时段研判尚未更新',(root/'index.html').read_text())

if __name__=='__main__':unittest.main()
