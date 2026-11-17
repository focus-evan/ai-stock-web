from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261118.json"
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
assert [x["name"] for x in data["top_attention"]] == ["阿里巴巴-W", "新易盛", "联瑞新材"]
for item in data["holdings"]:
    assert item["last_trade_date"] == "2026-11-17"
    assert item["risk_level"] == "红色"
    assert item["earnings_expectation_result"] in ALLOWED
expected = {
    "300502": 160.0, "688008": 130.6, "688017": 254.0, "688012": 238.5,
    "002837": 34.09, "002409": 83.73, "688300": 71.28, "001270": 73.73,
    "03750.HK": 366.8, "09988.HK": 85.45,
}
assert {x["code"]: x["last_close"] for x in data["holdings"]} == expected
newyi = next(x for x in data["holdings"] if x["code"] == "300502")
assert newyi["three_day_pct"] == -22.17 and "高位踩踏风险" in newyi["action"]
amec = next(x for x in data["holdings"] if x["code"] == "688012")
assert amec["one_day_pct"] == 2.27 and "首日收回238" in amec["bull"]
yake = next(x for x in data["holdings"] if x["code"] == "002409")
assert yake["one_day_pct"] == 5.59 and "首日收回82.7/83.7" in yake["bull"]
ali = next(x for x in data["holdings"] if x["code"] == "09988.HK")
assert ali["one_day_pct"] == -5.21 and "ADR再跌4.40%" in ali["bear"]
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert linked["position"].startswith("260股") and linked["earnings_expectation_result"] == "超预期"
assert "未来20日若再有5日" in linked["bear"] and "赎回尚未实施" in linked["bear"]
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["exact_effective"] == 8 and review["summary"]["useful_but_conservative"] == 0
assert review["summary"]["repair_upgrade"] == 2 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-11-17" and x["verification"] in VERDICTS for x in review["items"])
radar = data["macro_radar"]
assert radar["warning"] == "红色" and radar["state"] == "S7 退潮确认" and radar["radar_score"] == 12.7
assert (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (28, 5, 5, 8, 2)
assert set(market["quotes"]) == ACTIVE and all(rows[-1]["date"] == "2026-11-17" for rows in market["quotes"].values())
assert all(not any(row["date"] >= "2026-11-18" for row in rows) for rows in market["quotes"].values())
for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path)
    assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in (
    "今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差",
    "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "宏观环境与A股情绪雷达",
    "RadarScore 12.7", "S7 退潮确认", "今日大盘情绪预警：红色", "约3947股下跌",
    "跌停74", "风险预算上限继续5%", "预计满足赎回条件", "11月19日公布",
):
    assert marker in page, marker
assert "2026-11-18" in page and LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
