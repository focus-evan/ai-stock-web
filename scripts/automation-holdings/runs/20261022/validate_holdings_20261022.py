from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path


BASE = Path(r"D:\Evan\html\automation-2-holdings")
LATEST_HTML = BASE / "latest.html"
LATEST_JSON = BASE / "latest.json"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261022.json"
ACTIVE = {"300502", "688008", "688017", "688012", "002837", "002409", "688300", "001270", "03750.HK", "09988.HK"}
ALLOWED = {"超预期", "符合预期", "不及预期", "无可靠预期", "暂未披露"}
VERDICTS = {"完全有效", "方向偏保守但操作有效", "修复有效需上调观察", "低估风险需上调"}
BAD = ["????", "???", "\ufffd", "\u00c3", "\u00c2", "\u9400", "\u9365"]
MEMORY = r"C:\Users\Evan\.codex\automations\automation-6\memory.md"


def strict(path: Path) -> str:
    return path.read_bytes().decode("utf-8", errors="strict")


data = json.loads(strict(LATEST_JSON))
review = json.loads(strict(REVIEW_JSON))
stamp = datetime.fromisoformat(data["generated_at"]).strftime("%Y%m%d_%H%M%S")
archive = BASE / "archive" / f"automation_2_holdings_{stamp}.html"
review_archive = BASE / "archive" / f"automation_2_holdings_review_{stamp}.json"
review_copy = json.loads(strict(review_archive))
market = json.loads(strict(MARKET_JSON))

assert {"generated_at", "window", "risk_level", "gate", "top_attention", "holdings", "sources_or_notes", "memory_path", "accuracy_review", "macro_radar"} <= set(data)
assert data["risk_level"] == "红色" and data["memory_path"] == MEMORY
assert [x["name"] for x in data["top_attention"]] == ["宁德时代-H", "新易盛", "澜起科技"]
assert len(data["holdings"]) == 10 and {x["code"] for x in data["holdings"]} == ACTIVE
for item in data["holdings"]:
    assert item["last_trade_date"] == "2026-10-21"
    assert item["earnings_expectation_result"] in ALLOWED
    assert all(k in item for k in ("earnings_status", "earnings_expectation_result", "earnings_note"))
risks = {x["code"]: x["risk_level"] for x in data["holdings"]}
assert risks["688008"] == "橙色" and risks["688017"] == "橙色" and risks["001270"] == "橙色"
assert all(risks[c] == "红色" for c in ACTIVE - {"688008", "688017", "001270"})
catl = next(x for x in data["holdings"] if x["code"] == "03750.HK")
linked = next(x for x in data["holdings"] if x["code"] == "688300")
assert catl["last_close"] == 364.8 and catl["earnings_expectation_result"] == "不及预期"
assert "LSEG" in catl["earnings_note"] and "212.46" in catl["earnings_note"]
assert linked["last_close"] == 102.2 and linked["ex_rights_reference"] == 104.623
assert "260股" in linked["position"] and "190.00" in linked["cost"]
assert data["accuracy_review"] == review == review_copy
assert review["summary"]["reviewed_count"] == 10
assert review["summary"]["exact_effective"] == 7
assert review["summary"]["useful_but_conservative"] == 1
assert review["summary"]["repair_upgrade"] == 2 and review["summary"]["underestimated_risk"] == 0
assert all(x["review_price_date"] == "2026-10-21" for x in review["items"])
assert {x["verification"] for x in review["items"]} <= VERDICTS
radar = data["macro_radar"]
assert radar["warning"] == "橙色" and radar["state"] == "S3 震荡精选"
assert radar["radar_score"] == 51.4 and (radar["MSS"], radar["MBS"], radar["FRS"], radar["TES"], radar["ET"]) == (55, 49, 43, 56, 57)
assert set(market["quotes"]) == ACTIVE
for rows in market["quotes"].values():
    assert rows[-1]["date"] == "2026-10-21"
    assert not any(row["date"] == "2026-10-22" for row in rows)

for path in (LATEST_HTML, LATEST_JSON, REVIEW_JSON, archive, review_archive, MARKET_JSON):
    text = strict(path)
    assert not any(token in text for token in BAD), (path, "mojibake")
    print(path.name, len(text), hashlib.sha256(path.read_bytes()).hexdigest()[:16])

page = strict(LATEST_HTML)
assert '<meta charset="utf-8">' in page and page.rstrip().endswith("</html>")
for marker in (
    "今日高危预警", "总阀门", "需要重点注意的3只股票", "二季度/半年报预期差",
    "判断正确性验证 / 逻辑校准", "来源 / 数据缺口说明", "高位踩踏风险",
    "宏观环境与A股情绪雷达", "RadarScore 51.4", "S3 震荡精选", "今日大盘情绪预警：橙色",
    "财报后再跌11.41%", "守83并收85", "程序性收尾",
):
    assert marker in page, marker
assert "2026-10-22" in page
assert LATEST_HTML.read_bytes() == archive.read_bytes()
print("PASS", data["risk_level"], data["gate"][:60], stamp)
