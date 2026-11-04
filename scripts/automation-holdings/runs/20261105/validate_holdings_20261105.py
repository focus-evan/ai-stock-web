from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261105.json"
ACTIVE = {"300502", "688008", "688017", "688012", "002837", "002409", "688300", "001270", "03750.HK", "09988.HK"}
ALLOWED = {"超预期", "符合预期", "不及预期", "无可靠预期", "暂未披露"}
VERDICTS = {"完全有效", "方向偏保守但操作有效", "修复有效需上调观察", "低估风险需上调"}
BAD = ["????", "???", "\ufffd", "\u00c3", "\u00c2", "\u9400", "\u9365"]


def strict(path: Path) -> str:
    return path.read_bytes().decode("utf-8", errors="strict")


data = json.loads(strict(LATEST_JSON))
review = json.loads(strict(REVIEW_JSON))
stamp = datetime.fromisoformat(data["generated_at"]).strftime("%Y%m%d_%H%M%S")
archive = BASE / "archive" / f"automation_2_holdings_{stamp}.html"
review_archive = BASE / "archive" / f"automation_2_holdings_review_{stamp}.json"
review_copy = json.loads(strict(review_archive))
market = json.loads(strict(MARKET_JSON))
assert data["risk_level"] == "红色" and len(data["holdings"]) == 10
assert {x["code"] for x in data["holdings"]} == ACTIVE
assert [x["name"] for x in data["top_attention"]] == ["新易盛", "中微公司", "阿里巴巴-W"]
for item in data["holdings"]:
    assert item["last_trade_date"] == "2026-11-04"
    assert item["earnings_expectation_result"] in ALLOWED
    assert item["risk_level"] == "橙色"
expected = {
    "300502": 196.5, "688008": 167.82, "688017": 286.01, "688012": 240.01,
    "002837": 38.82, "002409": 83.66, "688300": 83.06, "001270": 86.05,
    "03750.HK": 377.0, "09988.HK": 100.6,
}
assert {x["code"]: x["last_close"] for x in data["holdings"]} == expected
envicool = next(x for x in data["holdings"] if x["code"] == "002837")
assert envicool["earnings_expectation_result"] == "无可靠预期" and "154.95%" in envicool["earnings_note"]
newyi = next(x for x in data["holdings"] if x["code"] == "300502")
assert newyi["earnings_expectation_result"] == "无可靠预期" and "109.40亿元" in newyi["earnings_note"] and "13.35%" in newyi["bull"]
green = next(x for x in data["holdings"] if x["code"] == "688017")
assert green["earnings_expectation_result"] == "超预期" and "164.68%" in green["earnings_note"]
amec = next(x for x in data["holdings"] if x["code"] == "688012")
assert amec["earnings_expectation_result"] == "无可靠预期" and "8.08亿元" in amec["earnings_note"]
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert linked["earnings_expectation_result"] == "超预期" and "1.11亿元" in linked["earnings_note"]
yake = next(x for x in data["holdings"] if x["code"] == "002409")
assert yake["earnings_expectation_result"] == "不及预期" and "2.88亿元" in yake["earnings_note"]
ali = next(x for x in data["holdings"] if x["code"] == "09988.HK")
assert "Apple" in ali["bull"] and "千问" in ali["bull"] and ali["judgement"] == "利多"
catl = next(x for x in data["holdings"] if x["code"] == "03750.HK")
assert "MOU" in catl["bull"] and catl["last_close"] == 377.0
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["exact_effective"] == 2 and review["summary"]["useful_but_conservative"] == 0
assert review["summary"]["repair_upgrade"] == 8 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-11-04" and x["verification"] in VERDICTS for x in review["items"])
radar = data["macro_radar"]
assert radar["warning"] == "橙色" and radar["state"] == "S2 冰点转折" and radar["radar_score"] == 54.4
assert (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (40, 68, 52, 60, 28)
assert set(market["quotes"]) == ACTIVE and all(rows[-1]["date"] == "2026-11-04" for rows in market["quotes"].values())
assert all(not any(row["date"] >= "2026-11-05" for row in rows) for rows in market["quotes"].values())
for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path)
    assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in (
    "今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差",
    "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "宏观环境与A股情绪雷达",
    "RadarScore 54.4", "S2 冰点转折", "今日大盘情绪预警：橙色", "约4667股上涨",
    "SOXX约-3.00%", "Apple智能", "千问", "家储MOU", "橙色修复观察",
):
    assert marker in page, marker
assert "2026-11-05" in page and LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
