import hashlib
import json
from datetime import datetime
from pathlib import Path

B = Path(r"D:\Evan\html\automation-2-holdings")
H, J, R, M = B / "latest.html", B / "latest.json", B / "review_latest.json", B / "market_tencent_20261125.json"
ACTIVE = {"300502", "688008", "688017", "688012", "002837", "002409", "688300", "001270", "03750.HK", "09988.HK"}
BAD = ["????", "???", "�", "Ã", "Â", "鐐", "鍥"]
ALLOWED = {"完全有效", "方向偏保守但操作有效", "修复有效需上调观察", "低估风险需上调"}

def text(path): return path.read_bytes().decode("utf-8")

d, r, m = json.loads(text(J)), json.loads(text(R)), json.loads(text(M))
stamp = datetime.fromisoformat(d["generated_at"]).strftime("%Y%m%d_%H%M%S")
ah = B / "archive" / f"automation_2_holdings_{stamp}.html"
ar = B / "archive" / f"automation_2_holdings_review_{stamp}.json"
assert d["risk_level"] == "红色" and d["macro_radar"]["state"] == "S7 退潮确认（硬风险覆盖）"
assert d["macro_radar"]["radar_score"] == 28.6 and d["macro_radar"]["warning"] == "红色"
assert "风险预算0%-5%" in d["gate"] and "SOXX跌8.25%" in d["gate"]
assert {x["code"] for x in d["holdings"]} == ACTIVE and all(x["last_trade_date"] == "2026-11-24" for x in d["holdings"])
assert all(k in x for x in d["holdings"] for k in ("earnings_status", "earnings_expectation_result", "earnings_note"))
assert all(x["earnings_expectation_result"] in {"超预期", "符合预期", "不及预期", "无可靠预期", "暂未披露"} for x in d["holdings"])
assert r["summary"]["exact_effective"] == 7 and r["summary"]["repair_upgrade"] == 3
assert all(x["verification"] in ALLOWED for x in r["items"]) and d["accuracy_review"] == r == json.loads(text(ar))
assert all(rows[-1]["date"] == "2026-11-24" for rows in m["quotes"].values())
assert next(x for x in d["holdings"] if x["code"] == "688300")["last_close"] == 73.62
assert "三个月不强赎" in next(x for x in d["holdings"] if x["code"] == "688300")["message_level"]
for path in (H, J, R, ah, ar, M):
    value = text(path)
    assert not any(mark in value for mark in BAD), (path, [mark for mark in BAD if mark in value])
    print(path.name, len(value), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = text(H)
assert H.read_bytes() == ah.read_bytes() and '<meta charset="utf-8">' in page.lower()
for marker in ("今日高危预警", "总阀门", "S7 退潮确认（硬风险覆盖）", "RadarScore 28.6", "封板率降至44.72%", "三个月不强赎", "二季度/半年报预期差", "判断正确性验证"):
    assert marker in page, marker
print("PASS", d["risk_level"], stamp)
