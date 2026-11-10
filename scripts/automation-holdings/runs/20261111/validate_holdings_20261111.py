from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261111.json"
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
assert [x["name"] for x in data["top_attention"]] == ["新易盛", "绿的谐波", "阿里巴巴-W"]
for item in data["holdings"]:
    assert item["last_trade_date"] == "2026-11-10"
    assert item["earnings_expectation_result"] in ALLOWED
expected = {
    "300502": 183.8, "688008": 154.8, "688017": 302.76, "688012": 245.66,
    "002837": 39.38, "002409": 85.97, "688300": 83.23, "001270": 91.04,
    "03750.HK": 378.0, "09988.HK": 101.6,
}
assert {x["code"]: x["last_close"] for x in data["holdings"]} == expected
risk = {x["code"]: x["risk_level"] for x in data["holdings"]}
orange = {"300502", "688008", "688017", "688012", "002837", "688300", "001270", "03750.HK"}
assert all(risk[code] == "橙色" for code in orange)
assert risk["002409"] == risk["09988.HK"] == "红色"
newyi = next(x for x in data["holdings"] if x["code"] == "300502")
assert newyi["earnings_expectation_result"] == "无可靠预期" and "191.51" in newyi["bear"] and newyi["risk_level"] == "橙色"
montage = next(x for x in data["holdings"] if x["code"] == "688008")
assert montage["last_close"] == 154.8 and montage["risk_level"] == "橙色"
green = next(x for x in data["holdings"] if x["code"] == "688017")
assert green["earnings_expectation_result"] == "超预期" and "315.95" in green["bear"]
amec = next(x for x in data["holdings"] if x["code"] == "688012")
assert amec["earnings_expectation_result"] == "无可靠预期" and "4亿至5亿元" in amec["bull"]
envicool = next(x for x in data["holdings"] if x["code"] == "002837")
assert envicool["earnings_expectation_result"] == "无可靠预期" and envicool["risk_level"] == "橙色"
ali = next(x for x in data["holdings"] if x["code"] == "09988.HK")
assert "ADR再跌2.56%" in ali["bear"] and ali["risk_level"] == "红色"
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert linked["earnings_expectation_result"] == "超预期" and linked["risk_level"] == "橙色"
yake = next(x for x in data["holdings"] if x["code"] == "002409")
assert yake["earnings_expectation_result"] == "不及预期" and yake["risk_level"] == "红色"
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["exact_effective"] == 6 and review["summary"]["useful_but_conservative"] == 0
assert review["summary"]["repair_upgrade"] == 4 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-11-10" and x["verification"] in VERDICTS for x in review["items"])
radar = data["macro_radar"]
assert radar["warning"] == "橙色" and radar["state"] == "S2 冰点转折" and radar["radar_score"] == 54.0
assert (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (32, 68, 52, 68, 28)
assert set(market["quotes"]) == ACTIVE and all(rows[-1]["date"] == "2026-11-10" for rows in market["quotes"].values())
assert all(not any(row["date"] >= "2026-11-11" for row in rows) for rows in market["quotes"].values())
for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path)
    assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in (
    "今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差",
    "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "宏观环境与A股情绪雷达",
    "RadarScore 54.0", "S2 冰点转折", "今日大盘情绪预警：橙色", "约4273股上涨",
    "NVDA -5.53%", "通胀高于预期", "首日收回180", "橙色修复观察",
):
    assert marker in page, marker
assert "2026-11-11" in page and LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
