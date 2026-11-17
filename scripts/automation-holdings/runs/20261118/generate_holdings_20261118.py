from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261117 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261118.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "累计约8亿元回购、在手订单与CPO长期需求逻辑未变，盘后未见重大新增公司层利空。",
        "bear": "11月17日再跌4.08%至160.00，盘中低155.24并失161；三日累计-22.17%，科创综指继续下跌、跌停扩大至74，隔夜全球风险资产仍弱。",
        "message_level": "再跌4.08% + 盘中失155.3 + 三日-22.17%",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看155/150/145，失150继续减风险；收165/176只算止跌。",
        "risk_level": "红色",
        "risk_note": "经营质量弱项、CPO退潮和全球科技风险继续满足红色踩踏条件。",
    },
    "688008": {
        "bull": "Q3经营、Q4订单、回购与DDR5/RDIMM长期逻辑未变；盘后仅有H股翌日披露报表。",
        "bear": "11月17日再跌6.57%至130.60，失137.8/135/130盘中防线并低见128.46；减持窗口、板块退潮和外部风险未解。",
        "message_level": "再跌6.57% + 失130盘中防线 + 减持窗口",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看128.5/125/120，失125继续减风险；收135/137.8只算止跌。",
        "risk_level": "红色",
        "risk_note": "筹码压力、半导体退潮和外部科技风险继续满足三项红色条件。",
    },
    "688017": {
        "bull": "Q3超预期的经营证据未变，盘后未见重大新增公司层利空。",
        "bear": "11月17日跌4.24%至254.00，失263/255并低见251；机器人前排继续分化，经营现金流弱、高估值和外部风险未消。",
        "message_level": "失263/255 + 机器人分化 + 现金流弱",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看251/245/238，失245继续减风险；收255/263只算止跌。",
        "risk_level": "红色",
        "risk_note": "基本面弱项、机器人退潮和全球高估值科技承压继续满足三项红色条件。",
    },
    "688012": {
        "bull": "11月17日涨2.27%至238.50，首日收回238；提质增效方案披露的营收+28.08%、LPCVD/ALD重复订单和薄膜设备超500反应台仍是经营证据。",
        "bear": "盘中高246后回落，收盘仍低于242/245；行动方案不构成承诺，研发强度、现金流/非经常收益与S7系统风险未消。",
        "message_level": "首日收回238 + 仍失242/245 + S7",
        "judgement": "中性",
        "action": "红色修复观察；看238/230/222，失230恢复纯防守；至少等待下一交易日守238，收242/245才继续修复。",
        "risk_level": "红色",
        "risk_note": "只完成首日收回238，按规则不得降低风险；经营分与交易时机继续分开。",
    },
    "002837": {
        "bull": "算力基础设施与液冷长期需求未变，11月17日低33.49后收34.09，尚守33.5收盘防线。",
        "bear": "继续跌2.15%并失34.6；前三季度利润下降、毛利率下滑和存货较年初+154.95%未改善，液冷/CPO退潮未结束。",
        "message_level": "守33.5但失34.6 + 经营弱",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看33.5/32/30，失32继续减风险；反抽34.6/36.2不追。",
        "risk_level": "红色",
        "risk_note": "经营质量、板块退潮和全球科技风险继续满足三项红色条件。",
    },
    "03750.HK": {
        "bull": "11月17日微涨0.11%至366.80，低359.40后收回361；A股回购注销与产业协同提供长期支撑。",
        "bear": "收盘仍低于367/374，恒生科技跌1.14%；Q3不及LSEG预期、现金流下降和全球风险偏好弱未变。",
        "message_level": "首日收回361但未复367 + 港科指-1.14%",
        "judgement": "中性",
        "action": "红色修复观察；看361/350/340，失361恢复纯防守；收367/374并守位才上调。",
        "risk_level": "红色",
        "risk_note": "仅首日收回361，价格修复不足以覆盖业绩预期差和全局退潮。",
    },
    "09988.HK": {
        "bull": "9月季度业绩将于11月19日公布，可验证云/AI与电商投入的利润转化；未见重大新增公司层利空公告。",
        "bear": "11月17日H股放量跌5.21%至85.45并失88/85盘中防线，隔夜BABA ADR再跌4.40%至86.65；业绩前无可靠一致预期，事件波动风险进一步放大。",
        "message_level": "H股-5.21% + ADR -4.40% + 明日业绩",
        "judgement": "利空",
        "action": "红色防守；看85.1/82/80，失82继续减风险；收88/89.8只算止跌，业绩前不摊低。",
        "risk_level": "红色",
        "risk_note": "H股与ADR同步走弱，业绩事件临近且预期差无法可靠判断。",
    },
    "002409": {
        "bull": "11月17日涨5.59%至83.73，首日收回82.7/83.7；半导体材料长期逻辑未变。",
        "bear": "盘中高86.50后回落，收盘仍低于86；Q3略低于申万宏源预期，市场跌停升至74、半导体仅局部反弹。",
        "message_level": "首日收回83.7 + 高86.5回落 + 宽度弱",
        "judgement": "中性",
        "action": "红色修复观察；看83.7/82.7/78.8，失82.7恢复纯防守；至少等待下一交易日守位。",
        "risk_level": "红色",
        "risk_note": "只完成首日修复，业绩预期差和S7总阀门要求继续等待。",
    },
    "688300": {
        "bull": "约10亿元半导体粉体项目仍是长期产能期权；股价71.28仍高于转债赎回观察阈值63.05元。",
        "bear": "11月17日再跌2.77%、盘中低70.31；联瑞转债已有10个交易日收盘不低于63.05元，未来20日若再有5日满足将触发董事会决定是否赎回，潜在转股供给与筹码扰动上升，赎回尚未实施。",
        "message_level": "继续失72.8 + 转债预计满足赎回条件",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看70/68/65，失68继续减风险；收72.8/78.2只算止跌，关注转债后续董事会公告。",
        "risk_level": "红色",
        "risk_note": "项目融资、转债潜在转股供给、板块退潮和外部风险继续构成红色筹码压力。",
    },
    "001270": {
        "bull": "商业航天与机器人长期映射未变，11月17日低72.64后收73.73，尚守72。",
        "bear": "跌停次日再跌3.83%并失75.6；Q3归母同比-44.43%、减值与可交换债筹码压力未消，机器人高位分化继续。",
        "message_level": "跌停次日再跌 + 失75.6 + Q3利润下滑",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看72/69/66，失72继续减风险；收75.6/80只算止跌。",
        "risk_level": "红色",
        "risk_note": "经营弱项、筹码压力和机器人退潮继续满足高位踩踏条件。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌4.08%至160、盘中失155", "红色踩踏与失161降风险条件有效。"),
    "688008": ("完全有效", "跌6.57%至130.6、失135", "红色失位降风险条件完全有效。"),
    "688017": ("完全有效", "跌4.24%至254、失255", "红色踩踏和关键位纪律有效。"),
    "688012": ("修复有效需上调观察", "涨2.27%至238.5、首日收238", "从纯防守上调为红色修复观察，等待次日守位。"),
    "002837": ("完全有效", "跌2.15%至34.09、守33.5", "红色不追和33.5承接观察有效。"),
    "03750.HK": ("完全有效", "微涨至366.8、仍未复367", "红色防守有效，首日收361不足以降低风险。"),
    "09988.HK": ("完全有效", "跌5.21%至85.45、失88", "业绩前不摊低和失位减风险条件完全有效。"),
    "002409": ("修复有效需上调观察", "涨5.59%至83.73、首日收83.7", "从纯防守上调为红色修复观察，等待次日守位。"),
    "688300": ("完全有效", "跌2.77%至71.28、继续失72.8", "项目/转债筹码风险与红色关键位纪律有效。"),
    "001270": ("完全有效", "跌3.83%至73.73、失75.6", "跌停后只减不加和关键位约束有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-18",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 10,
    "triggers": [
        "11月17日市场继续偏弱：上证-0.50%、深证-0.49%、创业板-1.20%、科创综指-1.41%；约1307股上涨、3947股下跌，跌停扩大至74。",
        "成交约1.46万亿元，涨停37、封板率约64.9%，但最高板降至3板、2板以上晋级仅约9.1%；昨日涨停平均+0.23%且大面率31.2%，局部芯片反弹未扩散到宽度。",
        "隔夜SPY -1.01%、QQQ -0.70%、SOXX +0.22%、NVDA -0.40%，半导体暂止急跌但BABA ADR -4.40%、恒生科技-1.14%，外部风险尚未解除。",
    ],
    "opening_scenario": "A股跌停继续扩散，芯片首板只是局部试错；若09:45上涨仍不足1800或跌停超过40，继续S7。中微、雅克单日反弹只能作为修复观察。",
    "state": "S7 退潮确认",
    "radar_score": 12.7,
    "MSS": 28,
    "MBS": 5,
    "FRS": 5,
    "TES": 8,
    "ET": 2,
    "position_ceiling": "S7标准总仓20%-40%；但跌停升至74、宽度连续偏弱且组合科技同变量暴露过高，组合风险预算上限继续5%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险；中微、雅克、宁德的首日修复仅观察，联瑞转债关注后续董事会决定。",
    "blocked": "禁止追芯片首板、抄底CPO/液冷/机器人/先进材料，禁止阿里业绩前摊低，禁止把单日反弹当趋势反转。",
    "focus": "09:45观察上涨家数、跌停数量及新易盛155、澜起128.5、英维克33.5、联瑞70、阿里85.1。",
    "downgrade": "已处S7；若上涨不足1000、跌停继续超过60或科技核心再现跌停，风险预算维持5%且只减不加。解除S7仍需至少两个完整交易日宽度与跌停持续改善。",
    "v231_link": "中微、雅克价格反弹只调交易时机；联瑞转债增加筹码权重，经营和财务评分不因单日涨跌改写。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-17"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-17":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-17")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-17", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-17完整A股与港股收盘验证上一版06:00判断；隔夜美股11月17日表现仅用于新一版预警。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 8, "useful_but_conservative": 0,
            "repair_upgrade": 2, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 2,
            "main_read": "上一版S7红色总阀门继续有效：新易盛、澜起、绿的、英维克、联瑞、铖昌和阿里继续走弱；中微与雅克分别首日收回238和83.7，分类为修复有效需上调观察，但按规则至少等待下一完整交易日守位。",
        },
        "items": items,
        "logic_corrections": [
            "下跌仍近4000家、跌停升至74且高位晋级下降，S7继续；芯片首板局部活跃不能代表宽度修复。",
            "中微首日收238、雅克首日收83.7，只从纯防守上调为红色修复观察。",
            "新易盛盘中失155、澜起失130、绿的失255、阿里失88，红色关键位继续执行。",
            "联瑞转债只是预计满足赎回条件，尚需未来5个达标交易日及董事会决定；增加筹码风险但不写成已赎回。",
            "隔夜SOXX止跌但BABA ADR继续大跌，外围仅局部缓和，不足以降低组合总风险。",
        ],
    }


def render_macro() -> str:
    r = MACRO_RADAR
    triggers = "".join(f"<li>{x}</li>" for x in r["triggers"])
    return f'''<section class="panel alert" id="macro-radar"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill red">今日大盘情绪预警：{r['warning']}</span> <b>{r['state']}</b> · RadarScore {r['radar_score']}</p><p><b>评分：</b>MSS {r['MSS']} / MBS {r['MBS']} / FRS {r['FRS']} / TES {r['TES']} / ET {r['ET']}</p><ul>{triggers}</ul><p><b>最可能开盘剧本：</b>{r['opening_scenario']}</p><p><b>仓位上限：</b>{r['position_ceiling']}</p><p><b>允许：</b>{r['allowed']}</p><p><b>禁止：</b>{r['blocked']}</p><p><b>重点观察：</b>{r['focus']}</p><p><b>降级条件：</b>{r['downgrade']}</p><p><b>与V2.3.1联动：</b>{r['v231_link']}</p></section>'''


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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-17完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：上证-0.50%、深证-0.49%、创业板-1.20%、科创综指-1.41%；约1307股上涨、3947股下跌，成交约1.46万亿元；涨停37、跌停74。",
        "短线生态：封板率约64.9%、昨日涨停平均+0.23%，但大面率31.2%、最高板降至3板、2板以上晋级约9.1%，芯片首板未扩散到宽度。",
        "港股：恒指-1.03%至23508.17、恒生科技-1.14%至3758.17；宁德-H +0.11%至366.80，阿里-W -5.21%至85.45。",
        "外围：美东11月17日SPY -1.01%、QQQ -0.70%、SOXX +0.22%、NVDA -0.40%、BABA ADR -4.40%；IEF +0.20%、UUP -0.08%。",
        "联瑞转债公告：11月4日至17日已有10日收盘不低于63.05元；未来连续20日若再有5日达标，将触发董事会决定是否赎回，当前尚未触发和实施赎回。https://pdf.dfcfw.com/pdf/H2_AN202611171831791039_1.pdf",
        "公司公告复核：澜起仅新增H股翌日披露报表，宁德仅新增翌日披露报表；其余持仓截至06:00未见改变经营事实的重大新增公告。",
        "阿里巴巴官方IR：9月季度业绩将于11月19日公布；现阶段未取得可靠一致预期，不提前判定超预期/不及预期。https://www.alibabagroup.com/en-US/investor-relations/",
        "高位筛查：全部持仓正向3日/5日涨幅均未触发硬阈值；但流动性退潮、筹码压力和外部风险继续存在。新易盛、澜起、绿的、英维克、联瑞、铖昌维持高位踩踏风险；中微、雅克只作首日修复观察。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里为无可靠预期，等待11月19日正式业绩。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://agu-app.com/daily/2026-11-17 ; https://www.dabanke.com/index-20261117.html ; https://finance.yahoo.com/quote/SOXX/history/ ; https://finance.yahoo.com/quote/BABA/history/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-18 06:00；使用11月17日A股/港股完整收盘、盘后公告与美东11月17日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S7退潮确认。11月17日约3947股下跌、跌停74，最高板降至3板；隔夜美股继续走弱，BABA ADR跌4.40%。半导体ETF暂止急跌、中微和雅克首日反弹只构成局部缓和。组合风险预算上限维持5%，新增仓位、题材交易和摊低均为0。",
        "top_attention": [
            {"name": "阿里巴巴-W", "reason": "H股跌5.21%、ADR再跌4.40%，11月19日业绩临近且无可靠一致预期；85.1/82是关键风险位。"},
            {"name": "新易盛", "reason": "盘中低155.24、收160，三日累计-22.17%且组合集中度最高；收165前仍为纯防守。"},
            {"name": "联瑞新材", "reason": "股价继续失72.8，联瑞转债预计满足赎回条件，潜在转股供给与筹码扰动上升；赎回尚未实施。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-18", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色：跌停继续扩至74，局部芯片反弹尚未形成全市场修复。</b>11月17日约3947股下跌，最高板降至3板、2板以上晋级约9.1%；阿里H股跌5.21%、ADR再跌4.40%。中微和雅克只完成首日关键位修复，联瑞转债增加潜在转股筹码扰动。总阀门继续S7，风险预算上限5%。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合风险预算上限维持5%，新增仓位、题材交易和摊低均为0；局部芯片反弹不追。</li><li>新易盛看155/150，澜起看128.5/125，英维克看33.5/32，联瑞看70/68；失位继续减同变量暴露。</li><li>绿的看251/245，中微看238/230，雅克看83.7/82.7，铖昌看72/69；中微和雅克至少等待次日守位。</li><li>宁德看361/350，阿里看85.1/82；阿里业绩前不摊低，联瑞关注转债后续董事会决定。</li><li>解除S7仍需至少两个完整交易日上涨家数回到2500以上、跌停持续收敛且科技核心停止放量破位。</li></ul></section>',
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
