import json,hashlib
from datetime import datetime
from pathlib import Path
B=Path(r'D:\Evan\html\automation-2-holdings');H=B/'latest.html';J=B/'latest.json';R=B/'review_latest.json';M=B/'market_tencent_20261123.json';A={"300502","688008","688017","688012","002837","002409","688300","001270","03750.HK","09988.HK"};BAD=['????','???','�','Ã','Â','鐐','鍥']
def s(p):return p.read_bytes().decode('utf-8')
d=json.loads(s(J));r=json.loads(s(R));st=datetime.fromisoformat(d['generated_at']).strftime('%Y%m%d_%H%M%S');ah=B/'archive'/f'automation_2_holdings_{st}.html';ar=B/'archive'/f'automation_2_holdings_review_{st}.json';m=json.loads(s(M));assert d['risk_level']=='红色' and d['macro_radar']['state']=='S0 绝对防守' and d['macro_radar']['radar_score']==3.5;assert {x['code'] for x in d['holdings']}==A and all(x['last_trade_date']=='2026-11-20' for x in d['holdings']);assert r['summary']['exact_effective']==9 and r['summary']['useful_but_conservative']==1 and d['accuracy_review']==r==json.loads(s(ar));assert all(x[-1]['date']=='2026-11-20' for x in m['quotes'].values())
for p in(H,J,R,ah,ar,M):t=s(p);assert not any(b in t for b in BAD);print(p.name,len(t),hashlib.sha256(p.read_bytes()).hexdigest()[:16])
page=s(H);assert H.read_bytes()==ah.read_bytes();
for x in('今日高危预警','S0 绝对防守','RadarScore 3.5','5083股下跌','SOXX跌10.54%','二季度/半年报预期差'):assert x in page,x
print('PASS',d['risk_level'],st)
