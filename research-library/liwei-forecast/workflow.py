"""Liwei daily forecast workflow. No orders, no retrospective prediction backfill."""
import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
import urllib.request

from ledger import Calendar, canonical, evaluate, freeze, immutable, read, sha, summarize, write
from market import TZ, SYMBOLS, download, features, fetch_bundle

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
DEFAULT_STATE = Path('D:/Evan/Codes/.codex-output/liwei-forecast-live')
DEFAULT_OUTPUT = Path('D:/Evan/html/skill-list/liwei-personal-model')
LIVE_REPORT = 'http://121.196.147.222:3667/research-library/content/douyin/liwei-model/latest.json'


def load_specs():
    return read(HERE/'contract.json'), read(HERE/'rubric.json'), Calendar(read(HERE/'calendar.json'))


def code_identity():
    revision = subprocess.check_output(['git','-C',str(REPO),'rev-parse','HEAD'],text=True).strip()
    files = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.suffix in ('.py','.json','.md')}
    return {'git_revision':revision,'source_tree_sha256':sha(files)}


def update_status(state, **values):
    path = Path(state)/'status.json'
    status = read(path) if path.exists() else {}
    status.update(values)
    write(path,status)
    return status


def report_reference():
    try:
        data, payload_sha = download(LIVE_REPORT)
        context = data.get('context',{})
        return {'url':LIVE_REPORT,'payload_sha256':payload_sha,'as_of':data.get('as_of'),'last_session':data.get('last_session'),
            'state':data.get('state'),'conclusion':data.get('conclusion'),'analysis':context.get('analysis',[]),
            'scenarios':context.get('scenarios',[]),'missing_modules':data.get('missing_modules',[]),
            'note':'历史日更为参考，不能把其状态标签事后当成方向预测；只使用本次冻结前已发布的内容。'}
    except Exception as exc:
        return {'url':LIVE_REPORT,'error':str(exc),'note':'旧日报不可用；冻结语料规则仍可读取，需明确该来源缺口。'}


def prepare(state, now):
    contract,rubric,calendar=load_specs()
    completed=calendar.last_completed(now)
    bundle=fetch_bundle(completed,now)
    facts={}
    errors=list(bundle['errors'])
    for symbol in SYMBOLS:
        try:
            facts[symbol]=features(bundle,symbol)
        except Exception as exc:
            errors.append(str(exc))
    today=now.astimezone(TZ).date().isoformat()
    ready=calendar.is_open(today) and now.astimezone(TZ).time()>=dt.time(19,30) and completed==today and not errors
    target=calendar.next(today) if calendar.is_open(today) else calendar.next(completed)
    context={'prepared_at':now.isoformat(),'completed_date':completed,'target_date':target,'forecast_ready':ready,
        'contract_sha256':sha(contract),'rubric_sha256':sha(rubric),'market':bundle,'features':facts,'errors':errors,
        'report_reference':report_reference(),'code_identity':code_identity(),
        'authoring_instructions':'依据rubric给唯一主判断，分别列事实、假设和反证；允许观望。禁止虚构私有恐贪/底部/席位属性。不能用条件分支任意选择事后命中的解释。'}
    write(Path(state)/'prepared.json',context)
    immutable(Path(state)/'market-inputs'/f'{sha(bundle)}.json',bundle)
    phase='data_error' if errors else 'ready_for_forecast' if ready else 'await_evening_close'
    update_status(state,last_check_at=now.isoformat(),phase=phase,errors=errors,completed_date=completed,next_target_date=target,
        market_sources={s:[bundle['indices'][s][p]['provider'] for p in ('primary','secondary')] for s in bundle['indices']})
    return {'status':phase,'context_file':str(Path(state)/'prepared.json'),'context_sha256':sha(context),'target_date':target,'errors':errors}


def load_ledger(state):
    state=Path(state)
    forecasts=[read(p) for p in sorted((state/'forecasts').glob('*.json'))]
    outcomes={p.stem:read(p) for p in sorted((state/'evaluations').glob('*.json'))}
    receipts={p.stem:read(p) for p in sorted((state/'receipts').glob('*.json'))}
    return forecasts,outcomes,receipts


def review(state,now):
    contract,rubric,calendar=load_specs()
    forecasts,outcomes,receipts=load_ledger(state)
    completed=calendar.last_completed(now)
    due=[f for f in forecasts if f['target_date']<=completed and f['target_date'] not in outcomes]
    if not due:
        update_status(state,last_review_at=now.isoformat(),review_phase='no_due_forecasts',review_errors=[])
        return {'status':'no_due_forecasts','reviewed':[]}
    bundle=fetch_bundle(completed,now)
    if bundle['errors']:
        update_status(state,last_review_at=now.isoformat(),review_phase='pending_data',review_errors=bundle['errors'])
        return {'status':'pending_data','reviewed':[],'errors':bundle['errors']}
    completed_reviews,errors=[],[]
    for f in due:
        try:
            result=evaluate(f,bundle,receipts.get(f['target_date']),calendar,now)
            # Inputs and outcome stay as first reviewed. Corrections require a separate record/version.
            immutable(Path(state)/'review-inputs'/f'{f["target_date"]}.json',bundle)
            immutable(Path(state)/'evaluations'/f'{f["target_date"]}.json',result)
            completed_reviews.append(f['target_date'])
        except Exception as exc:
            errors.append(f['target_date']+': '+str(exc))
    update_status(state,last_review_at=now.isoformat(),review_phase='pending_data' if errors else 'reviewed',review_errors=errors)
    return {'status':'pending_data' if errors else 'reviewed','reviewed':completed_reviews,'errors':errors}


def initialize_output(output):
    output=Path(output)
    original=output/'index.html'
    methodology=output/'methodology.html'
    if not methodology.exists():
        if not original.exists() or 'data-liwei-forecast-dashboard' in original.read_text(encoding='utf-8'):
            raise ValueError('原方法报告缺失，不能覆盖入口')
        shutil.copy2(original,methodology)
    for name in ('contract.json','rubric.json','calendar.json'):
        shutil.copy2(HERE/name,output/name)


def render(state,output,now):
    from render import render_page
    contract,rubric,calendar=load_specs()
    initialize_output(output)
    forecasts,outcomes,receipts=load_ledger(state)
    stats=summarize(forecasts,outcomes,receipts,contract,calendar,now)
    status=read(Path(state)/'status.json') if (Path(state)/'status.json').exists() else {}
    context=read(Path(state)/'prepared.json') if (Path(state)/'prepared.json').exists() else None
    history=[]
    for f in forecasts:
        date=f['target_date'];dest=Path(output)/'daily'/date
        immutable(dest/'forecast.json',f)
        immutable(dest/'inputs.json',read(Path(state)/'inputs'/f'{date}.json'))
        if date in outcomes:
            immutable(dest/'evaluation.json',outcomes[date])
        if date in receipts:
            immutable(dest/'publication.json',receipts[date])
        history.append({'forecast':f,'evaluation':outcomes.get(date),'publication':receipts.get(date)})
    data={'generated_at':now.isoformat(),'contract':contract,'stats':stats,'status':status,'history':history,
        'latest_features':context.get('features',{}) if context else {},'latest_input_date':context.get('completed_date') if context else None,
        'report_reference':context.get('report_reference',{}) if context else {}}
    write(Path(output)/'forecast-latest.json',data)
    write(Path(output)/'forecast-history.json',history)
    write(Path(output)/'forecast-statistics.json',stats)
    page=render_page(data,calendar,now)
    (Path(output)/'index.html').write_text(page,encoding='utf-8')
    write(Path(state)/'last-render.json',{'at':now.isoformat(),'html_sha256':hashlib.sha256(page.encode()).hexdigest(),'forecasts':len(forecasts),'evaluations':len(outcomes)})
    return {'status':'rendered','forecast_count':len(forecasts),'evaluation_count':len(outcomes),'accuracy':stats['accuracy'],'output':str(output)}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['prepare','freeze','review','render','status','publish'])
    parser.add_argument('--state',type=Path,default=DEFAULT_STATE)
    parser.add_argument('--output',type=Path,default=DEFAULT_OUTPUT)
    parser.add_argument('--draft',type=Path)
    parser.add_argument('--branch',default='codex/liwei-forecast-validation-20261027')
    args=parser.parse_args();args.state.mkdir(parents=True,exist_ok=True)
    now=dt.datetime.now(TZ)
    try:
        if args.action=='prepare':result=prepare(args.state,now)
        elif args.action=='review':result=review(args.state,now)
        elif args.action=='freeze':
            if args.draft is None:raise ValueError('freeze需要--draft')
            contract,rubric,calendar=load_specs()
            result=freeze(args.state,read(args.draft),read(args.state/'prepared.json'),contract,rubric,calendar,now)
            result={'status':'frozen','target_date':result['target_date'],'forecast_sha256':sha(result)}
        elif args.action=='render':result=render(args.state,args.output,now)
        elif args.action=='publish':
            from publish import publish
            result=publish(args.state,args.output,args.branch)
        else:
            contract,rubric,calendar=load_specs();f,o,r=load_ledger(args.state)
            result={'status':read(args.state/'status.json') if (args.state/'status.json').exists() else {},'statistics':summarize(f,o,r,contract,calendar,now),'frozen_targets':[x['target_date'] for x in f]}
        print(json.dumps(result,ensure_ascii=False,indent=2))
        if result.get('status') in ('data_error','pending_data'):raise SystemExit(2)
    except Exception as exc:
        update_status(args.state,last_error_at=now.isoformat(),last_error=str(exc))
        print(json.dumps({'status':'error','error':str(exc)},ensure_ascii=False));raise SystemExit(1)


if __name__=='__main__':main()
