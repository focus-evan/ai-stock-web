from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261109.json"
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
assert [x["name"] for x in data["top_attention"]] == ["新易盛", "澜起科技", "中微公司"]
for item in data["holdings"]:
    assert item["last_trade_date"] == "2026-11-06"
    assert item["earnings_expectation_result"] in ALLOWED
expected = {
    "300502": 172.1, "688008": 150.1, "688017": 285.05, "688012": 254.0,
    "002837": 37.33, "002409": 85.67, "688300": 79.9, "001270": 84.75,
    "03750.HK": 380.0, "09988.HK": 104.9,
}
assert {x["code"]: x["last_close"] for x in data["holdings"]} == expected
risk = {x["code"]: x["risk_level"] for x in data["holdings"]}
assert risk["688012"] == risk["03750.HK"] == risk["09988.HK"] == "橙色"
assert all(risk[code] == "红色" for code in ACTIVE - {"688012", "03750.HK", "09988.HK"})
newyi = next(x for x in data["holdings"] if x["code"] == "300502")
assert newyi["earnings_expectation_result"] == "无可靠预期" and "7.999亿元" in newyi["bull"] and "161.16" in newyi["bear"]
montage = next(x for x in data["holdings"] if x["code"] == "688008")
assert montage["last_close"] == 150.1 and montage["earnings_expectation_result"] == "无可靠预期"
green = next(x for x in data["holdings"] if x["code"] == "688017")
assert green["earnings_expectation_result"] == "超预期" and "164.68%" in green["earnings_note"]
amec = next(x for x in data["holdings"] if x["code"] == "688012")
assert amec["earnings_expectation_result"] == "无可靠预期" and "23.42%" in amec["bear"] and "4亿至5亿元" in amec["bull"]
envicool = next(x for x in data["holdings"] if x["code"] == "002837")
assert envicool["earnings_expectation_result"] == "无可靠预期" and "17亿元" in envicool["bull"]
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert linked["earnings_expectation_result"] == "超预期" and "1.11亿元" in linked["earnings_note"]
yake = next(x for x in data["holdings"] if x["code"] == "002409")
assert yake["earnings_expectation_result"] == "不及预期" and "2.88亿元" in yake["earnings_note"]
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["exact_effective"] == 10 and review["summary"]["useful_but_conservative"] == 0
assert review["summary"]["repair_upgrade"] == 0 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-11-06" and x["verification"] in VERDICTS for x in review["items"])
radar = data["macro_radar"]
assert radar["warning"] == "红色" and radar["state"] == "S0 绝对防守" and radar["radar_score"] == 18.8
assert (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (38, 8, 12, 12, 4)
assert set(market["quotes"]) == ACTIVE and all(rows[-1]["date"] == "2026-11-06" for rows in market["quotes"].values())
assert all(not any(row["date"] >= "2026-11-07" for row in rows) for rows in market["quotes"].values())
for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path)
    assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in (
    "今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差",
    "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "宏观环境与A股情绪雷达",
    "RadarScore 18.8", "S0 绝对防守", "今日大盘情绪预警：红色", "约4741股下跌",
    "CPO-5.26%", "累计回购约8亿元", "盘中低161.16", "橙色相对强观察",
):
    assert marker in page, marker
assert "2026-11-09" in page and LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
