#!/usr/bin/env python3
"""Install a narrow, reversible compatibility hook in the existing Mac publisher."""
import argparse, ast, datetime, pathlib
p=argparse.ArgumentParser();p.add_argument('--publisher',type=pathlib.Path,required=True);a=p.parse_args()
path=a.publisher.resolve(strict=True);text=path.read_text()
marker='# Keep independently published Liwei reports during corpus refresh.'
if marker in text:
    print('BRIDGE_ALREADY_INSTALLED');raise SystemExit(0)
needle='    candidate_hashes = hashes(candidate)'
assert text.count(needle)==1 and 'before_catalog =' in text,'Unsupported publisher revision'
module=(pathlib.Path(__file__).resolve().parent/'publish-liwei-model.py').as_posix()
hook='''    # Keep independently published Liwei reports during corpus refresh.
    import importlib.util
    liwei_spec = importlib.util.spec_from_file_location('liwei_publisher', MODULE_PATH)
    liwei_module = importlib.util.module_from_spec(liwei_spec)
    liwei_spec.loader.exec_module(liwei_module)
    liwei_module.preserve_liwei(candidate, before_catalog)
'''.replace('MODULE_PATH',repr(module))
new=text.replace(needle,hook+needle);ast.parse(new)
backup=path.with_name(path.name+'.before-liwei-'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
backup.write_text(text);path.write_text(new)
print('BRIDGE_INSTALLED; backup='+str(backup))
