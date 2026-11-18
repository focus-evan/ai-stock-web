from __future__ import annotations
import hashlib, json
from datetime import datetime
from pathlib import Path
BASE=Path(r"D:\Evan\html\automation-2-holdings"); LATEST_HTML=BASE/"latest.html"; LATEST_JSON=BASE/"latest.json"; REVIEW_JSON=BASE/"review_latest.json"; MARKET_JSON=BASE/"market_tencent_20261119.json"
ACTIVE={"300502","688008","688017","688012","002837","002409","688300","001270","03750.HK","09988.HK"}; ALLOWED={"超预期","符合预期","不及预期","无可靠预期","暂未披露"}; VERDICTS={"完全有效","方向偏保守但操作有效","修复有效需上调观察","低估风险需上调"}; BAD=["????","???","\ufffd","\u00c3","\u00c2","\u9400","\u9365"]
def strict(path): return path.read_bytes().decode("utf-8",errors="strict")
data=json.loads(strict(LATEST_JSON)); review=json.loads(strict(REVIEW_JSON)); stamp=datetime.fromisoformat(data["generated_at"]).strftime("%Y%m%d_%H%M%S"); archive=BASE/"archive"/f"automation_2_holdings_{stamp}.html"; review_archive=BASE/"archive"/f"automation_2_holdings_review_{stamp}.json"; market=json.loads(strict(MARKET_JSON))
assert data["risk_level"]=="红色" and len(data["holdings"])==10 and {x["code"] for x in data["holdings"]}==ACTIVE
assert [x["name"] for x in data["top_attention"]]==["阿里巴巴-W","新易盛","联瑞新材"]
expected={"300502":158.21,"688008":137.79,"688017":252.27,"688012":244.17,"002837":35.43,"002409":82.68,"688300":74.1,"001270":71.35,"03750.HK":370.0,"09988.HK":85.25}
assert {x["code"]:x["last_close"] for x in data["holdings"]}==expected
for x in data["holdings"]: assert x["last_trade_date"]=="2026-11-18" and x["earnings_expectation_result"] in ALLOWED
risk={x["code"]:x["risk_level"] for x in data["holdings"]}; assert risk["688012"]==risk["03750.HK"]=="橙色" and all(risk[c]=="红色" for c in ACTIVE-{"688012","03750.HK"})
newyi=next(x for x in data["holdings"] if x["code"]=="300502"); assert "不存在需求预期下修或砍单" in newyi["bull"] and "1.6T" in newyi["bull"]
montage=next(x for x in data["holdings"] if x["code"]=="688008"); assert "331.39万股" in montage["bull"] and "均价150.88元" in montage["bull"]
ali=next(x for x in data["holdings"] if x["code"]=="09988.HK"); assert "今日20:00" in ali["bull"] and ali["earnings_expectation_result"]=="无可靠预期"
assert data["accuracy_review"]==review==json.loads(strict(review_archive)); assert review["summary"]["exact_effective"]==6 and review["summary"]["repair_upgrade"]==4 and review["summary"]["underestimated_risk"]==0
assert all(x["review_price_date"]=="2026-11-18" and x["verification"] in VERDICTS for x in review["items"])
radar=data["macro_radar"]; assert radar["state"]=="S7 退潮确认" and radar["radar_score"]==16.1 and (radar["MSS"],radar["MBS"],radar["FRS"],radar["TES"],radar["ET"])==(28,8,6,18,5)
assert set(market["quotes"])==ACTIVE and all(rows[-1]["date"]=="2026-11-18" for rows in market["quotes"].values()) and all(not any(row["date"]>="2026-11-19" for row in rows) for rows in market["quotes"].values())
for p in (LATEST_HTML,LATEST_JSON,REVIEW_JSON,archive,review_archive,MARKET_JSON):
 t=strict(p); assert not any(b in t for b in BAD); print(p.name,len(t),hashlib.sha256(p.read_bytes()).hexdigest()[:16])
page=strict(LATEST_HTML); assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>") and LATEST_HTML.read_bytes()==archive.read_bytes()
for m in ("今日高危预警","总阀门","需要重点注意的3只股票","二季度/半年报预期差","判断正确性验证 / 逻辑校准","宏观环境与A股情绪雷达","RadarScore 16.1","S7 退潮确认","约3991股下跌","订单充足","331.39万股","今日20:00"): assert m in page,m
print("PASS",data["risk_level"],data["gate"][:60],stamp)
