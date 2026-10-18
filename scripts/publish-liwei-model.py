#!/usr/bin/env python3
"""Export/publish Liwei research over the current live library; never deploy the app."""
import argparse
import copy
import datetime as dt
import fcntl
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import urllib.parse
import urllib.request
import uuid

PROJECT = Path(__file__).resolve().parents[1]
PREFIX = 'content/douyin/liwei-model/'
PUBLIC = 'http://121.196.147.222:3667/research-library/'
REMOTE = '/data/research-library-publisher'
TARGET = 'root@121.196.147.222'
TZ = dt.timezone(dt.timedelta(hours=8))

def digest(data): return hashlib.sha256(data).hexdigest()
def read(p): return json.loads(Path(p).read_text())
def write(p, value):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def hashes(root):
    result = {}
    for p in sorted(Path(root).rglob('*')):
        if p.is_symlink(): raise ValueError('Symlink in source')
        if p.is_file(): result[p.relative_to(root).as_posix()] = digest(p.read_bytes())
    return result

def clean(value):
    if isinstance(value, dict): return {k:clean(v) for k,v in value.items() if k not in {'source_path','transcript_path','raw_path'}}
    if isinstance(value, list): return [clean(v) for v in value]
    if isinstance(value, str): return re.sub(r'(?:file://)?/Users/[^\s"<>]+', '[本地研究存档]', value)
    return value

def esc(value): return html.escape(str(value), quote=True)

def navigation(page):
    """Idempotent, narrowly scoped insertion beside the existing Yeren entry."""
    if 'data-liwei-portal' in page: return page
    item = '<a class="featured" data-liwei-portal href="liwei-model/index.html"><b>立伟每日研判</b><span>08:30 盘前 · 19:30 复盘 · 历史与模型证据</span></a>'
    match = re.search(r'<nav\b[^>]*class="[^"]*portal-menu[^"]*"[^>]*>.*?</nav>', page, re.S)
    if match:
        section = match.group().replace('</nav>', item + '</nav>')
        return page[:match.start()] + section + page[match.end():]
    # Older local archive pages have no portal menu yet.
    menu = '<nav class="portal-menu" aria-label="抖音资料功能菜单">' + item + '</nav>'
    return page.replace('<h2>账号</h2>', menu + '<h2>账号</h2>', 1)

def preserve_liwei(candidate, before):
    """Keep independently published Liwei metadata/navigation in a corpus refresh."""
    candidate=Path(candidate)
    catalog=read(candidate/'catalog.json')
    for key in ['entries','attachments']:
        existing={x['id'] for x in catalog[key]}
        catalog[key].extend(copy.deepcopy(x) for x in before[key] if x['id'].startswith('douyin/liwei-model/') and x['id'] not in existing)
    if not any(x['id']=='douyin/liwei-model/index.html' for x in catalog['entries']):return
    portal=candidate/'content/douyin/index.html'
    prior_portal=portal.read_bytes()
    portal.write_text(navigation(prior_portal.decode()))
    if 'totalBytes' in catalog:catalog['totalBytes']+=len(portal.read_bytes())-len(prior_portal)
    for group in catalog['collections']:
        if group['id']=='douyin':
            group['pageCount']=sum(x['collection']=='douyin' for x in catalog['entries'])
            group['attachmentCount']=sum(x['collection']=='douyin' for x in catalog['attachments'])
    write(candidate/'catalog.json',catalog)

STYLE = '''<style>.lw-toolbar{padding:12px 22px;display:flex;gap:18px;flex-wrap:wrap;background:#fff;border-bottom:1px solid #dce3e8;font:15px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}.lw-toolbar a{color:#087b75}.lw-fresh{padding:12px 22px;background:#eaf5f2;color:#214b45;font-size:14px}.lw-fresh.overdue{background:#fff1d8;color:#794d0a}.lw-archive{display:grid;gap:12px}.lw-archive a{display:block;padding:16px;border:1px solid #dce3e8;border-radius:10px;text-decoration:none}.lw-archive small{display:block}.lw-history{max-width:1180px;margin:auto;padding:24px;font:16px/1.75 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#17253a} @media(max-width:700px){.lw-toolbar{gap:10px;padding:10px 16px}}</style>'''

def report_page(text, result, archive=False):
    root = '../../' if archive else ''
    portal = '../../../' if archive else '../'
    library = '../../../../../' if archive else '../../../'
    nav = f'<nav class="rl-reader-toolbar lw-toolbar" aria-label="研判导航"><a href="{library}index.html">← 内容中心</a><a href="{portal}index.html">抖音研究资料</a><a href="{root}index.html">最新研判</a><a href="{root}history.html">历史研判</a><a href="#model">模型与证据</a></nav>'
    status = f'<div class="lw-fresh" id="lw-fresh" data-as-of="{esc(result["as_of"])}">{"历史快照 · " if archive else "最新已发布报告 · "}报告 {esc(result["as_of"].replace("T"," "))} ｜ 行情截止 {esc(result["last_session"])} 收盘 ｜ 每天北京时间 08:30 / 19:30 更新</div>'
    text = re.sub(r'<a href="(?:../../)?engine.py">.*?</a>\s*·\s*', '', text)
    text = re.sub(r'<a href="(?:../../)?RUNBOOK.txt">.*?</a>\s*·\s*', '', text)
    text = text.replace('<title>立伟公开判断模型 · 每日研判</title>', '<title>立伟每日研判｜模型、条件与历史复核</title>')
    text = text.replace('<header>', STYLE + nav + status + '<header>', 1)
    if not archive:
        text = text.replace('<section id="model">', '<section id="history"><h2>历史研判</h2><p>每一期保留当时的判断、行情日期、条件和依据，便于下一期复核。</p><a href="history.html">查看全部历史研判 →</a></section><section id="model">', 1)
        # Date-based freshness is explicitly about report delivery, not exchange opening.
        script = '''<script>(()=>{const e=document.getElementById('lw-fresh');function update(){const now=Date.now(),local=new Date(now+8*3600000),day=local.toISOString().slice(0,10);let due=Date.parse(day+'T08:30:00+08:00');if(now>=Date.parse(day+'T19:30:00+08:00'))due=Date.parse(day+'T19:30:00+08:00');else if(now<due)due-=13*3600000;const published=Date.parse(e.dataset.asOf);if(now>due+90*60000&&published<due){e.classList.add('overdue');e.textContent='本时段研判尚未更新，请按下方报告日期阅读。'+e.dataset.asOf+' ｜ 每日北京时间 08:30 / 19:30，允许生成延迟 90 分钟。'}}update();setInterval(update,60000)})();</script>'''
        text = text.replace('</html>', script + '</html>')
    assert '/Users/' not in text and 'file://' not in text
    return text

def export(source, destination):
    latest = read(source/'latest.json')
    model = read(source/'model.json')
    snapshots = sorted((source/'daily').glob('*/result.json'), reverse=True)
    assert snapshots, 'No frozen report'
    assert read(snapshots[0]) == latest, 'Latest report must match most recent immutable snapshot'
    asof = dt.datetime.fromisoformat(latest['as_of'])
    assert asof.utcoffset() is not None and asof <= dt.datetime.now(TZ) + dt.timedelta(minutes=1), 'Invalid/future report time'
    dest = Path(destination); dest.mkdir(parents=True, exist_ok=True)
    for name in ['latest.json','model.json','corpus-index.json','corpus-audit.json','validation.json']:
        write(dest/name, clean(read(source/name)))
    (dest/'index.html').write_text(report_page((source/'index.html').read_text(), latest))
    history = []
    for item in snapshots:
        r = read(item); relative = 'daily/' + item.parent.name
        assert r['as_of'] <= latest['as_of'], 'Future snapshot'
        for name in ['result.json','context.json','market-history.json','model.json']:
            write(dest/relative/name, clean(read(item.parent/name)))
        (dest/relative/'report.html').write_text(report_page((item.parent/'report.html').read_text(), r, True))
        history.append({'as_of':r['as_of'],'last_session':r['last_session'],'session':r['session'],'state':r['state'],'conclusion':r['conclusion'],'href':relative+'/report.html'})
    write(dest/'history.json', history)
    cards = ''.join(f'<a href="{esc(x["href"])}"><b>{esc(x["as_of"].replace("T"," "))} · {esc(x["session"])}</b><span>{esc(x["state"])} · {esc(x["conclusion"])}</span><small>行情截止 {esc(x["last_session"])} 收盘 · 保留当期判断与数据</small></a>' for x in history)
    (dest/'history.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>立伟历史研判</title>'+STYLE+'<nav class="rl-reader-toolbar lw-toolbar"><a href="../index.html">← 抖音研究资料</a><a href="index.html">最新研判</a><a href="index.html#model">模型与证据</a></nav><main class="lw-history"><h1>立伟历史研判</h1><p>每天北京时间 08:30 与 19:30；休市日记录风险检查。历史报告保留当期条件，不以后来的结论覆盖。</p><div class="lw-archive">'+cards+'</div></main></html>')
    write(dest/'publication.json', {'model_version':model['version'],'generatedAt':latest['as_of'],'marketDataDate':latest['last_session'],'refreshPolicy':{'days':'daily','times':['08:30','19:30'],'graceMinutes':90},'publicUrl':PUBLIC+PREFIX+'index.html','reports':len(history)})
    validate_export(dest)
    return latest

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ['href','src'] and value:self.links.append(value)

def validate_export(dest):
    total=0
    for p in dest.rglob('*.html'):
        parser=Links();parser.feed(p.read_text())
        for link in parser.links:
            if link.startswith(('#','http:','https:')):continue
            path=(p.parent/urllib.parse.unquote(link.split('#')[0].split('?')[0])).resolve()
            if path.is_relative_to(dest.resolve()): assert path.is_file(), f'Missing link: {link}'
            else: assert path.name=='index.html', f'Unexpected external local link: {link}'
            total+=1
    return total

def run(args, **kwargs):
    r=subprocess.run(args, capture_output=True, timeout=240, **kwargs)
    if r.returncode:raise RuntimeError((r.stderr or r.stdout).decode()[-1800:])
    return r.stdout

def ssh(args, command):return run(['ssh',*args.ssh,TARGET,command])

def health(args):
    # Content-only preflight. No app checkout, build, service restart or config write.
    code='''import json,shutil,subprocess,urllib.request
from pathlib import Path
root=Path('/data/research-library-publisher')
assert shutil.disk_usage(root).free>=8*1024**3,'Disk below 8 GiB'
release=(root/'current').resolve(strict=True)
assert release.parent==root/'releases' and (release/'catalog.json').is_file(),'Rollback unavailable'
n=subprocess.run(['nginx','-t'],capture_output=True);assert n.returncode==0,'Invalid nginx'
items=json.loads(subprocess.check_output(['docker','inspect']+subprocess.check_output(['docker','ps','-q']).decode().split()))
services={x['Name']:{'id':x['Id'],'started':x['State']['StartedAt'],'restarts':x['RestartCount'],'oom':x['State']['OOMKilled']} for x in items}
x=next(x for x in items if x['Name']=='/app_api_main');assert x['State']['Running'] and not x['State']['OOMKilled'] and x['State'].get('Health',{}).get('Status')=='healthy','Backend unhealthy'
for url in ['http://127.0.0.1:3667/','http://127.0.0.1:3667/api/health','http://127.0.0.1:8001/api/health']:
 with urllib.request.urlopen(url,timeout=20) as r:assert r.status==200
print(json.dumps({'freeGiB':round(shutil.disk_usage(root).free/1024**3,3),'rollback':str(release),'services':services,'nginxWarnings':n.stderr.decode()}))'''
    return json.loads(ssh(args,"python3 - <<'PY'\n"+code+"\nPY"))

def prepare(args):
    attempt=args.state/(dt.datetime.now(TZ).strftime('%Y%m%d_%H%M%S')+'-'+uuid.uuid4().hex[:8]);attempt.mkdir(parents=True)
    before=health(args)
    baseline=json.loads(ssh(args,f'python3 {REMOTE}/activate-research-library.py status'))
    candidate=attempt/'candidate';candidate.mkdir()
    for name in ['catalog.json','.sync-manifest.json','content/douyin/index.html']:
        data=ssh(args,f'cat {REMOTE}/current/{name}')
        assert digest(data)==baseline['files'][name], 'Live version changed during capture'
        path=candidate/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    source_before=hashes(args.source)
    latest=export(args.source,candidate/PREFIX)
    assert hashes(args.source)==source_before,'Model changed during export'
    portal=candidate/'content/douyin/index.html'
    portal.write_text(navigation(portal.read_text()))
    assert 'data-liwei-portal' in portal.read_text(),'Portal entry missing'
    old=read(candidate/'catalog.json');catalog=copy.deepcopy(old)
    for key in ['entries','attachments']:
        catalog[key]=[x for x in catalog[key] if not x['id'].startswith('douyin/liwei-model/')]
    meta=read(candidate/PREFIX/'publication.json')
    for p in sorted((candidate/PREFIX).rglob('*')):
        if not p.is_file():continue
        name=p.relative_to(candidate).as_posix();identifier=name.removeprefix('content/')
        entry={'id':identifier,'collection':'douyin','category':'research','href':name}
        if p.suffix=='.html':
            archive='/daily/' in name
            result=read(p.parent/'result.json') if archive else latest
            title='立伟历史研判' if p.name=='history.html' else ('立伟每日研判 · '+result['session'] if archive else '立伟每日研判｜08:30 与 19:30')
            entry.update(title=title,description=result['conclusion'],date=result['as_of'][:10],reportDate=result['as_of'][:10],generatedAt=result['as_of'],marketDataDate=result['last_session'],modifiedAt=result['as_of'],isArchive=archive,searchText=title+' '+result['conclusion']+' 模型 规则 立伟 盘前 收盘 历史')
            if p.name=='index.html':entry['refreshPolicy']=meta['refreshPolicy']
            catalog['entries'].append(entry)
        else:
            entry.update(title=p.name,bytes=p.stat().st_size,type=p.suffix[1:].upper());catalog['attachments'].append(entry)
    for key in ['entries','attachments']:
        assert [x for x in old[key] if not x['id'].startswith('douyin/liwei-model/')]==[x for x in catalog[key] if not x['id'].startswith('douyin/liwei-model/')], 'Unrelated metadata changed'
    for group in catalog['collections']:
        if group['id']=='douyin':
            group['pageCount']=sum(x['collection']=='douyin' for x in catalog['entries'])
            group['attachmentCount']=sum(x['collection']=='douyin' for x in catalog['attachments'])
    manifest=read(candidate/'.sync-manifest.json')
    all_changes={k:v for k,v in hashes(candidate).items() if k not in ['catalog.json','.sync-manifest.json']}
    for name,value in all_changes.items():
        key=name.removeprefix('content/');manifest['sourceHashes'][key]=value
        if key not in manifest['files']:manifest['files'].append(key)
    manifest['files'].sort()
    catalog['fingerprint']=digest(json.dumps(manifest['sourceHashes'],sort_keys=True,separators=(',',':')).encode())
    catalog['syncedAt']=dt.datetime.now(dt.timezone.utc).isoformat()
    # totalBytes includes content only; obtain exact old sizes for overwritten files.
    old_names=[x for x in all_changes if x in baseline['files']]
    size_code='import json\nfrom pathlib import Path\np=Path('+repr(REMOTE+'/current')+')\nprint(json.dumps({n:(p/n).stat().st_size for n in '+repr(old_names)+'}))'
    sizes=json.loads(ssh(args,"python3 - <<'PY'\n"+size_code+"\nPY"))
    catalog['totalBytes']=old['totalBytes']+sum((candidate/n).stat().st_size-sizes.get(n,0) for n in all_changes)
    write(candidate/'catalog.json',catalog);write(candidate/'.sync-manifest.json',manifest)
    newhash=hashes(candidate);files={**baseline['files'],**newhash}
    changed=[n for n,h in newhash.items() if baseline['files'].get(n)!=h]
    assert all(n.startswith(PREFIX) or n in ['content/douyin/index.html','catalog.json','.sync-manifest.json'] for n in changed)
    # Existing frozen snapshots must never be rewritten by subsequent runs.
    for n in changed:
        assert not (n.startswith(PREFIX+'daily/') and n in baseline['files']), 'Historical snapshot mutation: '+n
    for entry in catalog['entries']+catalog['attachments']:
        assert urllib.parse.unquote(entry['href']) in files, 'Catalog target missing'
    request={'base':baseline['base'],'files':files,'revision':args.revision}
    write(attempt/'_publish-request.json',request)
    write(attempt/'prepared.json',{'changed':changed,'candidateHashes':newhash,'sourceHashes':source_before,'health':before,'as_of':latest['as_of']})
    print(json.dumps({'status':'prepared','attempt':str(attempt),'changedFiles':len(changed),'as_of':latest['as_of']},ensure_ascii=False),flush=True)
    return attempt

def activate(args,attempt):
    record=read(attempt/'prepared.json');request=read(attempt/'_publish-request.json');candidate=attempt/'candidate'
    assert record['candidateHashes']==hashes(candidate),'Candidate changed'
    assert record['sourceHashes']==hashes(args.source),'Model changed; prepare again'
    before=health(args)
    bundle=attempt/'bundle.tar.gz'
    with tarfile.open(bundle,'w:gz') as tar:
        for name in record['changed']:tar.add(candidate/name,arcname=name,recursive=False)
        tar.add(attempt/'_publish-request.json',arcname='_publish-request.json',recursive=False)
    remote_bundle=REMOTE+'/incoming/liwei-'+uuid.uuid4().hex+'.tar.gz'
    run(['scp',*args.ssh,str(bundle),TARGET+':'+remote_bundle])
    result=json.loads(ssh(args,f'python3 {REMOTE}/activate-research-library.py activate {remote_bundle}'))
    probes=['catalog.json','content/douyin/index.html',PREFIX+'index.html',PREFIX+'history.html',PREFIX+'latest.json',PREFIX+'model.json']
    # Also prove Yeren and the most recent snapshot survived.
    probes+=['content/douyin/methods/index.html']
    probes += [PREFIX+read(candidate/PREFIX/'history.json')[0]['href']]
    for name in probes:
        url=PUBLIC+urllib.parse.quote(name,safe='/')+'?verify='+uuid.uuid4().hex
        with urllib.request.urlopen(url,timeout=45) as response:
            assert response.status==200 and digest(response.read())==request['files'][name], 'Public hash mismatch: '+name
    after=health(args)
    assert before['services']==after['services'],'Container state changed during publication'
    result.update(verifiedAt=dt.datetime.now(TZ).isoformat(),publicUrl=PUBLIC+PREFIX+'index.html',publicProbes=probes,servicesUnchanged=True,as_of=record['as_of'],attempt=str(attempt))
    write(args.state/'last-publish.json',result)
    print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True);p.add_argument('--export',type=Path)
    p.add_argument('--state',type=Path,default=PROJECT/'research-library/liwei-publish-state')
    p.add_argument('--ssh-key',type=Path,default=Path.home()/'.ssh/id_ed25519_ai_stock_prod')
    p.add_argument('--check',action='store_true');p.add_argument('--activate',type=Path)
    args=p.parse_args();args.source=args.source.resolve()
    if args.export:
        export(args.source,args.export.resolve());print('EXPORT_VALIDATED');return
    args.ssh=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10','-i',str(args.ssh_key)]
    args.revision=run(['git','-C',str(PROJECT),'rev-parse','HEAD']).decode().strip()
    # Only tracked release code from a pushed main revision may publish.
    assert not run(['git','-C',str(PROJECT),'status','--porcelain','--','scripts/publish-liwei-model.py']), 'Commit publisher first'
    remote=run(['git','-C',str(PROJECT),'ls-remote','origin','refs/heads/main']).decode().split()[0]
    if remote!=args.revision:
        run(['git','-C',str(PROJECT),'fetch','origin','main'])
        run(['git','-C',str(PROJECT),'merge-base','--is-ancestor',args.revision,'origin/main'])
    args.state.mkdir(parents=True,exist_ok=True)
    with (args.state/'publish.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        attempt=args.activate.resolve() if args.activate else prepare(args)
        assert attempt.parent==args.state.resolve(),'Invalid attempt path'
        if not args.check:activate(args,attempt)

if __name__=='__main__':main()
