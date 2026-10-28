from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261028.json"
ACTIVE = {"300502", "688008", "688017", "688012", "002837", "002409", "688300", "001270", "03750.HK", "09988.HK"}
ALLOWED = {"超预期", "符合预期", "不及预期", "无可靠预期", "暂未披露"}
VERDICTS = {"完全有效", "方向偏保守但操作有效", "修复有效需上调观察", "低估风险需上调"}
BAD = ["????", "???", "\ufffd", "\u00c3", "\u00c2", "\u9400", "\u9365"]


def strict(path: Path) -> str:
    return path.read_bytes().decode("utf-8", errors="strict")


data = json.loads(strict(LATEST_JSON)); review = json.loads(strict(REVIEW_JSON))
stamp = datetime.fromisoformat(data["generated_at"]).strftime("%Y%m%d_%H%M%S")
archive = BASE / "archive" / f"automation_2_holdings_{stamp}.html"
review_archive = BASE / "archive" / f"automation_2_holdings_review_{stamp}.json"
review_copy = json.loads(strict(review_archive)); market = json.loads(strict(MARKET_JSON))
assert data["risk_level"] == "红色" and len(data["holdings"]) == 10
assert {x["code"] for x in data["holdings"]} == ACTIVE
assert [x["name"] for x in data["top_attention"]] == ["新易盛", "联瑞新材", "铖昌科技"]
for item in data["holdings"]:
    assert item["last_trade_date"] == "2026-10-27"
    assert item["earnings_expectation_result"] in ALLOWED
envicool = next(x for x in data["holdings"] if x["code"] == "002837")
assert envicool["earnings_expectation_result"] == "无可靠预期" and "19.33亿元" in envicool["earnings_note"] and "154.95%" in envicool["earnings_note"]
assert next(x for x in data["holdings"] if x["code"] == "001270")["last_close"] == 72.73
assert next(x for x in data["holdings"] if x["code"] == "688008")["last_close"] == 164.5
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert linked["last_close"] == 83.67 and "10亿元" in linked["bull"] and "3万吨" in linked["bull"]
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["exact_effective"] == 10 and review["summary"]["useful_but_conservative"] == 0
assert review["summary"]["repair_upgrade"] == 0 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-10-27" and x["verification"] in VERDICTS for x in review["items"])
radar = data["macro_radar"]
assert radar["warning"] == "红色" and radar["state"] == "S0 绝对防守" and radar["radar_score"] == 24.6
assert (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (52, 6, 10, 18, 7)
assert set(market["quotes"]) == ACTIVE and all(rows[-1]["date"] == "2026-10-27" for rows in market["quotes"].values())
assert all(not any(row["date"] >= "2026-10-28" for row in rows) for rows in market["quotes"].values())
for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path); assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])
page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in ("今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差", "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "高位踩踏风险", "宏观环境与A股情绪雷达", "RadarScore 24.6", "S0 绝对防守", "今日大盘情绪预警：红色", "增收不增利", "154.95%", "10亿元扩产", "严格排除10月28日盘中行情"):
    assert marker in page, marker
assert "2026-10-28" in page and LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
