import hashlib
import json
from datetime import datetime
from pathlib import Path


B = Path(r"D:\Evan\html\automation-2-holdings")
H = B / "latest.html"
J = B / "latest.json"
R = B / "review_latest.json"
M = B / "market_tencent_20261124.json"
ACTIVE = {"300502", "688008", "688017", "688012", "002837", "002409", "688300", "001270", "03750.HK", "09988.HK"}
BAD = ["????", "???", "�", "Ã", "Â", "鐐", "鍥"]
ALLOWED = {"完全有效", "方向偏保守但操作有效", "修复有效需上调观察", "低估风险需上调"}


def text(path):
    return path.read_bytes().decode("utf-8")


data = json.loads(text(J))
review = json.loads(text(R))
stamp = datetime.fromisoformat(data["generated_at"]).strftime("%Y%m%d_%H%M%S")
archive_html = B / "archive" / f"automation_2_holdings_{stamp}.html"
archive_review = B / "archive" / f"automation_2_holdings_review_{stamp}.json"
market = json.loads(text(M))

assert data["risk_level"] == "红色"
assert data["macro_radar"]["state"] == "S4 结构进攻信号（首日未确认）"
assert data["macro_radar"]["radar_score"] == 60.8
assert data["macro_radar"]["ET"] == 90
assert "风险预算上限5%" in data["gate"]
assert {x["code"] for x in data["holdings"]} == ACTIVE
assert all(x["last_trade_date"] == "2026-11-23" for x in data["holdings"])
assert all(k in x for x in data["holdings"] for k in ("earnings_status", "earnings_expectation_result", "earnings_note"))
assert all(x["earnings_expectation_result"] in {"超预期", "符合预期", "不及预期", "无可靠预期", "暂未披露"} for x in data["holdings"])
assert review["summary"]["exact_effective"] == 2
assert review["summary"]["repair_upgrade"] == 8
assert all(x["verification"] in ALLOWED for x in review["items"])
assert data["accuracy_review"] == review == json.loads(text(archive_review))
assert all(rows[-1]["date"] == "2026-11-23" for rows in market["quotes"].values())
assert next(x for x in data["holdings"] if x["code"] == "688017")["one_day_pct"] == 12.77
assert next(x for x in data["holdings"] if x["code"] == "002837")["risk_level"] == "红色"
assert next(x for x in data["holdings"] if x["code"] == "03750.HK")["risk_level"] == "红色"

for path in (H, J, R, archive_html, archive_review, M):
    value = text(path)
    assert not any(mark in value for mark in BAD), (path, [mark for mark in BAD if mark in value])
    print(path.name, len(value), hashlib.sha256(path.read_bytes()).hexdigest()[:16])

page = text(H)
assert H.read_bytes() == archive_html.read_bytes()
assert '<meta charset="utf-8">' in page.lower()
for marker in (
    "今日高危预警",
    "总阀门",
    "S4 结构进攻信号（首日未确认）",
    "RadarScore 60.8",
    "机器人66股涨停",
    "担保余额4220.16万元",
    "二季度/半年报预期差",
    "判断正确性验证",
):
    assert marker in page, marker
print("PASS", data["risk_level"], stamp)
