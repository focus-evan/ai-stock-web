import json,hashlib
from datetime import datetime
from pathlib import Path
B=Path(r"D:\Evan\html\automation-2-holdings"); H=B/'latest.html'; J=B/'latest.json'; R=B/'review_latest.json'; M=B/'market_tencent_20261120.json'; A={"300502","688008","688017","688012","002837","002409","688300","001270","03750.HK","09988.HK"}; BAD=["????","???","�","Ã","Â","鐐","鍥"]
def s(p):return p.read_bytes().decode('utf-8')
d=json.loads(s(J)); r=json.loads(s(R)); st=datetime.fromisoformat(d['generated_at']).strftime('%Y%m%d_%H%M%S'); ah=B/'archive'/f'automation_2_holdings_{st}.html'; ar=B/'archive'/f'automation_2_holdings_review_{st}.json'; m=json.loads(s(M))
assert d['risk_level']=='红色' and {x['code'] for x in d['holdings']}==A and len(d['holdings'])==10
exp={"300502":167.06,"688008":137.6,"688017":245.8,"688012":256.5,"002837":34.62,"002409":82.64,"688300":73.54,"001270":70.69,"03750.HK":349.8,"09988.HK":80.55}; assert {x['code']:x['last_close'] for x in d['holdings']}==exp
ali=next(x for x in d['holdings'] if x['code']=='09988.HK'); assert ali['earnings_status']=='正式季度业绩已披露' and ali['earnings_expectation_result']=='符合预期' and '2715.19亿元' in ali['earnings_note'] and 'FactSet' in ali['earnings_note']
assert d['accuracy_review']==r==json.loads(s(ar)) and r['summary']['exact_effective']==9 and r['summary']['repair_upgrade']==1
assert d['macro_radar']['radar_score']==8.4 and d['macro_radar']['state']=='S7 退潮确认'
assert set(m['quotes'])==A and all(x[-1]['date']=='2026-11-19' for x in m['quotes'].values())
for p in (H,J,R,ah,ar,M):
 t=s(p); assert not any(b in t for b in BAD); print(p.name,len(t),hashlib.sha256(p.read_bytes()).hexdigest()[:16])
page=s(H); assert H.read_bytes()==ah.read_bytes() and '<meta charset="utf-8">' in page
for x in ('今日高危预警','总阀门','二季度/半年报预期差','判断正确性验证 / 逻辑校准','RadarScore 8.4','约617家','收入略超','EPS不及','AI云'):assert x in page,x
print('PASS',d['risk_level'],st)
