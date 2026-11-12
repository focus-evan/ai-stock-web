from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261113.json"
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
    assert item["last_trade_date"] == "2026-11-12"
    assert item["risk_level"] == "红色"
    assert item["earnings_expectation_result"] in ALLOWED
expected = {
    "300502": 205.58, "688008": 162.89, "688017": 283.93, "688012": 252.55,
    "002837": 40.98, "002409": 90.37, "688300": 89.31, "001270": 87.27,
    "03750.HK": 374.2, "09988.HK": 93.8,
}
assert {x["code"]: x["last_close"] for x in data["holdings"]} == expected
newyi = next(x for x in data["holdings"] if x["code"] == "300502")
assert newyi["three_day_pct"] == 16.81 and newyi["five_day_pct"] == 10.76 and "225" in newyi["bear"]
green = next(x for x in data["holdings"] if x["code"] == "688017")
assert green["earnings_expectation_result"] == "超预期" and "高位踩踏风险" in green["action"]
amec = next(x for x in data["holdings"] if x["code"] == "688012")
assert amec["earnings_expectation_result"] == "无可靠预期" and "266.33" in amec["bear"]
envicool = next(x for x in data["holdings"] if x["code"] == "002837")
assert envicool["one_day_pct"] == -5.4 and "高位踩踏风险" in envicool["action"]
catl = next(x for x in data["holdings"] if x["code"] == "03750.HK")
assert "290,900股" in catl["bull"] and "69,964,683元" in catl["bull"]
ali = next(x for x in data["holdings"] if x["code"] == "09988.HK")
assert ali["three_day_pct"] == -10.33 and "ADR再跌7.06%" in ali["bear"]
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert linked["position"].startswith("260股") and linked["earnings_expectation_result"] == "超预期"
assert "总投资约10亿元" in linked["bull"] and "用地尚未取得" in linked["bear"]
cheng = next(x for x in data["holdings"] if x["code"] == "001270")
assert "高位踩踏风险" in cheng["action"] and cheng["last_close"] == 87.27
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["exact_effective"] == 10 and review["summary"]["useful_but_conservative"] == 0
assert review["summary"]["repair_upgrade"] == 0 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-11-12" and x["verification"] in VERDICTS for x in review["items"])
radar = data["macro_radar"]
assert radar["warning"] == "红色" and radar["state"] == "S0 绝对防守" and radar["radar_score"] == 15.3
assert (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (30, 8, 15, 5, 5)
assert set(market["quotes"]) == ACTIVE and all(rows[-1]["date"] == "2026-11-12" for rows in market["quotes"].values())
assert all(not any(row["date"] >= "2026-11-13" for row in rows) for rows in market["quotes"].values())
for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path)
    assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in (
    "今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差",
    "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "宏观环境与A股情绪雷达",
    "RadarScore 15.3", "S0 绝对防守", "今日大盘情绪预警：红色", "约4635股下跌",
    "封板率降至48.1%", "组合覆盖上限由15%降至10%", "总投资约10亿元", "290,900股A股",
):
    assert marker in page, marker
assert "2026-11-13" in page and LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
