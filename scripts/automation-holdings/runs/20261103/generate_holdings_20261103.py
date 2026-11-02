from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261102 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261103.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "Q3同比高增、Q4产量指引与首次回购约2亿元的公司层支撑未变。",
        "bear": "11月2日市场普涨时仍跌2.31%至191.48、低189.58并盘中失190，明显弱于创业板与科技链；现金流、库存及组合集中度压力仍在。",
        "message_level": "逆市下跌 + 盘中失190", "judgement": "利空",
        "action": "红色高位踩踏风险；看189.6/185/180，失185继续降集中度；收196/200只算止跌，205并守位才转修复。",
        "risk_level": "红色", "risk_note": "回购提供现金承接，但无法抵消财报后交易层踩踏与组合集中度风险。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收109.40亿元同比+80.30%，归母38.43亿元同比+61.15%，扣非36.30亿元同比+53.32%；归母环比下降约19.1%。前三季度营收318.50亿元同比+92.97%，归母113.72亿元同比+79.74%，扣非111.40亿元同比+76.79%，经营现金流14.64亿元同比-68.42%。Q3非经常性损益净额约2.13亿元，主要含金融资产公允价值/处置收益。存货较年初+140.70%、应收账款+68.72%。驱动为AI算力投资与800G/1.6T交付，公司称Q4产能产量将大幅增长。未取得可验证Q3单季一致预期，分类为无可靠预期。",
    },
    "688008": {
        "bull": "11月2日涨3.97%至164.58并收回160/164.1；当日回购61万股、耗资9993.48万元，价格区间159.95至166.54元。IR称服务器CPU内存通道升级与Agent需求将持续。",
        "bear": "收盘未站168/171，隔夜SOXX再跌3.77%；投资收益占比较高与外部半导体风险仍需约束。",
        "message_level": "回购约1亿元 + 首日收回164.1", "judgement": "利多",
        "action": "红色修复观察；看160/159.3/157.7，失159减风险；收168/171并守位才上调。",
        "risk_level": "红色", "risk_note": "经营层强但财报后价格确认失败，交易时点继续下调。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收20.79亿元同比+45.97%，归母12.40亿元同比+161.98%，扣非10.05亿元同比+167.21%，经营层互连芯片收入20.47亿元同比+49.3%、毛利率68.4%；前三季度营收54.14亿元同比+33.44%，归母32.37亿元同比+98.32%，扣非23.27亿元同比+58.60%，经营现金流28.98亿元同比+81.07%。前三季度投资收益及公允价值变动合计9.04亿元、汇兑损失2.38亿元；Q4互连芯片在手订单25.0亿至27.9亿元。正式数落在公司此前12亿至13亿元预告区间，但未取得可验证Q3市场一致预期，分类为无可靠预期。",
    },
    "688017": {
        "bull": "Q3超预期获价格首日确认，11月2日涨5.83%至268.80并收回260/268；低245守住风险线。",
        "bear": "盘中高274.76后回落、仍未收275，经营现金流同比-164.68%、估值显著高于行业，隔夜海外科技继续弱。",
        "message_level": "财报首日修复 + 275未复", "judgement": "中性",
        "action": "红色高位踩踏风险转修复观察；看260/253/245，失253减风险；收275并守位才降低风险。",
        "risk_level": "红色", "risk_note": "业绩超预期但估值、现金流与交易层踩踏三项共振，禁止追财报。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-30晚披露正式Q3报告：单季营收2.42亿元同比+56.10%，归母5197.21万元同比+29.12%，扣非约4684万元同比+39.94%；前三季度营收5.91亿元同比+45.30%，归母1.22亿元同比+30.33%，扣非1.05亿元同比+38.24%，经营现金流同比-164.68%。驱动为工业机器人份额提升、具身智能业务规模扩大、效率提升与产能扩张。国金证券2026-10-31覆盖报告标题明确评价Q3超预期并维持买入，分类为超预期；但现金流与高估值风险需单列。",
    },
    "688012": {
        "bull": "Q3扣非同比+43.77%与平台化国产替代逻辑获部分承接，11月2日收216.59上涨1.36%。",
        "bear": "盘中低204.01触发210风险线，收盘仍未站218/222；归母受大额非经常收益放大、经营现金流为负，隔夜SOXX再跌。",
        "message_level": "盘中失210 + 218未复", "judgement": "中性",
        "action": "红色；看210/204/200，失204继续减风险；收218/222只算止跌，230并守位才转修复。",
        "risk_level": "红色", "risk_note": "核心经营改善但归母受投资收益放大，交易层尚未确认。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-30披露正式Q3报告：单季营收36.35亿元同比+17.18%，归母13.09亿元同比+159.02%，扣非5.00亿元同比+43.77%，经营现金流-7.90亿元；前三季度营收103.26亿元同比+28.08%，归母41.34亿元同比+241.31%，扣非16.23亿元同比+83.01%，经营现金流-1.05亿元。Q3非经常性损益约8.08亿元、前三季度约25.11亿元，主要来自股权投资公允价值/投资收益及出售拓荆科技股份；前三季度研发支出32.22亿元，占收入31.20%。未取得可验证Q3单季一致预期，分类为无可靠预期，不把归母高增直接判为超预期。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "Q3增收不增利、前三季度归母-7.62%与存货+154.95%的压力未变；11月2日低36.75后收38.39，仅收回38而未收40.6。",
        "message_level": "收回38 + 40.6未复", "judgement": "中性",
        "action": "红色修复观察；看37.8/36.75/36，失36.75减风险；收40.6并守位才上调。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "11月2日涨6.08%至359.40并收回342/350，低340未再破336；公司累计回购A股1960.59万股、耗资53.60亿元，股东会通过员工持股与财务资助等议案。",
        "bear": "高365.40后回落、收盘仍略低于361；Q3不及LSEG预期与经营现金流下降未变。",
        "message_level": "累计回购53.6亿元 + 收回350", "judgement": "利多",
        "action": "红色修复观察；看350/342/340，失342减风险；收361并守位才降低风险。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "11月2日H股涨2.47%至99.45、收回98.9，盘中高100.20；隔夜BABA ADR再涨3.55%至101.50美元。",
        "bear": "H股收盘仍未站100，战略催化与诉讼进展尚未形成利润确认。",
        "message_level": "H股收回98.9 + ADR强于大盘", "judgement": "利多",
        "action": "红色修复观察；看98.9/97/95，失97减风险；收100/103.3并守位才上调。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "Q3被申万宏源评价略低于预期；11月2日虽涨5.13%至81.39并收回78/80，但仍未站82.7，盘中低77.11。",
        "message_level": "收回80 + 82.7未复", "judgement": "中性",
        "action": "红色修复观察；看80/77.1/75，失77减风险；收82.7并守位才上调。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "不及预期",
        "earnings_note": "2026-10-27披露正式Q3报告：单季营收22.08亿元同比+1.57%、环比约-13%，归母2.73亿元同比+1.15%、环比约-7%，扣非2.88亿元同比+7.61%、环比约+1%；前三季度营收67.21亿元同比+3.93%，归母8.34亿元同比+4.74%，扣非8.18亿元同比+2.57%，经营现金流9.49亿元同比+6.53%。申万宏源2026-10-29覆盖报告称业绩略低于预期并下调盈利预测，压力来自LNG板材交付节奏、面板光阻剂需求及汇兑损失；因此分类为不及预期。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "正式Q3营收4.18亿元同比+37.19%、归母1.11亿元同比+36.57%、扣非1.03亿元同比+37.16%；申万宏源评价超预期，高端粉体放量并上调盈利预测。",
        "bear": "11月2日仅涨2.03%至79.60，仍未收80/83.67；可转债、扩产融资与海外AI硬件继续承压。",
        "message_level": "守77.8 + 80未复", "judgement": "中性",
        "action": "红色高位踩踏风险；看78.1/77.8/75，失77.8减风险；收80/83.67只算止跌，86.5并守位才转修复。",
        "risk_level": "红色", "risk_note": "业绩层超预期但交易层修复失败，不能用高增长替代风险纪律。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-28披露正式Q3报告：单季营收4.18亿元同比+37.19%、环比约+25%，归母1.11亿元同比+36.57%、环比约+44%，扣非1.03亿元同比+37.16%、环比约+48%；前三季度营收10.47亿元同比+27.12%，归母2.60亿元同比+18.24%，扣非2.36亿元同比+16.57%，经营现金流1.36亿元同比+2.91%。Q3非经常性损益约788万元，主要含政府补助和金融资产公允价值/处置收益。驱动为Lowα、液相法球形二氧化硅及亚微米球硅等高阶产品销量增加。申万宏源2026-10-29覆盖报告明确评价超预期并上调2026-2028盈利预测，分类为超预期。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月30日盘中高87.60，商业航天/卫星通信相对强势仍有承接。",
        "bear": "11月2日涨1.19%至81.10但高82后回落、仍未收82.5；Q3归母同比-44.43%、减值、可交换债与参数缺失未消。",
        "message_level": "守75.6 + 82.5未复", "judgement": "中性",
        "action": "红色高位踩踏风险；看79.5/76.2/75.6，失76减风险；收82.5只算止跌，88并守位才修复。",
        "risk_level": "红色", "risk_note": "基本面未支撑题材强度、可交换债筹码与高位回落三项共振。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-23披露正式Q3报告：单季营收0.99亿元同比-5.72%，归母1874.21万元同比-44.43%，扣非1772.44万元同比-46.69%；前三季度营收3.15亿元同比+2.86%，归母9503.74万元同比+5.18%。公司另计提前三季度资产减值准备1497.57万元，将等额减少利润总额、对经营现金流无影响。未取得可靠Q3一致预期，分类为无可靠预期；交易层商业航天强势不改变业绩层放缓。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌2.31%至191.48、盘中失190", "普涨日仍弱，红色集中度约束完全有效。"),
    "688008": ("修复有效需上调观察", "涨3.97%至164.58、收回160/164.1", "回购与业绩获首日价格确认，等待168/171守位。"),
    "688017": ("修复有效需上调观察", "涨5.83%至268.80、收回260/268", "Q3超预期获首日确认，但需守253并收275。"),
    "688012": ("完全有效", "盘中低204.01失210，收216.59未收218", "风险线触发且未收上层关键位，红色约束有效。"),
    "002837": ("修复有效需上调观察", "涨1.56%至38.39、收回38", "从纯防守升级修复观察，等待40.6。"),
    "03750.HK": ("修复有效需上调观察", "涨6.08%至359.40、收回342/350", "回购与股东会催化获首日确认，等待361。"),
    "09988.HK": ("修复有效需上调观察", "涨2.47%至99.45、收回98.9", "H股与ADR共振修复，等待100/103.3。"),
    "002409": ("修复有效需上调观察", "涨5.13%至81.39、收回78/80", "首日修复但未收82.7，继续观察。"),
    "688300": ("方向偏保守但操作有效", "涨2.03%至79.60、仍未收80", "方向偏保守但红色不加仓和失位约束有效。"),
    "001270": ("方向偏保守但操作有效", "涨1.19%至81.10、仍未收82.5", "方向偏保守但红色不追约束有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-03",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 5,
    "triggers": [
        "沪指+1.08%、深成指+1.63%、创业板+1.87%、科创50+3.11%，约4681股上涨、818股下跌，成交增至约1.784万亿元，宽度和量价完成首日修复。",
        "涨停约131、跌停约10，前一交易日的跌停扩散明显收敛；但属于极端冰点后的单日修复，必须等待次日守位。",
        "港股恒科+2.25%，但隔夜QQQ-1.37%、SOXX-3.77%、NVDA-1.19%，海外AI/半导体继续走弱，限制A股科技持续性。",
    ],
    "opening_scenario": "A/H首日修复可能延续，但海外半导体继续下跌；若高开后上涨家数与科技核心不能同步守位，反抽仍优先用于降低集中暴露。",
    "state": "S2 冰点转折",
    "radar_score": 55.5,
    "MSS": 40,
    "MBS": 62,
    "FRS": 55,
    "TES": 68,
    "ET": 28,
    "position_ceiling": "S2标准总仓30%-45%；因组合高科技同变量暴露、海外半导体续跌且多股仅首日修复，组合覆盖上限继续15%，新增仓位与题材交易均为0。",
    "allowed": "只观察修复确认；持有已收回关键位的核心，失位立即回到纯防守。",
    "blocked": "禁止追单日普涨、追绿的/宁德/阿里高开或摊低新易盛；禁止逆海外半导体压力开新仓。",
    "focus": "09:45观察上涨家数能否继续超过2500、跌停是否低于15、科创50承接、新易盛190、澜起160/164.1、绿的260/253。",
    "downgrade": "若上涨家数回落至1500以下、跌停重新超过30，或新易盛失185、澜起失159、绿的失253、中微失204，则退回S0/S1防守。升级至少需下一完整交易日守位。",
    "v231_link": "绿的、澜起、宁德等公司层利好获首日价格确认；新易盛在普涨日继续弱。基本面分与交易时点继续分离，不授予加仓权限。",
}


def trim_market(market: dict) -> None:
    previous.previous.previous.previous.previous.previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-02"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-02":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-02")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-02", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-02完整A股与港股收盘验证上一版06:00判断；方向与红色仓位约束分开评价。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 2, "useful_but_conservative": 2,
            "repair_upgrade": 6, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 8,
            "main_read": "11月2日A/H出现首日宽度修复：澜起、绿的、英维克、宁德、阿里、雅克收回部分关键位，分类为修复有效需上调观察；新易盛仍逆市下跌、中微盘中触发风险线；联瑞与铖昌小涨但未收复关键位，方向偏保守而操作仍有效。",
        },
        "items": items,
        "logic_corrections": [
            "约4681股上涨、跌停降至约10只，宏观状态由S0升级S2冰点转折；但仅是首日修复，组合上限不提高。",
            "绿的Q3超预期、澜起回购、宁德回购与股东会催化获首日确认，只能升级修复观察。",
            "新易盛在普涨日继续下跌并盘中失190，说明集中度与交易风险仍是组合第一约束。",
            "中微低204.01触发210风险线后收回，验证盘中风控有效，未收218前不升级。",
            "隔夜SOXX再跌3.77%，海外科技压力覆盖A/H首日修复，周二高开仍不得追。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-02完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指+1.08%、深成指+1.63%、创业板+1.87%、科创50+3.11%，成交约1.784万亿元；约4681股上涨、818股下跌，涨停约131、跌停约10，量价与宽度完成首日修复。",
        "港股：恒指+0.42%至23393.32、恒生科技+2.25%至3839.41、国企指数+0.56%；宁德-H +6.08%至359.40，阿里-W +2.47%至99.45。",
        "外围：美东11月2日SPY -0.48%、DIA +0.43%、QQQ -1.37%、SOXX -3.77%；NVDA -1.19%、IEF -0.28%、UUP -0.07%，BABA ADR逆势+3.55%。海外AI/半导体仍弱。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "新易盛：Q3同比高增、Q4交付指引与首次回购2亿元未改变相对弱势；11月2日普涨时仍跌2.31%并盘中失190，继续作为组合集中度首要风险。",
        "澜起科技：11月2日回购61万股、耗资9993.48万元，价格159.95至166.54元；截至10月底第二次回购累计62万股、约1.00亿元。IR强调Agent需求与服务器内存通道升级，股价首日收回164.1。",
        "绿的谐波正式Q3：单季营收2.42亿元同比+56.10%，归母5197万元同比+29.12%，扣非约4684万元同比+39.94%；前三季度经营现金流同比-164.68%。国金证券2026-10-31评价Q3超预期，分类超预期；高估值与现金流风险单列。",
        "中微公司正式Q3：单季营收36.35亿元同比+17.18%，归母13.09亿元同比+159.02%，扣非5.00亿元同比+43.77%，经营现金流-7.90亿元；Q3非经常性损益约8.08亿元。未取得可靠单季一致预期，分类无可靠预期。",
        "联瑞新材正式Q3：单季营收4.18亿元同比+37.19%，归母1.11亿元同比+36.57%，扣非1.03亿元同比+37.16%；申万宏源2026-10-29覆盖报告明确评价超预期并上调盈利预测，但股价次日跌7.82%，业绩与交易分开处理。",
        "雅克科技正式Q3：单季营收22.08亿元同比+1.57%，归母2.73亿元同比+1.15%，扣非2.88亿元同比+7.61%；申万宏源2026-10-29覆盖报告称略低于预期并下调盈利预测，分类为不及预期。",
        "铖昌科技正式Q3：单季营收0.99亿元同比-5.72%，归母1874万元同比-44.43%，扣非1772万元同比-46.69%；10月30日失82.5，高位题材分化确认。",
        "宁德时代：11月2日临时股东会通过员工持股计划、向控股子公司财务资助等议案；截至10月底累计回购A股1960.59万股、耗资53.60亿元，股份拟注销减资。",
        "公司公告复核：除澜起回购/IR与宁德回购/股东会外，其余持仓截至06:00未见改变经营事实的重大新增公告。",
        "宏观雷达：MSS40、MBS62、FRS55、TES68、ET28，RadarScore55.5；由S0升级S2冰点转折，但隔夜SOXX-3.77%，06:00预警仍为橙色。",
        "高位筛查：无持仓触发新的3日+25%或5日+35%涨幅阈值。新易盛、绿的、联瑞、铖昌的高位踩踏旧标签未解除；绿的虽收回268、铖昌守75.6，但均需下一交易日确认。",
        "财报源：新易盛、澜起、绿的、中微、英维克、宁德、雅克、联瑞、铖昌正式Q3；阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12688218&stockid=688008 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?CompanyCode=81585146&gather=1&id=12688279 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12688689&stockid=300750 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12688697&stockid=300750 ; https://stock.cngold.org/c/2026-11-02/c10853280.html ; https://cn.investing.com/indices/hang-seng-tech-historical-data ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-03 06:00；使用11月2日A股/港股完整收盘、收盘后公告与美东11月2日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、宏观S2冰点转折。11月2日约4681股上涨、跌停降至约10只，A/H完成首日修复；但隔夜SOXX再跌3.77%，新易盛逆市走弱，多数持仓只收回第一层关键位。组合覆盖上限继续15%、新增仓位与题材交易为0，至少等待下一完整交易日守位。",
        "top_attention": [
            {"name": "新易盛", "reason": "普涨日仍跌2.31%、盘中失190，组合集中度最高；回购与Q4指引尚未形成价格承接。"},
            {"name": "宁德时代-H", "reason": "涨6.08%收回350且累计回购53.6亿元，但收盘仍略低361；Q3不及预期压力未消，只升级修复观察。"},
            {"name": "绿的谐波", "reason": "Q3超预期获首日确认并收回268，但高274.76回落、现金流弱与高估值仍在；至少等待守253并收275。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-03", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>A/H首日修复，但隔夜SOXX再跌3.77%，组合总阀门仍红色。</b>新易盛在普涨日继续下跌并盘中失190；绿的、联瑞、铖昌的<b>高位踩踏风险</b>旧标签未解除。澜起、绿的、宁德、阿里、雅克只完成首日修复，必须等待下一交易日守位，禁止追高。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限15%、新增仓位与题材交易为0；首日修复后先看守位。</li><li>新易盛看189.6/185/180，失185继续降集中度；普涨日相对弱势优先处理。</li><li>澜起看160/159.3，绿的看260/253，中微看210/204；失位恢复纯防守。</li><li>宁德看350/342，阿里看98.9/97，雅克看80/77.1；高开无宽度配合不追。</li><li>联瑞未收80、铖昌未收82.5前维持红色；任何单日反弹需下一交易日守位。</li></ul></section>',
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
