from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261111 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261112.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月11日放量涨16.97%至215.00，连续第二日守180并收复190/200；CPO板块涨5.83%、通信设备资金大幅回流，约8亿元回购与在手订单继续提供公司层承接。",
        "bear": "3日累计+24.93%，距离红色硬阈值25%仅差0.07个百分点；单日急涨后拥挤与兑现风险显著抬升，且组合集中度、经营现金流与存货风险未消。",
        "message_level": "二日守180 + 单日+16.97% + 3日临界25%",
        "judgement": "利多",
        "action": "橙色高位观察；215附近不追，看210/205/200，失205降风险；若3日涨幅跨25%并叠加板块退潮，按红色预案处理。",
        "risk_level": "橙色",
        "risk_note": "修复方向获得第二日确认，但3日涨幅已逼近红色阈值，追高性价比显著下降。",
    },
    "688008": {
        "bull": "11月11日涨5.21%至162.86，连续第二日守150并收复155/159；Q3经营、Q4订单与回购逻辑继续提供公司层支撑。",
        "bear": "盘中高163.55后回落，股东减持窗口与估值约束仍在；外部科技反弹不等于公司预期差进一步上修。",
        "message_level": "二日守150 + 收复159",
        "judgement": "利多",
        "action": "橙色修复确认；看160/155/150，失155降风险；163.5附近不追，守位后再评估。",
        "risk_level": "橙色",
        "risk_note": "第二日守位完成修复确认，但减持窗口和估值仍限制加仓。",
    },
    "688017": {
        "bull": "11月11日收303.00、连续第三日守286并守住300；Q3超预期与机器人主线继续形成经营/行业共振。",
        "bear": "盘中高310后回落，5日累计+5.94%；经营现金流弱、高估值与机器人明牌后的兑现风险仍需约束。",
        "message_level": "三日守286 + 300附近震荡",
        "judgement": "利多",
        "action": "橙色偏强观察；看300/296/290.5，失296降风险；310/315附近不追。",
        "risk_level": "橙色",
        "risk_note": "业绩与价格修复延续，但高估值和现金流限制追高。",
    },
    "688012": {
        "bull": "11月11日涨1.77%至250.00，重新收回250；4亿至5亿元回购方案、Q3扣非增长与国产替代平台逻辑未变。",
        "bear": "盘中低240.41一度失242后回收，说明承接仍有反复；回购尚未见实际实施，高估值科技仍受利率和拥挤度约束。",
        "message_level": "收回250 + 盘中失242后回收",
        "judgement": "中性",
        "action": "橙色修复观察；看250/245/242，失242转红；收255只算继续修复，263附近不追。",
        "risk_level": "橙色",
        "risk_note": "收盘修复有效，但盘中波动和回购待实施要求保留仓位约束。",
    },
    "002837": {
        "bull": "11月11日放量涨停至43.32，连续第二日守37.8并收复40.6；算力基础设施和液冷方向强势，17亿元外汇套保额度降低部分汇率波动。",
        "bear": "单日涨停后短线波动显著放大；Q3增收不增利、前三季度归母下降、毛利率下滑与存货较年初+154.95%均未改善。",
        "message_level": "二日修复 + 放量涨停 + 经营质量弱",
        "judgement": "利多",
        "action": "橙色高波动；禁止追涨，看43.3/41.5/40.6，失40.6降风险；弱转强失败优先兑现。",
        "risk_level": "橙色",
        "risk_note": "价格修复确认但经营质量未同步改善，涨停后只能观察承接。",
    },
    "03750.HK": {
        "bull": "11月11日涨2.49%至387.40，连续第二日守377并收复382；公司当日回购121,400股A股、耗资约2997.55万元并拟注销，形成真实资本动作。",
        "bear": "盘中高391.40后回落，Q3不及LSEG预期和现金流下降未变；战略合作与回购不能提前计入经营利润。",
        "message_level": "二日守377 + 收复382 + A股回购注销",
        "judgement": "利多",
        "action": "橙色修复确认；看387/382/377，失377降风险；395附近不追。",
        "risk_level": "橙色",
        "risk_note": "价格修复和回购形成支撑，但业绩预期差仍限制加仓。",
    },
    "09988.HK": {
        "bull": "11月11日低100.10后收100.60，仍守100；Apple智能接入千问的产品催化继续存在。",
        "bear": "H股跌0.98%、隔夜BABA ADR再跌1.16%，跨市场均弱；仍未收回103.3，千问调用量、收费和利润贡献未披露。",
        "message_level": "守100但未复103.3 + ADR再跌1.16%",
        "judgement": "利空",
        "action": "红色防守；看100.6/100/98.9，失100减风险；收103.3/105只算止跌，109/112并守位才修复。",
        "risk_level": "红色",
        "risk_note": "守住100但跨市场持续偏弱，产品催化仍缺少利润验证。",
    },
    "002409": {
        "bull": "11月11日涨3.89%至89.31，首日有效收回86/88.6；半导体材料长期逻辑和华飞电子增资未变。",
        "bear": "只完成首日收回关键位，Q3略低于申万宏源预期与估值约束仍在；盘中高89.66尚未突破92压力区。",
        "message_level": "首日收回88.6 + 业绩预期差未消",
        "judgement": "中性",
        "action": "橙色修复观察；看88.6/86/83.7，失86转弱；至少等待下一交易日守位，92附近不追。",
        "risk_level": "橙色",
        "risk_note": "由红色纯防守上调为首日修复观察，尚未完成次日确认。",
    },
    "688300": {
        "bull": "11月11日放量涨8.01%至89.90，连续第三日守80并收复84.3/87；Q3超预期与高端粉体放量获得价格确认。",
        "bear": "盘中高90.25后回落，可转债筹码和10亿元扩产融资风险仍在；单日急涨后不适合追高。",
        "message_level": "三日守80 + 收复87 + 单日+8.01%",
        "judgement": "利多",
        "action": "橙色偏强观察；看89/87/84.3，失84.3降风险；90/93压力区不追。",
        "risk_level": "橙色",
        "risk_note": "经营与价格修复共振，但扩产融资和涨速要求控制追高。",
    },
    "001270": {
        "bull": "11月11日收90.73，连续第三日守86且继续站在90附近；商业航天与机器人题材仍有扩散。",
        "bear": "当日跌0.34%、高91.30后回落，Q3归母同比-44.43%、减值、可交换债筹码及持仓参数缺失均未消。",
        "message_level": "三日守86 + 90附近滞涨",
        "judgement": "中性",
        "action": "橙色高波动观察；看90/88.9/87.4，失87.4降风险；93.2附近不追。",
        "risk_level": "橙色",
        "risk_note": "题材修复仍在，但基本面、筹码和持仓参数缺失限制风险等级。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "涨16.97%至215、第二日守180", "修复方向获第二日确认，但因3日涨幅逼近25%转为高位橙色观察。"),
    "688008": ("完全有效", "涨5.21%至162.86、第二日守150", "第二日守位并收159，修复确认；减持约束保留。"),
    "688017": ("完全有效", "收303、继续守300/286", "业绩与价格修复方向延续，橙色不追仍有效。"),
    "688012": ("完全有效", "涨1.77%至250、盘中失242后回收", "公司层承接和橙色波动约束均有效。"),
    "002837": ("完全有效", "涨停43.32、第二日守37.8", "修复方向确认，但经营质量要求继续禁止追涨。"),
    "03750.HK": ("完全有效", "涨2.49%至387.4、第二日守377", "第二日守位且收382，修复确认；业绩约束保留。"),
    "09988.HK": ("完全有效", "跌0.98%至100.6、仍未复103.3", "红色跨市场弱势判断和100防线继续有效。"),
    "002409": ("修复有效需上调观察", "涨3.89%至89.31、首日收88.6", "首次收回关键位，从红色防守上调为橙色修复观察。"),
    "688300": ("完全有效", "涨8.01%至89.9、第三日守80", "Q3超预期修复延续，橙色不追约束有效。"),
    "001270": ("完全有效", "跌0.34%至90.73、继续守90/86", "题材修复与高波动约束同时有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-12",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 4,
    "triggers": [
        "11月11日A股第二日转强：沪指+0.46%、深成指+1.32%、创业板+3.11%、科创50+2.80%，约3456股上涨、1734股下跌，成交约1.68万亿元。",
        "涨停约85、炸板19、跌停1、封板率约78%；晋级率约20.4%、最高板由7板降至4板，指数与科技强、短线接力质量边际回落。",
        "CPO涨5.83%、资金净流入约205.54亿元；隔夜QQQ +2.28%、SOXX +6.02%、NVDA +2.94%，但恒生科技-1.41%、UUP +0.69%，内外市场并非全面共振。",
    ],
    "opening_scenario": "A股和隔夜美股AI共振偏强，但CPO、液冷与半导体已进入高拥挤区；若09:45上涨家数仍高于3000且CPO不冲高回落，可维持修复观察，否则优先兑现高位急涨。",
    "state": "S3 震荡精选",
    "radar_score": 59.6,
    "MSS": 42,
    "MBS": 72,
    "FRS": 60,
    "TES": 68,
    "ET": 45,
    "position_ceiling": "S3标准总仓45%-65%；但组合科技同变量集中，新易盛3日涨幅逼近25%、英维克涨停且阿里仍红色，组合覆盖上限仅从10%升至15%，新增仓位、题材交易和摊低仍为0。",
    "allowed": "只持有并验证新易盛205、英维克40.6、澜起155、宁德382等关键位；雅克仅作首日修复观察。",
    "blocked": "禁止追CPO、液冷、机器人与半导体急涨，禁止因单日大涨提高经营评分，禁止对阿里或弱转强失败品种摊低。",
    "focus": "09:45观察上涨家数、CPO冲高回落、涨停溢价及新易盛205、英维克40.6、阿里100。",
    "downgrade": "若上涨家数低于1800、CPO/半导体高开低走，或新易盛失205/英维克失40.6/阿里失100，则退回S2/S1并降低组合上限。",
    "v231_link": "经营分不随主题涨停上调；宁德实际回购可计入资本动作，绿的/联瑞超预期保留公司层信心，交易层继续服从关键位。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-11"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-11":
        raise RuntimeError(f"bad quote cutoff for {item['code']}: {rows[-1]['date']}")
    closes = [x["close"] for x in rows]
    last = rows[-1]
    item.update(
        last_trade_date=last["date"], last_close=last["close"],
        one_day_pct=base.pct(closes[-2], closes[-1]),
        three_day_pct=base.pct(closes[-4], closes[-1]),
        five_day_pct=base.pct(closes[-6], closes[-1]),
        turnover_volume=int(last["volume"]), day_high=last["high"], day_low=last["low"],
    )
    if item["code"] == "688300":
        item["ex_rights_reference"] = 104.623
        item["ex_rights_date"] = "2026-10-16"
    return item


def build_review(prior: dict, market: dict) -> dict:
    items = []
    for old in prior["holdings"]:
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-11")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-11", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-11完整A股与港股收盘验证上一版06:00判断；隔夜美股11月11日表现仅用于新一版预警。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 9, "useful_but_conservative": 0,
            "repair_upgrade": 1, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 1,
            "main_read": "A股广度和成长风格连续第二日转强，新易盛、澜起、英维克、宁德完成第二日守位，分类为完全有效；雅克首日收回88.6，分类为修复有效需上调观察。红色总阀门作为不追涨/不加仓纪律有效，组合风险按规则仅降为橙色。",
        },
        "items": items,
        "logic_corrections": [
            "约3456股上涨、成交约1.68万亿元，指数与成长风格获得第二日确认，宏观由S2上调至S3。",
            "新易盛、澜起、英维克、宁德第二日守位，允许从纯修复观察升级为确认，但不等于允许追高。",
            "雅克只完成首日收回86/88.6，至少再等一日守位后才能降低个股风险。",
            "新易盛3日+24.93%已逼近25%硬阈值，英维克涨停，风险权重从破位转为高位拥挤。",
            "阿里H股和ADR继续偏弱，产品催化仍不能替代盈利与价格确认。",
        ],
    }


def render_macro() -> str:
    r = MACRO_RADAR
    triggers = "".join(f"<li>{x}</li>" for x in r["triggers"])
    return f'''<section class="panel alert" id="macro-radar"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill orange">今日大盘情绪预警：{r['warning']}</span> <b>{r['state']}</b> · RadarScore {r['radar_score']}</p><p><b>评分：</b>MSS {r['MSS']} / MBS {r['MBS']} / FRS {r['FRS']} / TES {r['TES']} / ET {r['ET']}</p><ul>{triggers}</ul><p><b>最可能开盘剧本：</b>{r['opening_scenario']}</p><p><b>仓位上限：</b>{r['position_ceiling']}</p><p><b>允许：</b>{r['allowed']}</p><p><b>禁止：</b>{r['blocked']}</p><p><b>重点观察：</b>{r['focus']}</p><p><b>降级条件：</b>{r['downgrade']}</p><p><b>与V2.3.1联动：</b>{r['v231_link']}</p></section>'''


def main() -> None:
    prior = json.loads(LATEST_JSON.read_text(encoding="utf-8-sig"))
    market = base.fetch_market()
    trim_market(market)
    holdings = []
    for old in prior["holdings"]:
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note", "ex_dividend_reference", "ex_dividend_date"}}
        item.update(UPDATES[item["code"]])
        holdings.append(enrich(item, market))
    review = build_review(prior, market)
    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive = ARCHIVE / f"automation_2_holdings_{stamp}.html"
    review_archive = ARCHIVE / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-11完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指+0.46%、深成指+1.32%、创业板+3.11%、科创50+2.80%；约3456股上涨、1734股下跌，沪深北成交约1.68万亿元；涨停约85、炸板19、跌停1、封板率约78%。",
        "短线生态：晋级率约20.4%、1进2约16.4%、2板及以上晋级约35%，最高板由7板降至4板；指数和科技强，但接力质量边际回落。",
        "题材与资金：CPO指数涨5.83%，板块资金净流入约205.54亿元；机器人约16只涨停、通信约11只、AI应用约5只。",
        "港股：恒指-0.98%至24315.92、恒生科技-1.41%至4027.06；宁德-H +2.49%至387.40，阿里-W -0.98%至100.60；南向净买入约45.72亿港元。",
        "外围：美东11月11日SPY +1.32%、QQQ +2.28%、SOXX +6.02%、NVDA +2.94%、BABA ADR -1.16%；DIA +0.51%、IEF -0.09%、UUP +0.69%。",
        "宁德时代港交所日表：2026-11-11回购121,400股A股，价格246.81至247.15元，耗资29,975,524元，全部拟注销；https://cfi.net.cn/p20261111001920.html",
        "公司公告复核：澜起仅新增2026年三季度业绩说明会通知，不改变经营事实；其余持仓截至06:00未见改变经营事实的重大新增公告。",
        "高位筛查：新易盛3日+24.93%、仅低于红色硬阈值25%约0.07个百分点，列橙色高位观察；英维克涨停且经营质量偏弱，列橙色高波动；全部持仓5日涨幅均未超过35%。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://agu-app.com/daily/2026-11-11 ; https://www.dabanke.com/ ; https://www.tansuoguangnian.com/markets/hsi ; https://apnews.com/article/ffe205fbc4fddf65c3e8e64e740355b7 ; https://cfi.net.cn/p20261111001920.html",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-12 06:00；使用11月11日A股/港股完整收盘、收盘后公告与美东11月11日收盘。",
        "risk_level": "橙色",
        "gate": "总阀门：橙色组合约束、宏观S3震荡精选。11月11日约3456股上涨、成交约1.68万亿元，A股成长风格获得第二日确认，隔夜美股AI链反弹；但CPO/液冷高位拥挤、短线晋级率回落、恒生科技偏弱。组合覆盖上限从10%升至15%，新增仓位、题材交易和摊低仍为0；只持有验证，不追高。",
        "top_attention": [
            {"name": "新易盛", "reason": "单日+16.97%、3日+24.93%，距离红色硬阈值25%仅约0.07个百分点；215附近不追，205/200守位决定是否降级。"},
            {"name": "英维克", "reason": "放量涨停并收复40.6，但前三季度利润下降、毛利率和库存风险未改善；价格与经营背离，只能观察承接。"},
            {"name": "阿里巴巴-W", "reason": "H股-0.98%、ADR-1.16%，仍未收回103.3；Apple千问催化缺少可量化利润确认，100防线最关键。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-12", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>组合风险降至橙色，但高位拥挤取代破位成为首要风险。</b>新易盛单日+16.97%、3日+24.93%，距离红色25%阈值仅约0.07个百分点；英维克放量涨停但经营质量未同步改善。CPO资金高度集中、短线晋级率回落，阿里H股与ADR继续偏弱。今日组合上限15%，禁止新增仓位、摊低与追高。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限15%，新增仓位、题材交易和摊低仍为0；CPO、液冷、机器人和半导体高开不追。</li><li>新易盛看210/205/200；若3日涨幅跨25%并叠加板块退潮，按红色高位预案处理。英维克看41.5/40.6，弱转强失败优先兑现。</li><li>澜起看160/155，中微看250/245/242，绿的看300/296，雅克看88.6/86，联瑞看89/87/84.3，铖昌看90/87.4。</li><li>宁德看387/382/377，阿里看100.6/100；失位按红色处理，回购与产品催化不提前计入经营利润。</li><li>09:45若上涨家数低于1800或CPO/半导体高开低走，退回S2/S1并降低组合上限。</li></ul></section>',
        page, flags=re.S,
    )
    base.atomic_write(LATEST_JSON, text_json)
    base.atomic_write(REVIEW_JSON, review_json)
    base.atomic_write(review_archive, review_json)
    base.atomic_write(LATEST_HTML, page)
    base.atomic_write(archive, page)
    print(json.dumps({"latest": str(LATEST_HTML), "archive": str(archive), "review_archive": str(review_archive), "generated_at": now.isoformat()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
