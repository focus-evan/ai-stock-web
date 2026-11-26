import hashlib,json
from datetime import datetime
from pathlib import Path
B=Path(r"D:\Evan\html\automation-2-holdings");H=B/"latest.html";J=B/"latest.json";R=B/"review_latest.json";M=B/"market_tencent_20261127.json";A={"300502","688008","688017","688012","002837","002409","688300","001270","03750.HK","09988.HK"};BAD=["????","???","�","Ã","Â","鐐","鍥"];ALLOWED={"完全有效","方向偏保守但操作有效","修复有效需上调观察","低估风险需上调"}
def s(p):return p.read_bytes().decode("utf-8")
d=json.loads(s(J));r=json.loads(s(R));m=json.loads(s(M));st=datetime.fromisoformat(d["generated_at"]).strftime("%Y%m%d_%H%M%S");ah=B/"archive"/f"automation_2_holdings_{st}.html";ar=B/"archive"/f"automation_2_holdings_review_{st}.json"
assert d["risk_level"]=="红色" and d["macro_radar"]["state"]=="S1 冰点观察（首日弱修复）" and d["macro_radar"]["radar_score"]==30.2
assert "3642股下跌" in d["gate"] and "风险预算0%-5%" in d["gate"] and {x["code"] for x in d["holdings"]}==A and all(x["last_trade_date"]=="2026-11-26" for x in d["holdings"])
assert all(k in x for x in d["holdings"] for k in ("earnings_status","earnings_expectation_result","earnings_note")) and all(x["earnings_expectation_result"] in {"超预期","符合预期","不及预期","无可靠预期","暂未披露"} for x in d["holdings"])
assert r["summary"]["exact_effective"]==5 and r["summary"]["repair_upgrade"]==5 and all(x["verification"] in ALLOWED for x in r["items"]) and d["accuracy_review"]==r==json.loads(s(ar))
assert all(rows[-1]["date"]=="2026-11-26" for rows in m["quotes"].values()) and next(x for x in d["holdings"] if x["code"]=="002837")["last_close"]==30.58
for p in(H,J,R,ah,ar,M):t=s(p);assert not any(b in t for b in BAD),(p,[b for b in BAD if b in t]);print(p.name,len(t),hashlib.sha256(p.read_bytes()).hexdigest()[:16])
page=s(H);assert H.read_bytes()==ah.read_bytes() and '<meta charset="utf-8">' in page.lower()
for x in("今日高危预警","总阀门","S1 冰点观察（首日弱修复）","RadarScore 30.2","3642股下跌","前三季度营收+22.94%","存货约25.07亿元","二季度/半年报预期差","判断正确性验证"):assert x in page,x
print("PASS",d["risk_level"],st)
