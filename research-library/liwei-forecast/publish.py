"""Scope-limited static overlay over the live library. Never deploy/restart applications."""
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tarfile
import urllib.parse
import urllib.request
import uuid

from ledger import canonical, immutable, read, sha, write
from market import TZ

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[1]
TARGET='root@121.196.147.222'
REMOTE='/data/research-library-publisher'
PUBLIC='http://121.196.147.222:3667/research-library/'
PREFIX='content/skill-list/liwei-personal-model/'
PORTAL='content/skill-list/index.html'
SSH=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10']

def digest(data):return hashlib.sha256(data).hexdigest()
def run(args):
    result=subprocess.run(args,capture_output=True,timeout=180)
    if result.returncode:raise ValueError((result.stderr or result.stdout).decode(errors='replace')[:1500])
    return result.stdout
def ssh(command):return run(['ssh',*SSH,TARGET,command])
def hashes(root):
    result={}
    for p in sorted(Path(root).rglob('*')):
        if p.is_symlink():raise ValueError('发布目录不接受符号链接')
        if p.is_file():result[p.relative_to(root).as_posix()]=digest(p.read_bytes())
    return result
def put(path,raw):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)


def checked_revision(branch):
    if not re.fullmatch(r'codex/[a-zA-Z0-9_./-]+',branch):raise ValueError('必须使用明确的codex功能分支')
    dirty=run(['git','-C',str(REPO),'status','--porcelain','--','research-library/liwei-forecast']).decode().strip()
    if dirty:raise ValueError('先提交本功能全部源码、测试和配置，再发布')
    head=run(['git','-C',str(REPO),'rev-parse','HEAD']).decode().strip()
    remote=run(['git','-C',str(REPO),'ls-remote','origin','refs/heads/'+branch]).decode().split()
    if not remote or remote[0]!=head:raise ValueError('远程功能分支没有当前精确提交，先推送')
    return head


def services():
    code="""import json,subprocess,urllib.request
rows=json.loads(subprocess.check_output(['docker','inspect']+subprocess.check_output(['docker','ps','-q']).decode().split()))
api=next(x for x in rows if x['Name']=='/app_api_main')
assert api['State']['Running'] and not api['State']['OOMKilled']
for u in ['http://127.0.0.1:3667/','http://127.0.0.1:3667/api/health']:
 with urllib.request.urlopen(u,timeout=20) as r: assert r.status==200
print(json.dumps({x['Name']:[x['Id'],x['State']['StartedAt'],x['RestartCount'],x['State']['OOMKilled']] for x in rows}))"""
    return json.loads(ssh("python3 - <<'PY'\n"+code+"\nPY"))


def decorate(page,depth):
    root='../'*depth
    if 'data-library-page' not in page.split('</head>',1)[0]:
        page=page.replace('<html ', '<html data-library-page ',1)
    if 'class="rl-reader-toolbar"' not in page:
        page=page.replace('</head>',f'<link rel="stylesheet" href="{root}_ui/reader.css"></head>',1)
        page=page.replace('<body>',f'<body><nav class="rl-reader-toolbar" aria-label="报告导航"><a class="rl-reader-home" href="{root}index.html">← 内容中心</a><a class="rl-reader-collection" href="{root}index.html?category=method">方法与创作</a><button type="button" data-reader-font aria-label="放大正文字号" aria-pressed="false">字号 A+</button><button type="button" data-reader-top>回顶部 ↑</button></nav>',1)
        page=page.replace('</body>',f'<script src="{root}_ui/reader.js" defer></script></body>',1)
    return page


def portal_navigation(page):
    pattern=r'<a\b[^>]*href="liwei-personal-model/index[.]html"[^>]*>.*?</a>'
    card='<a class="card" data-liwei-forecast="v1" href="liwei-personal-model/index.html"><h3>立伟每日预判与验证</h3><p>下一交易日收盘方向、次日真实行情核验、累计正确率与基准对照。保留模型报告、原文证据和逐日冻结记录。</p><div class="tags"><span class="tag blue">每日预判</span><span class="tag amber">次日验证</span><span class="tag blue">正确率统计</span></div></a>'
    matches=list(re.finditer(pattern,page,re.S))
    if len(matches)!=1:raise ValueError('方法论入口结构变化，需要保留现有菜单后再合并')
    return re.sub(pattern,lambda m:card,page,count=1,flags=re.S)


def publish(state,output,branch):
    state,output=Path(state),Path(output)
    revision=checked_revision(branch)
    before_services=services()
    baseline=json.loads(ssh(f'python3 {REMOTE}/activate-research-library.py status'))
    attempt=state/'publication'/uuid.uuid4().hex
    candidate=attempt/'candidate';candidate.mkdir(parents=True)
    write(attempt/'baseline.json',baseline)
    for name in ('catalog.json','.sync-manifest.json',PORTAL):
        raw=ssh(f'cat {REMOTE}/current/{name}')
        if digest(raw)!=baseline['files'][name]:raise ValueError('线上基线变化，请重新合并')
        put(candidate/name,raw)
    old=read(candidate/'catalog.json');catalog=copy.deepcopy(old)
    portal=(candidate/PORTAL).read_text(encoding='utf-8')
    put(candidate/PORTAL,portal_navigation(portal).encode())
    local_portal=output.parent/'index.html'
    if local_portal.exists():
        local=local_portal.read_text(encoding='utf-8')
        put(local_portal,portal_navigation(local).encode())
    original_hashes=hashes(output)
    dashboard=read(output/'forecast-latest.json')
    for relative in original_hashes:
        p=output/relative
        if p.suffix not in ('.html','.json','.txt'):raise ValueError('发布范围出现未审核文件: '+relative)
        raw=p.read_bytes()
        if p.suffix=='.html':raw=decorate(raw.decode(),3+relative.count('/')).encode()
        put(candidate/PREFIX/relative,raw)
    now=dt.datetime.now(TZ)
    identifier_prefix=PREFIX.removeprefix('content/')
    for key in ('entries','attachments'):
        catalog[key]=[e for e in catalog[key] if not e['id'].startswith(identifier_prefix)]
    for relative in original_hashes:
        p=candidate/PREFIX/relative;name=PREFIX+relative
        entry={'id':name.removeprefix('content/'),'href':name,'collection':'skill-list','category':'method'}
        if p.suffix=='.html':
            title=re.search(r'<title>(.*?)</title>',p.read_text(encoding='utf-8'),re.S).group(1)
            report_date=dashboard['generated_at'][:10] if relative=='index.html' else '2026-10-26'
            entry.update(title=title,description='每日冻结下一交易日沪深方向，次日拉取真实行情核验；展示整体与分指数正确率、观望覆盖率和简单基准。' if relative=='index.html' else '立伟语料模型的规则、反例、时间留出复核与REA证据。',date=report_date,reportDate=report_date,modifiedAt=now.isoformat(),isArchive=relative!='index.html',searchText=title+' 立伟 预测 预判 验证 正确率 每日 模型')
            if relative=='index.html':entry.update(generatedAt=dashboard['generated_at'],marketDataDate=dashboard.get('latest_input_date'),refreshPolicy={'days':'weekdays','times':['15:50','19:50','20:50'],'graceMinutes':90})
            catalog['entries'].append(entry)
        else:
            entry.update(title=p.name,bytes=p.stat().st_size,type=p.suffix[1:].upper());catalog['attachments'].append(entry)
    for key in ('entries','attachments'):
        unrelated=lambda rows:[r for r in rows if not r['id'].startswith(identifier_prefix)]
        if unrelated(catalog[key])!=unrelated(old[key]):raise ValueError('不相关目录元数据发生变化')
    for group in catalog['collections']:
        if group['id']=='skill-list':
            group['pageCount']=sum(e['collection']=='skill-list' for e in catalog['entries'])
            group['attachmentCount']=sum(e['collection']=='skill-list' for e in catalog['attachments'])
    manifest=read(candidate/'.sync-manifest.json')
    overlays={k:v for k,v in hashes(candidate).items() if k not in ('catalog.json','.sync-manifest.json')}
    for name,value in overlays.items():
        key=name.removeprefix('content/')
        manifest['sourceHashes'][key]=original_hashes[name.removeprefix(PREFIX)] if name.startswith(PREFIX) else value
        if key not in manifest['files']:manifest['files'].append(key)
    manifest['files'].sort()
    catalog['fingerprint']=digest(json.dumps(manifest['sourceHashes'],sort_keys=True,separators=(',',':')).encode())
    catalog['syncedAt']=now.isoformat()
    names=[n for n in overlays if n in baseline['files']]
    code="import json\nfrom pathlib import Path\np=Path("+repr(REMOTE+'/current')+")\nprint(json.dumps({n:(p/n).stat().st_size for n in "+repr(names)+"}))"
    sizes=json.loads(ssh("python3 - <<'PY'\n"+code+"\nPY"))
    catalog['totalBytes']=old['totalBytes']+sum((candidate/n).stat().st_size-sizes.get(n,0) for n in overlays)
    write(candidate/'catalog.json',catalog);write(candidate/'.sync-manifest.json',manifest)
    new_hashes=hashes(candidate);all_files={**baseline['files'],**new_hashes}
    changed=[n for n,v in new_hashes.items() if baseline['files'].get(n)!=v]
    if any(not (n.startswith(PREFIX) or n in (PORTAL,'catalog.json','.sync-manifest.json')) for n in changed):raise ValueError('超出发布范围')
    # Existing per-day public evidence is immutable, including reviews and receipts.
    if any(n.startswith(PREFIX+'daily/') and n in baseline['files'] for n in changed):raise ValueError('试图改写已公开日级快照')
    for e in catalog['entries']+catalog['attachments']:
        if urllib.parse.unquote(e['href']) not in all_files:raise ValueError('目录链接目标不存在')
    if hashes(output)!=original_hashes:raise ValueError('本地输出在准备期间发生变化')
    request={'base':baseline['base'],'files':all_files,'revision':revision}
    write(attempt/'_publish-request.json',request)
    nginx=ssh('cat /etc/nginx/conf.d/ai-stock-main.conf').decode()
    filters=re.findall("sub_filter '</head>' '([^']*)';",nginx)
    if len(filters)>1:raise ValueError('需要审核Nginx内容转换')
    replacement=filters[0] if filters else '</head>'
    if replacement!='</head>' and not re.fullmatch(r'<script type="module" src="/assets/research-theme-[A-Za-z0-9_-]+[.]js"></script></head>',replacement):raise ValueError('未知Nginx转换')
    if not changed:return {'status':'unchanged','revision':revision}
    bundle=attempt/'bundle.tar.gz'
    with tarfile.open(bundle,'w:gz') as tar:
        for name in changed:tar.add(candidate/name,arcname=name,recursive=False)
        tar.add(attempt/'_publish-request.json',arcname='_publish-request.json',recursive=False)
    remote_bundle=REMOTE+'/incoming/liwei-forecast-'+uuid.uuid4().hex+'.tar.gz'
    run(['scp',*SSH,str(bundle),TARGET+':'+remote_bundle])
    result=json.loads(ssh(f'python3 {REMOTE}/activate-research-library.py activate {remote_bundle}'))
    if result['status']!='published':raise ValueError('发布器没有确认成功')
    probes=[]
    for name in changed:
        if name=='.sync-manifest.json':continue
        raw=(candidate/name).read_bytes()
        expected=raw.replace(b'</head>',replacement.encode(),1) if name.endswith('.html') else raw
        with urllib.request.urlopen(PUBLIC+urllib.parse.quote(name,safe='/')+'?verify='+uuid.uuid4().hex,timeout=40) as response:
            actual=response.read()
            if response.status!=200 or actual!=expected:raise ValueError('公网内容不一致: '+name)
        probes.append({'path':name,'status':200,'sha256':digest(actual)})
    after=json.loads(ssh(f'python3 {REMOTE}/activate-research-library.py status'))
    if after['files']!=all_files:raise ValueError('发布后文件集合与预期不一致')
    if services()!=before_services:raise ValueError('发布期间服务状态发生变化，请核查')
    published_at=dt.datetime.now(TZ).isoformat()
    for p in sorted((state/'forecasts').glob('*.json')):
        f=read(p);name=PREFIX+'daily/'+f['target_date']+'/forecast.json'
        receipt_path=state/'receipts'/p.name
        if not receipt_path.exists() and name in all_files:
            if read(output/'daily'/f['target_date']/'forecast.json')!=f:raise ValueError('公开预判与本地冻结记录不一致')
            immutable(receipt_path,{'target_date':f['target_date'],'forecast_sha256':sha(f),'published_at':published_at,
                'release':result['release'],'public_file_sha256':all_files[name],'revision':revision})
    result.update(public_url=PUBLIC+PREFIX+'index.html',verified_at=published_at,unrelated_files_preserved=len(baseline['files'])-sum(n in baseline['files'] for n in changed),probes=probes,branch=branch,services_unchanged=True)
    write(attempt/'verification.json',result);write(state/'last-publication.json',result)
    return {k:v for k,v in result.items() if k!='probes'}
