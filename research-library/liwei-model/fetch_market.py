import concurrent.futures, datetime as dt, json, pathlib, urllib.request
from zoneinfo import ZoneInfo

import os
ROOT = pathlib.Path(os.environ.get('LIWEI_MODEL_DIR', pathlib.Path(__file__).resolve().parent))
NOW = dt.datetime.now(ZoneInfo('Asia/Shanghai'))
SYMBOLS = {'000001.SS':'上证综指', '399001.SZ':'深证成指', '399006.SZ':'创业板指'}

def fetch(symbol, name):
    start=int(dt.datetime(2024,1,1,tzinfo=dt.timezone.utc).timestamp())
    end=int((NOW+dt.timedelta(days=1)).timestamp())
    errors=[]
    for host in ['query1.finance.yahoo.com','query2.finance.yahoo.com']:
        url=f'https://{host}/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1d&events=history'
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=25) as r: payload=json.load(r)
            p=payload['chart']['result'][0]; q=p['indicators']['quote'][0]; rows=[]
            for i,t in enumerate(p['timestamp']):
                stamp=dt.datetime.fromtimestamp(t,ZoneInfo('Asia/Shanghai'))
                if stamp.date()>NOW.date() or (stamp.date()==NOW.date() and NOW.hour<15): continue
                row={'date':stamp.date().isoformat(),**{k:q[k][i] for k in ['open','high','low','close','volume']}}
                if all(row[k] is not None for k in ['open','high','low','close']): rows.append(row)
            rows=sorted({r['date']:r for r in rows}.values(),key=lambda r:r['date'])
            if not rows: raise ValueError('No completed daily bars')
            return symbol, {'name':name,'symbol':symbol,'source_url':url,'retrieved_at':NOW.isoformat(),'provider':'Yahoo Finance','currency':p['meta'].get('currency'),'rows':rows,'error':None}
        except Exception as e: errors.append(type(e).__name__+': '+str(e))
    return symbol, {'name':name,'symbol':symbol,'rows':[],'error':errors,'retrieved_at':NOW.isoformat()}

if __name__=='__main__':
    ROOT.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        result=dict(pool.map(lambda kv:fetch(*kv),SYMBOLS.items()))
    out={'retrieved_at':NOW.isoformat(),'timezone':'Asia/Shanghai','indices':result,'note':'Only completed daily bars; prices are raw index points. Provider volume units are not used as CNY turnover.'}
    dest=ROOT/'market-history.json'; dest.write_text(json.dumps(out,ensure_ascii=False,indent=2))
    for k,v in result.items(): print(k,len(v['rows']),v['rows'][-1] if v['rows'] else v['error'])
