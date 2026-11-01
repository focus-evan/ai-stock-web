from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261030 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261102.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "Q3同比高增、公司称Q4产能产量将大幅增长；10月30日首次回购97.57万股、耗资约2亿元，成交均价约204.94元，正式进入执行期。",
        "bear": "财报后10月30日放量跌14.19%至196.00、低194，跌破220/210；Q3归母环比约-19.1%，前三季度经营现金流同比-68.42%、存货+140.70%，多家券商下调2026盈利预测。",
        "message_level": "回购2亿元 + 财报后跌14.19%", "judgement": "利空",
        "action": "红色高位踩踏风险；看194/190/180，失190继续降集中度；收200/205只算止跌，214.4/220并守位才转修复。",
        "risk_level": "红色", "risk_note": "回购提供现金承接，但无法抵消财报后交易层踩踏与组合集中度风险。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收109.40亿元同比+80.30%，归母38.43亿元同比+61.15%，扣非36.30亿元同比+53.32%；归母环比下降约19.1%。前三季度营收318.50亿元同比+92.97%，归母113.72亿元同比+79.74%，扣非111.40亿元同比+76.79%，经营现金流14.64亿元同比-68.42%。Q3非经常性损益净额约2.13亿元，主要含金融资产公允价值/处置收益。存货较年初+140.70%、应收账款+68.72%。驱动为AI算力投资与800G/1.6T交付，公司称Q4产能产量将大幅增长。未取得可验证Q3单季一致预期，分类为无可靠预期。",
    },
    "688008": {
        "bull": "正式Q3、Q4在手订单25.0亿至27.9亿元及新3亿至5亿元回购均显示经营和资本回报支撑。",
        "bear": "财报后10月30日再跌5.09%至158.30、低157.72，失164.1/160；投资收益与公允价值变动占比高，海外半导体周五大跌。",
        "message_level": "经营强 + 财报后失160", "judgement": "利空",
        "action": "红色；看157.7/155/150，失155减风险；收160/164.1只算止跌，168并守位才转修复。",
        "risk_level": "红色", "risk_note": "经营层强但财报后价格确认失败，交易时点继续下调。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收20.79亿元同比+45.97%，归母12.40亿元同比+161.98%，扣非10.05亿元同比+167.21%，经营层互连芯片收入20.47亿元同比+49.3%、毛利率68.4%；前三季度营收54.14亿元同比+33.44%，归母32.37亿元同比+98.32%，扣非23.27亿元同比+58.60%，经营现金流28.98亿元同比+81.07%。前三季度投资收益及公允价值变动合计9.04亿元、汇兑损失2.38亿元；Q4互连芯片在手订单25.0亿至27.9亿元。正式数落在公司此前12亿至13亿元预告区间，但未取得可验证Q3市场一致预期，分类为无可靠预期。",
    },
    "688017": {
        "bull": "周末正式Q3营收2.42亿元同比+56.10%、归母0.52亿元同比+29.12%、扣非约0.47亿元同比+39.94%；国金证券评价超预期，工业机器人份额与具身智能规模提升。",
        "bear": "财报披露前10月30日跌9.61%至254.00、低253.21并失275/268；前三季度经营现金流同比-164.68%，当前估值显著高于行业，海外AI/半导体周五重挫。",
        "message_level": "Q3超预期 + 交易踩踏 + 现金流弱", "judgement": "中性",
        "action": "红色高位踩踏风险；看253/245/238，失245减风险；收260/268只算止跌，275并守位才转修复。",
        "risk_level": "红色", "risk_note": "业绩超预期但估值、现金流与交易层踩踏三项共振，禁止追财报。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-30晚披露正式Q3报告：单季营收2.42亿元同比+56.10%，归母5197.21万元同比+29.12%，扣非约4684万元同比+39.94%；前三季度营收5.91亿元同比+45.30%，归母1.22亿元同比+30.33%，扣非1.05亿元同比+38.24%，经营现金流同比-164.68%。驱动为工业机器人份额提升、具身智能业务规模扩大、效率提升与产能扩张。国金证券2026-10-31覆盖报告标题明确评价Q3超预期并维持买入，分类为超预期；但现金流与高估值风险需单列。",
    },
    "688012": {
        "bull": "周末正式Q3营收36.35亿元同比+17.18%、归母13.09亿元同比+159.02%、扣非5.00亿元同比+43.77%；前三季度研发32.22亿元、超9300个反应台量产，国产替代平台化继续兑现。",
        "bear": "财报披露前10月30日跌5.86%至213.69、低211.98；Q3非经常性损益约8.08亿元，前三季度经营现金流-1.05亿元，归母高增不能等同核心经营同幅增长。",
        "message_level": "扣非高增 + 非经常收益大 + 失218", "judgement": "中性",
        "action": "红色；看212/210/200，失210继续减风险；收218/222只算止跌，230并守位才转修复。",
        "risk_level": "红色", "risk_note": "核心经营改善但归母受投资收益放大，交易层尚未确认。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-30披露正式Q3报告：单季营收36.35亿元同比+17.18%，归母13.09亿元同比+159.02%，扣非5.00亿元同比+43.77%，经营现金流-7.90亿元；前三季度营收103.26亿元同比+28.08%，归母41.34亿元同比+241.31%，扣非16.23亿元同比+83.01%，经营现金流-1.05亿元。Q3非经常性损益约8.08亿元、前三季度约25.11亿元，主要来自股权投资公允价值/投资收益及出售拓荆科技股份；前三季度研发支出32.22亿元，占收入31.20%。未取得可验证Q3单季一致预期，分类为无可靠预期，不把归母高增直接判为超预期。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "Q3增收不增利、前三季度归母-7.62%与存货+154.95%的压力未变；10月30日跌7.74%并收最低37.80，失40.6/38。",
        "message_level": "增收不增利 + 收最低37.8", "judgement": "利空",
        "action": "红色强防守；看37.8/36/34，失36继续减风险；收38/40.6只算止跌，42并守位才转修复。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "10月30日收338.80持平，低336仍守前低336.2附近；恒指反弹1.46%，动力与储能长期需求逻辑未变。",
        "bear": "高346.80后回落，仍未收342/350；Q3不及LSEG预期、经营现金流下降与财报后回撤未修复。",
        "message_level": "守336 + 342未复", "judgement": "中性",
        "action": "红色；看336/330/326，失336减风险；收342/350只算止跌，361并守位才转修复。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "10月30日H股涨0.99%至97.05、低95.10仍守95，诉讼阶段缓和情绪仍在。",
        "bear": "H股仍未收98.9/100，周五BABA ADR再跌1.53%至98.04美元；DRAM长约仍为洽谈报道。",
        "message_level": "H股守95 + ADR续跌", "judgement": "中性",
        "action": "红色；看95.1/95/90，失95减风险；收98.9/100只算止跌，103.3并守位才转修复。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "Q3被申万宏源评价略低于预期；10月30日再跌6.47%至77.42并失82.7/80/78，半导体材料交易层继续踩踏。",
        "message_level": "Q3略低预期 + 失78", "judgement": "利空",
        "action": "红色强防守；看77.4/75/72，失75继续减风险；收78/80只算止跌，82.7并守位才转修复。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "不及预期",
        "earnings_note": "2026-10-27披露正式Q3报告：单季营收22.08亿元同比+1.57%、环比约-13%，归母2.73亿元同比+1.15%、环比约-7%，扣非2.88亿元同比+7.61%、环比约+1%；前三季度营收67.21亿元同比+3.93%，归母8.34亿元同比+4.74%，扣非8.18亿元同比+2.57%，经营现金流9.49亿元同比+6.53%。申万宏源2026-10-29覆盖报告称业绩略低于预期并下调盈利预测，压力来自LNG板材交付节奏、面板光阻剂需求及汇兑损失；因此分类为不及预期。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "正式Q3营收4.18亿元同比+37.19%、归母1.11亿元同比+36.57%、扣非1.03亿元同比+37.16%；申万宏源评价超预期，高端粉体放量并上调盈利预测。",
        "bear": "10月30日再跌7.34%至78.02、低77.78，失83.67/80；扩产、融资、可转债筹码与海外AI硬件退潮共振。",
        "message_level": "Q3超预期 + 价格连续踩踏", "judgement": "利空",
        "action": "红色高位踩踏风险；看77.8/75/72，失75减风险；收80/83.67只算止跌，86.5并守位才转修复。",
        "risk_level": "红色", "risk_note": "业绩层超预期但交易层修复失败，不能用高增长替代风险纪律。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-28披露正式Q3报告：单季营收4.18亿元同比+37.19%、环比约+25%，归母1.11亿元同比+36.57%、环比约+44%，扣非1.03亿元同比+37.16%、环比约+48%；前三季度营收10.47亿元同比+27.12%，归母2.60亿元同比+18.24%，扣非2.36亿元同比+16.57%，经营现金流1.36亿元同比+2.91%。Q3非经常性损益约788万元，主要含政府补助和金融资产公允价值/处置收益。驱动为Lowα、液相法球形二氧化硅及亚微米球硅等高阶产品销量增加。申万宏源2026-10-29覆盖报告明确评价超预期并上调2026-2028盈利预测，分类为超预期。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月30日盘中高87.60，商业航天/卫星通信相对强势仍有承接。",
        "bear": "收盘跌5.64%至80.15并失82.5；Q3归母同比-44.43%、减值、可交换债与股数/成本缺失，连续大涨后的高位分化已经出现。",
        "message_level": "失82.5 + Q3利润下滑44%", "judgement": "利空",
        "action": "红色高位踩踏风险；看79.5/75.6/72，失79.5减风险；收82.5只算止跌，88并守位才修复。",
        "risk_level": "红色", "risk_note": "基本面未支撑题材强度、可交换债筹码与高位回落三项共振。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-23披露正式Q3报告：单季营收0.99亿元同比-5.72%，归母1874.21万元同比-44.43%，扣非1772.44万元同比-46.69%；前三季度营收3.15亿元同比+2.86%，归母9503.74万元同比+5.18%。公司另计提前三季度资产减值准备1497.57万元，将等额减少利润总额、对经营现金流无影响。未取得可靠Q3一致预期，分类为无可靠预期；交易层商业航天强势不改变业绩层放缓。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌14.19%至196.00、失220/210", "财报后交易踩踏，红色集中度约束完全有效。"),
    "688008": ("完全有效", "跌5.09%至158.30、失164.1/160", "财报后价格确认失败，红色约束有效。"),
    "688017": ("完全有效", "跌9.61%至254.00、失275/268", "高位题材退潮，橙色不追和减风险约束有效。"),
    "688012": ("完全有效", "跌5.86%至213.69、低211.98", "连续破位，红色约束有效。"),
    "002837": ("完全有效", "跌7.74%并收最低37.80、失40.6/38", "增收不增利与库存风险继续验证。"),
    "03750.HK": ("方向偏保守但操作有效", "收338.80持平、仍未收342", "方向偏保守但红色不加仓约束有效。"),
    "09988.HK": ("方向偏保守但操作有效", "涨0.99%至97.05、仍未收98.9", "方向偏保守但红色不加仓约束有效。"),
    "002409": ("完全有效", "跌6.47%至77.42、失82.7/80/78", "不及预期与交易破位共振，红色约束有效。"),
    "688300": ("完全有效", "跌7.34%至78.02、失83.67/80", "Q3超预期未稳价，高位踩踏约束有效。"),
    "001270": ("完全有效", "跌5.64%至80.15、失82.5", "橙色不追有效，高位分化确认。"),
}


MACRO_RADAR = {
    "date": "2026-11-02",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 11,
    "triggers": [
        "沪指-1.44%、深成指-2.73%、创业板-4.13%、科创50-5.48%，约892股上涨、4602股下跌，科技成长与市场宽度继续恶化。",
        "成交放大至约1.674万亿元，涨停约47、跌停约82、炸板31；通信-6.48%、电子-5.11%、半导体-5.32%，放量对应踩踏而非增量进攻。",
        "周五SPY-1.78%、QQQ-3.48%、SOXX-8.25%、NVDA-4.16%，与A股科技踩踏形成硬风险共振；港股恒科仅+0.29%且AI硬件继续下挫。",
    ],
    "opening_scenario": "绿的、中微财报可能带来局部高开，但海外半导体重挫与国内跌停扩散占主导；任何高开若无宽度和板块共同承接，优先视为降低风险窗口。",
    "state": "S0 绝对防守",
    "radar_score": 15.3,
    "MSS": 40,
    "MBS": 3,
    "FRS": 5,
    "TES": 6,
    "ET": 2,
    "position_ceiling": "S0总仓原则0%-20%；因组合高科技同变量暴露和国内外共振踩踏，组合覆盖上限压至15%，新增仓位与题材交易均为0。",
    "allowed": "只处理风险、观察绿的/中微财报后的价格反馈与新易盛回购承接；高开不追。",
    "blocked": "禁止抄底科技成长、追铖昌/商业航天后排、摊低集中持仓或把财报超预期直接当买点。",
    "focus": "09:45观察上涨家数能否超过1500、跌停能否快速收敛、科创50承接、新易盛194/190、绿的253/245、中微212/210。",
    "downgrade": "已处S0；若跌停继续超过50或新易盛失190、绿的失245、中微失210、联瑞失75，则保持极端防守。升级至少需一整日宽度与科技核心共同修复。",
    "v231_link": "绿的Q3超预期但现金流与高估值需扣分；中微归母受大额非经常收益放大；新易盛回购无法阻止踩踏。经营分与交易时点继续严格分离。",
}


def trim_market(market: dict) -> None:
    previous.previous.previous.previous.previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-30"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-30":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-30")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-30", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-30完整A股与港股收盘验证上一版06:00判断；方向与红色仓位约束分开评价。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 8, "useful_but_conservative": 2,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 2,
            "main_read": "10月30日科技踩踏继续扩大：新易盛、澜起、绿的、中微、英维克、雅克、联瑞、铖昌八只约束完全有效；宁德持平、阿里小涨但均未收复上层关键位，方向偏保守而操作仍有效。",
        },
        "items": items,
        "logic_corrections": [
            "约4602股下跌、跌停约82只、科创50-5.48%，S0踩踏继续加深；组合上限需从20%压至15%。",
            "新易盛财报后跌14.19%，公司当日回购约2亿元仍未止跌，说明回购只能提供边际承接、不能替代趋势确认。",
            "绿的与中微三季报均在周五收盘后披露；周五跌幅只验证交易层，不能据此倒推财报预期差。",
            "宁德、阿里未下跌但未收复关键位，方向偏保守；红色总阀门作为仓位约束仍完全有效。",
            "周五美股SOXX再跌8.25%，国内外科技共振压力继续覆盖公司层利好，周一高开不得追。",
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
        "周一盘前口径：全部10只持仓使用2026-10-30完整收盘；周末无A/H交易，外围使用美东10月30日收盘，澜起继续使用未复权day序列。",
        "A股：沪指-1.44%、深成指-2.73%、创业板-4.13%、科创50-5.48%，成交约1.674万亿元；约892股上涨、4602股下跌，涨停约47、跌停约82、炸板31。通信-6.48%、电子-5.11%、半导体-5.32%。",
        "港股：恒指+1.46%至23294.42、恒生科技+0.29%至3754.90、国企指数+1.37%；指数反弹由消费/能源/金融主导，AI硬件仍弱。宁德-H收338.80持平，阿里-W +0.99%至97.05。",
        "外围：美东10月30日SPY -1.78%、DIA -1.09%、QQQ -3.48%、SOXX -8.25%；NVDA -4.16%、IEF +0.55%、UUP -0.10%，BABA ADR -1.53%。纳指与半导体出现周末前加速下跌。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "新易盛：Q3同比高增但归母环比约-19.1%、现金流和库存承压；10月30日财报后跌14.19%。公司当日首次回购97.57万股、耗资约2亿元，最高213.27元、最低196.97元，正式执行回购仍未阻止踩踏。",
        "澜起科技：Q3与Q4订单强、新3亿至5亿元回购获批，但10月30日财报后跌5.09%并失160；经营层与交易层继续背离。",
        "绿的谐波正式Q3：单季营收2.42亿元同比+56.10%，归母5197万元同比+29.12%，扣非约4684万元同比+39.94%；前三季度经营现金流同比-164.68%。国金证券2026-10-31评价Q3超预期，分类超预期；高估值与现金流风险单列。",
        "中微公司正式Q3：单季营收36.35亿元同比+17.18%，归母13.09亿元同比+159.02%，扣非5.00亿元同比+43.77%，经营现金流-7.90亿元；Q3非经常性损益约8.08亿元。未取得可靠单季一致预期，分类无可靠预期。",
        "联瑞新材正式Q3：单季营收4.18亿元同比+37.19%，归母1.11亿元同比+36.57%，扣非1.03亿元同比+37.16%；申万宏源2026-10-29覆盖报告明确评价超预期并上调盈利预测，但股价次日跌7.82%，业绩与交易分开处理。",
        "雅克科技正式Q3：单季营收22.08亿元同比+1.57%，归母2.73亿元同比+1.15%，扣非2.88亿元同比+7.61%；申万宏源2026-10-29覆盖报告称略低于预期并下调盈利预测，分类为不及预期。",
        "铖昌科技正式Q3：单季营收0.99亿元同比-5.72%，归母1874万元同比-44.43%，扣非1772万元同比-46.69%；10月30日失82.5，高位题材分化确认。",
        "公司公告复核：除绿的/中微正式Q3与新易盛首次回购外，周末其余持仓未见改变经营事实的重大新增公告；宁德11月2日临时股东会为既定安排。",
        "宏观雷达：MSS40、MBS3、FRS5、TES6、ET2，RadarScore15.3；国内放量踩踏叠加海外半导体-8.25%，维持S0绝对防守，06:00预警红色。",
        "高位筛查：无持仓触发新的3日+25%或5日+35%涨幅阈值。新易盛、绿的、联瑞分别满足估值/现金流或筹码压力、板块踩踏、外围科技大跌等至少三项，标为高位踩踏风险；铖昌满足Q3利润下滑、可交换债与高位回落三项，同样转红。",
        "财报源：新易盛、澜起、绿的、中微、英维克、宁德、雅克、联瑞、铖昌正式Q3；阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12683581&stockid=300502 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?CompanyCode=81598243&gather=1&id=12684249 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12682260&stockid=688012 ; https://data.eastmoney.com/report/info/AP202610311831278892.html ; https://stock.10jqka.com.cn/hks/20261030/c681288667.shtml ; https://finance.eastmoney.com/a/202610303916480183.html ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-02 06:00；使用10月30日A股/港股完整收盘、周末公告与美东10月30日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S0绝对防守。10月30日约4602股下跌、跌停约82只、科创50跌5.48%，组合8只个股继续破位；周五SOXX再跌8.25%、QQQ跌3.48%。组合覆盖上限压至15%，新增仓位和题材交易为0；周末财报利多高开只观察承接，不追。",
        "top_attention": [
            {"name": "新易盛", "reason": "财报后放量跌14.19%至196，即使公司当日回购约2亿元仍未止跌；组合集中度最高、现金流/库存与海外AI退潮共振。"},
            {"name": "绿的谐波", "reason": "周末Q3获国金证券评价超预期，但周五已跌9.61%；经营现金流同比-164.68%、估值显著高于行业，财报高开不能追。"},
            {"name": "中微公司", "reason": "周末Q3扣非同比+43.77%，但归母高增主要受大额投资收益放大；周五失218且经营现金流为负，先看价格确认。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-02", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色S0绝对防守：A股跌停扩散、科创50重挫，周五SOXX再跌8.25%。</b>新易盛财报后跌14.19%且2亿元回购未止跌；绿的、联瑞、铖昌均满足至少三项红色条件，标为<b>高位踩踏风险</b>。绿的Q3超预期、中微扣非高增只构成公司层利多，周一若高开但无宽度和板块承接，不得追涨。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限15%、新增仓位与题材交易为0；周末财报利多高开只观察承接。</li><li>新易盛看194/190/180，失190继续降集中度；回购均价附近不构成自动支撑。</li><li>绿的看253/245/238，中微看212/210/200；财报高开无板块共振时不追。</li><li>澜起看157.7/155，英维克看37.8/36，雅克看77.4/75，联瑞看77.8/75；失位继续减风险。</li><li>宁德未收342、阿里未收98.9前不得降低个股风险；任何单日反弹需下一交易日守位。</li></ul></section>',
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
