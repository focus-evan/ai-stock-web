from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261118 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261119.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "公司正式公告称客户需求指引明确、在手订单充足，不存在需求预期下修或砍单；1.6T已进入大规模放量，NPO预计2027年批量出货、2028年大规模交付，成都和泰国产能继续扩张。",
        "bear": "11月18日仍跌1.12%至158.21，盘中低155.30；公告未披露新增订单金额或利润区间，五日累计-26.41%，隔夜NVDA再跌2.96%，公司利多尚未转成价格修复。",
        "message_level": "订单/1.6T正式确认 + 价格仍弱 + NVDA -2.96%",
        "judgement": "中性",
        "action": "红色高位踩踏风险；看155/150/145，失150继续减风险；收165/176只算价格修复，不因公告追高。",
        "risk_level": "红色",
        "risk_note": "经营证据改善但价格、CPO拥挤和外部AI风险未修复；基本面与交易层分开。",
    },
    "688008": {
        "bull": "11月18日涨5.51%至137.79、首日收回135；第二次回购已完成331.39万股、占总股本0.27%，耗资5亿元、均价150.88元。",
        "bear": "收盘仍略低于137.8且远低于回购均价；回购股份用于员工持股或股权激励、并非注销，减持窗口与S7系统风险仍在。",
        "message_level": "首日收135 + 5亿元回购完成 + 非注销",
        "judgement": "中性",
        "action": "红色修复观察；看135/130/128.5，失130恢复纯防守；至少等待下一交易日守135，收137.8/143才继续修复。",
        "risk_level": "红色",
        "risk_note": "回购完成提供公司层承接，但筹码与系统风险要求继续红色观察。",
    },
    "688017": {
        "bull": "Q3超预期的经营证据未变，11月18日低246.15后收252.27，首日收回251。",
        "bear": "仍低于255/263，经营现金流弱、高估值和机器人退潮风险未消；大盘上涨家数仅约1276。",
        "message_level": "首日收回251 + 仍失255/263 + 宽度弱",
        "judgement": "中性",
        "action": "红色修复观察；看251/245/238，失245恢复纯防守；至少等待下一交易日守251。",
        "risk_level": "红色",
        "risk_note": "只完成首日关键位修复，现金流和S7总阀门限制风险下降。",
    },
    "688012": {
        "bull": "11月18日再涨2.38%至244.17，连续第二日守238并首次收复242；提质增效方案的重复订单、薄膜设备超500反应台与回购逻辑继续支撑。",
        "bear": "盘中高248后回落、仍未收245/250；经营现金流与非经常收益质量风险未完全消除，外部NVDA跌2.96%。",
        "message_level": "二日守238 + 首收242 + 仍失245/250",
        "judgement": "中性",
        "action": "橙色修复确认；看242/238/230，失238转红；收245/250并守位后才进一步上调。",
        "risk_level": "橙色",
        "risk_note": "完成次日守位，可按规则降低个股风险；组合总阀门仍为红色S7。",
    },
    "002837": {
        "bull": "11月18日涨3.93%至35.43，首日收回33.5/34.6，液冷与算力板块局部活跃。",
        "bear": "高36.20后回落、仍未收36.2/37.3；前三季度利润下降、毛利率下滑和存货较年初+154.95%未改善。",
        "message_level": "首日收回34.6 + 高36.2回落 + 经营弱",
        "judgement": "中性",
        "action": "红色修复观察；看34.6/33.5/32，失33.5恢复纯防守；至少等待下一交易日守位。",
        "risk_level": "红色",
        "risk_note": "价格只完成首日修复，经营质量与S7风险未改善。",
    },
    "03750.HK": {
        "bull": "11月18日涨0.87%至370.00，连续第二日守361并首次收复367；A股回购注销与产业协同提供长期支撑。",
        "bear": "盘中高377.60后回落、仍未收374/377；Q3不及LSEG预期、现金流下降与恒生科技-0.58%未变。",
        "message_level": "二日守361 + 首收367 + 仍失374/377",
        "judgement": "中性",
        "action": "橙色修复确认；看367/361/350，失361转红；收374/377并守位才继续上调。",
        "risk_level": "橙色",
        "risk_note": "完成次日守位，可降低个股风险；业绩预期差与组合总阀门仍在。",
    },
    "09988.HK": {
        "bull": "9月季度业绩将于今日20:00公布，可正式验证云/AI与电商投入的利润转化。",
        "bear": "11月18日H股跌0.23%至85.25，隔夜BABA ADR再跌2.67%至84.37；业绩尚未发布且无可靠一致预期，不能提前判定超预期或不及预期。",
        "message_level": "H股85附近 + ADR -2.67% + 今晚业绩",
        "judgement": "利空",
        "action": "红色事件防守；看84.25/82/80，失82继续减风险；业绩发布前不摊低，发布后分开评估经营和交易层。",
        "risk_level": "红色",
        "risk_note": "业绩事件未落地、H股与ADR均弱，预期差无法可靠判断。",
    },
    "002409": {
        "bull": "半导体材料长期逻辑未变，11月18日低80.72后收82.68，仍守78.8。",
        "bear": "跌1.25%并略失82.7/83.7，前一日首修未获确认；Q3略低于申万宏源预期，大盘宽度仍弱。",
        "message_level": "首修失败 + 略失82.7/83.7",
        "judgement": "利空",
        "action": "红色防守；看80.7/78.8/76，失78.8继续减风险；收83.7/86只算止跌。",
        "risk_level": "红色",
        "risk_note": "首日修复未守住，业绩预期差和S7约束继续有效。",
    },
    "688300": {
        "bull": "11月18日涨3.96%至74.10，首日收回72.8；约10亿元项目仍是长期产能期权。",
        "bear": "盘中高76.28后回落、仍低于78.2/80；联瑞转债预计满足赎回条件，潜在转股供给与筹码扰动未解，赎回尚未实施。",
        "message_level": "首日收回72.8 + 转债赎回预期 + 仍失78.2",
        "judgement": "中性",
        "action": "红色修复观察；看72.8/70/68，失70恢复纯防守；关注转债后续董事会公告，不因反弹追高。",
        "risk_level": "红色",
        "risk_note": "只完成首日修复，项目融资和转债筹码风险仍在。",
    },
    "001270": {
        "bull": "商业航天与机器人长期映射未变，盘后未见重大新增公司层利空。",
        "bear": "11月18日再跌3.23%至71.35，盘中低70.37并失72；Q3归母同比-44.43%、减值和可交换债筹码压力未消。",
        "message_level": "再跌3.23% + 失72 + Q3利润下滑",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看70/66/63，失70继续减风险；收72/75.6只算止跌。",
        "risk_level": "红色",
        "risk_note": "经营弱项、筹码压力和机器人退潮继续满足高位踩踏条件。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌1.12%至158.21、守155", "红色不追和155承接观察有效。"),
    "688008": ("修复有效需上调观察", "涨5.51%至137.79、首日收135", "从纯防守上调为红色修复观察，等待次日守位。"),
    "688017": ("修复有效需上调观察", "收252.27、首日收251", "从纯防守上调为红色修复观察，等待次日守位。"),
    "688012": ("完全有效", "涨2.38%至244.17、二日守238", "修复观察获得次日确认，个股风险可降为橙色。"),
    "002837": ("修复有效需上调观察", "涨3.93%至35.43、首日收34.6", "从纯防守上调为红色修复观察。"),
    "03750.HK": ("完全有效", "涨0.87%至370、二日守361", "修复观察获得次日确认，个股风险可降为橙色。"),
    "09988.HK": ("完全有效", "跌0.23%至85.25、仍弱于88", "红色业绩前不摊低纪律有效。"),
    "002409": ("完全有效", "跌1.25%至82.68、略失82.7", "首日修复未确认，红色约束有效。"),
    "688300": ("修复有效需上调观察", "涨3.96%至74.1、首日收72.8", "从纯防守上调为红色修复观察，同时提高转债筹码权重。"),
    "001270": ("完全有效", "跌3.23%至71.35、失72", "红色踩踏和失位降风险条件有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-19", "window": "06:00盘前", "warning": "红色", "warning_points": 9,
    "triggers": [
        "11月18日指数小幅反弹：上证+0.09%、深证+0.20%、创业板+0.85%、科创综指+1.00%；但约1276股上涨、3991股下跌，属于明显指数-宽度背离。",
        "成交缩至约1.37万亿元，涨停41、跌停43；算力12只涨停、昨日涨停平均+1.78%，但2进3为0、广度未扩散，仍是窄幅抱团。",
        "隔夜QQQ +0.39%、SOXX +0.26%，但NVDA -2.96%、BABA ADR -2.67%、美元偏强；核心个股风险仍高于指数。",
    ],
    "opening_scenario": "算力/CPO可能延续局部反弹，但宽度和成交不支持总风险下降；若09:45上涨不足1800或科技核心高开低走，继续S7。",
    "state": "S7 退潮确认", "radar_score": 16.1, "MSS": 28, "MBS": 8, "FRS": 6, "TES": 18, "ET": 5,
    "position_ceiling": "S7标准总仓20%-40%；但指数假强、跌停仍43且同变量暴露过高，组合风险预算上限继续5%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险；中微和宁德完成次日守位可降为个股橙色，澜起/绿的/英维克/联瑞仅首日修复观察。",
    "blocked": "禁止追算力/CPO一致反弹，禁止阿里业绩前摊低，禁止把公司公告直接等同于趋势反转。",
    "focus": "09:45观察上涨家数、跌停数量及新易盛155、澜起135、中微238、联瑞72.8、阿里84.25。",
    "downgrade": "已处S7；若上涨不足1200、跌停重新超过60或科技核心高开低走，维持5%风险预算。解除S7仍需至少两个完整交易日宽度与跌停持续改善。",
    "v231_link": "新易盛经营证据和澜起回购完成提升公司层置信度；价格、相对强弱和组合暴露仍服从S7。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items(): market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-18"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-18": raise RuntimeError(f"bad quote cutoff for {item['code']}: {rows[-1]['date']}")
    closes = [x["close"] for x in rows]; last = rows[-1]
    item.update(last_trade_date=last["date"], last_close=last["close"], one_day_pct=base.pct(closes[-2], closes[-1]), three_day_pct=base.pct(closes[-4], closes[-1]), five_day_pct=base.pct(closes[-6], closes[-1]), turnover_volume=int(last["volume"]), day_high=last["high"], day_low=last["low"])
    if item["code"] == "688300": item.update(ex_rights_reference=104.623, ex_rights_date="2026-10-16")
    return item


def build_review(prior: dict, market: dict) -> dict:
    items = []
    for old in prior["holdings"]:
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-18")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({"name": old["name"], "code": old["code"], "morning_risk": old["risk_level"], "morning_judgement": old["judgement"], "morning_close": old["last_close"], "review_price_date": "2026-11-18", "review_close": row["close"], "review_move_pct": base.pct(old["last_close"], row["close"]), "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment})
    return {"generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(), "review_window": "使用2026-11-18完整A股与港股收盘验证上一版06:00判断；隔夜美股11月18日仅用于新预警。", "summary": {"reviewed_count": 10, "exact_effective": 6, "useful_but_conservative": 0, "repair_upgrade": 4, "underestimated_risk": 0, "effective_or_useful": 10, "needs_calibration": 4, "main_read": "S7总阀门继续有效。中微与宁德完成次日守位，个股风险可降为橙色；澜起、绿的、英维克和联瑞仅完成首日修复，仍需等待下一交易日确认。"}, "items": items, "logic_corrections": ["指数上涨但下跌近4000家，明确按指数假强处理，S7不降级。", "中微二日守238、宁德二日守361，可降低个股风险但不降低总阀门。", "澜起、绿的、英维克、联瑞仅首日收回关键位，继续红色修复观察。", "新易盛公告增强经营证据，但五日跌幅和外部NVDA走弱要求价格确认。", "阿里业绩尚未发布，继续使用无可靠预期分类。"]}


def render_macro() -> str:
    r = MACRO_RADAR; triggers = "".join(f"<li>{x}</li>" for x in r["triggers"])
    return f'''<section class="panel alert" id="macro-radar"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill red">今日大盘情绪预警：{r['warning']}</span> <b>{r['state']}</b> · RadarScore {r['radar_score']}</p><p><b>评分：</b>MSS {r['MSS']} / MBS {r['MBS']} / FRS {r['FRS']} / TES {r['TES']} / ET {r['ET']}</p><ul>{triggers}</ul><p><b>最可能开盘剧本：</b>{r['opening_scenario']}</p><p><b>仓位上限：</b>{r['position_ceiling']}</p><p><b>允许：</b>{r['allowed']}</p><p><b>禁止：</b>{r['blocked']}</p><p><b>重点观察：</b>{r['focus']}</p><p><b>降级条件：</b>{r['downgrade']}</p><p><b>与V2.3.1联动：</b>{r['v231_link']}</p></section>'''


def main() -> None:
    prior = json.loads(LATEST_JSON.read_text(encoding="utf-8-sig")); market = base.fetch_market(); trim_market(market)
    holdings = []
    for old in prior["holdings"]:
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note", "ex_dividend_reference", "ex_dividend_date"}}; item.update(UPDATES[item["code"]]); holdings.append(enrich(item, market))
    review = build_review(prior, market); now = datetime.now(TZ).replace(microsecond=0); stamp = now.strftime("%Y%m%d_%H%M%S")
    archive = ARCHIVE / f"automation_2_holdings_{stamp}.html"; review_archive = ARCHIVE / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-18完整A/H收盘，澜起使用未复权day序列。",
        "A股：上证+0.09%、深证+0.20%、创业板+0.85%、科创综指+1.00%；约1276股上涨、3991股下跌，成交约1.37万亿元；涨停41、跌停43，指数明显假强。",
        "短线：算力12只涨停、昨日涨停平均+1.78%，但2进3为0、宽度未扩散。",
        "港股：恒指-0.91%、恒生科技-0.58%；宁德-H +0.87%至370，阿里-W -0.23%至85.25。",
        "外围：SPY -0.28%、QQQ +0.39%、SOXX +0.26%、NVDA -2.96%、BABA ADR -2.67%；IEF +0.28%、UUP +0.27%。",
        "新易盛公告：在手订单充足、无需求下修或砍单；1.6T大规模放量，NPO预计2027批量/2028大规模交付，成都与泰国产能扩张。https://pdf.dfcfw.com/pdf/H2_AN202611181831832562_1.pdf",
        "澜起回购结果：累计331.39万股、0.27%，耗资5亿元、均价150.88元；用于员工持股或激励，非注销。https://pdf.dfcfw.com/pdf/H2_AN202611181831833886_1.pdf",
        "联瑞转债赎回仍处预计触发阶段，尚未实施；阿里业绩将于11月19日20:00公布，当前不提前判断预期差。",
        "财报预期差：绿的、联瑞超预期；雅克不及预期；新易盛、澜起、中微、英维克、铖昌无可靠预期；宁德Q3不及LSEG；阿里等待今晚业绩。",
        "持仓仅跟踪10只当前标的，清仓名单继续排除。主要链接：https://agu-app.com/daily/2026-11-18 ; https://www.dabanke.com/index-20261118.html ; https://www.alibabagroup.com/en-US/investor-relations/",
    ]
    report = {"generated_at": now.isoformat(), "window": "截至北京时间2026-11-19 06:00；使用11月18日A/H完整收盘、盘后公告与美东11月18日收盘；阿里业绩尚未发布。", "risk_level": "红色", "gate": "总阀门：红色组合约束、宏观S7退潮确认。指数小涨但约3991股下跌、成交仅1.37万亿元，算力抱团未扩散；隔夜NVDA跌2.96%、BABA ADR跌2.67%。组合风险预算上限维持5%，新增仓位、题材交易和摊低均为0。", "top_attention": [{"name": "阿里巴巴-W", "reason": "今晚公布业绩，H股85附近、ADR再跌2.67%，无可靠一致预期，事件前不摊低。"}, {"name": "新易盛", "reason": "正式确认订单充足、1.6T放量，但股价仍守155临界且五日-26.41%；经营利多需价格确认。"}, {"name": "联瑞新材", "reason": "首日收回72.8，但转债赎回预期增加潜在转股供给，赎回尚未实施。"}], "holdings": holdings, "sources_or_notes": sources, "memory_path": str(MEMORY_PATH), "accuracy_review": review, "macro_radar": MACRO_RADAR}
    text_json = json.dumps(report, ensure_ascii=False, indent=2); review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-19", 1)
    page = re.sub(r'<section class="panel alert">.*?</section>', '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色：指数小涨但近4000股下跌，算力抱团未形成宽度修复。</b>成交仅约1.37万亿元，跌停仍43；隔夜NVDA跌2.96%、BABA ADR跌2.67%。新易盛经营公告和澜起5亿元回购完成提升公司层置信度，但不等于趋势反转；阿里今晚业绩前不摊低。</p></section>', page, flags=re.S)
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(r'<section class="panel plan">.*?</section>', '<section class="panel plan"><h2>风险预案</h2><ul><li>风险预算上限5%，新增、题材与摊低均为0；算力/CPO反弹不追。</li><li>新易盛看155/150，澜起看135/130，绿的看251/245，英维克看34.6/33.5，联瑞看72.8/70。</li><li>中微看242/238，宁德看367/361；两者完成次日守位但组合总阀门不降。</li><li>阿里看84.25/82；今晚业绩发布后再分别评估经营与交易层。</li><li>解除S7仍需两个完整交易日宽度与跌停持续改善。</li></ul></section>', page, flags=re.S)
    for path, text in ((LATEST_JSON, text_json), (REVIEW_JSON, review_json), (review_archive, review_json), (LATEST_HTML, page), (archive, page)): base.atomic_write(path, text)
    print(json.dumps({"latest": str(LATEST_HTML), "archive": str(archive), "review_archive": str(review_archive), "generated_at": now.isoformat()}, ensure_ascii=False))


if __name__ == "__main__": main()
