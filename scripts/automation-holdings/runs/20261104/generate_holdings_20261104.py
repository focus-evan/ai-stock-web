from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261103 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261104.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月2日至3日继续回购213.91万股、耗资约4亿元，价格172.05至199.75元；叠加此前约2亿元，累计已实施约6亿元。",
        "bear": "11月3日再跌9.46%至173.36、低171.60，回购仍未止跌；3日累计跌25.43%，现金流、库存与组合集中度压力共振。",
        "message_level": "追加回购4亿元 + 3日跌25.43%", "judgement": "利空",
        "action": "红色高位踩踏风险；看171.6/165/160，失165继续降集中度；收180/185只算止跌，190并守位才修复。",
        "risk_level": "红色", "risk_note": "回购提供现金承接，但无法抵消财报后交易层踩踏与组合集中度风险。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收109.40亿元同比+80.30%，归母38.43亿元同比+61.15%，扣非36.30亿元同比+53.32%；归母环比下降约19.1%。前三季度营收318.50亿元同比+92.97%，归母113.72亿元同比+79.74%，扣非111.40亿元同比+76.79%，经营现金流14.64亿元同比-68.42%。Q3非经常性损益净额约2.13亿元，主要含金融资产公允价值/处置收益。存货较年初+140.70%、应收账款+68.72%。驱动为AI算力投资与800G/1.6T交付，公司称Q4产能产量将大幅增长。未取得可验证Q3单季一致预期，分类为无可靠预期。",
    },
    "688008": {
        "bull": "Q3经营、Q4订单与已实施约2亿元新回购仍构成公司层支撑。",
        "bear": "11月3日放量跌8.85%至150.01、低148.61，失159/157.7/155；首日修复失败，回购未转化为趋势承接。",
        "message_level": "修复失败 + 失150", "judgement": "利空",
        "action": "红色强防守；看148.6/145/140，失145减风险；收155/159只算止跌，164.1并守位才修复。",
        "risk_level": "红色", "risk_note": "经营层强但财报后价格确认失败，交易时点继续下调。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收20.79亿元同比+45.97%，归母12.40亿元同比+161.98%，扣非10.05亿元同比+167.21%，经营层互连芯片收入20.47亿元同比+49.3%、毛利率68.4%；前三季度营收54.14亿元同比+33.44%，归母32.37亿元同比+98.32%，扣非23.27亿元同比+58.60%，经营现金流28.98亿元同比+81.07%。前三季度投资收益及公允价值变动合计9.04亿元、汇兑损失2.38亿元；Q4互连芯片在手订单25.0亿至27.9亿元。正式数落在公司此前12亿至13亿元预告区间，但未取得可验证Q3市场一致预期，分类为无可靠预期。",
    },
    "688017": {
        "bull": "Q3超预期与具身智能业务增长逻辑未变；11月3日低259仍守253风险线。",
        "bear": "跌3.63%至259.04、失260/268，首日修复未获确认；现金流弱、高估值与机器人退潮继续共振。",
        "message_level": "守253 + 失260/268", "judgement": "利空",
        "action": "红色高位踩踏风险；看259/253/245，失253减风险；收268只算止跌，275并守位才修复。",
        "risk_level": "红色", "risk_note": "业绩超预期但估值、现金流与交易层踩踏三项共振，禁止追财报。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-30晚披露正式Q3报告：单季营收2.42亿元同比+56.10%，归母5197.21万元同比+29.12%，扣非约4684万元同比+39.94%；前三季度营收5.91亿元同比+45.30%，归母1.22亿元同比+30.33%，扣非1.05亿元同比+38.24%，经营现金流同比-164.68%。驱动为工业机器人份额提升、具身智能业务规模扩大、效率提升与产能扩张。国金证券2026-10-31覆盖报告标题明确评价Q3超预期并维持买入，分类为超预期；但现金流与高估值风险需单列。",
    },
    "688012": {
        "bull": "Q3扣非同比+43.77%、国产替代平台化逻辑与隔夜SOXX反弹提供公司/外围缓冲。",
        "bear": "11月3日跌4.98%至205.80、低200.33，失210/204并未收218；经营现金流为负与非经常收益放大风险未消。",
        "message_level": "失204 + 低200.33", "judgement": "利空",
        "action": "红色强防守；看200.3/195/190，失195继续减风险；收210/218只算止跌，222并守位才修复。",
        "risk_level": "红色", "risk_note": "核心经营改善但归母受投资收益放大，交易层尚未确认。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-30披露正式Q3报告：单季营收36.35亿元同比+17.18%，归母13.09亿元同比+159.02%，扣非5.00亿元同比+43.77%，经营现金流-7.90亿元；前三季度营收103.26亿元同比+28.08%，归母41.34亿元同比+241.31%，扣非16.23亿元同比+83.01%，经营现金流-1.05亿元。Q3非经常性损益约8.08亿元、前三季度约25.11亿元，主要来自股权投资公允价值/投资收益及出售拓荆科技股份；前三季度研发支出32.22亿元，占收入31.20%。未取得可验证Q3单季一致预期，分类为无可靠预期，不把归母高增直接判为超预期。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "11月3日跌7.11%至35.66、低35.27，失36.75/36；Q3增收不增利、前三季度归母下降与存货+154.95%继续压制。",
        "message_level": "修复失败 + 失36", "judgement": "利空",
        "action": "红色强防守；看35.3/34/32，失34继续减风险；收36/37.8只算止跌，40.6并守位才修复。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "11月3日再涨0.45%至361.00，完成第二日守350并首次收361；累计回购53.60亿元与注销式回购提供支撑。",
        "bear": "盘中高370.40后回落，Q3不及LSEG预期与经营现金流下降未变。",
        "message_level": "二日守350 + 首收361", "judgement": "利多",
        "action": "橙色修复观察；看357/350/342，失350降风险；收365/370并守位才进一步上调。",
        "risk_level": "橙色", "risk_note": "完成第二日守位，个股风险由红降橙；基本面预期差仍需约束。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "11月3日H股微涨至99.55、连续第二日守98.9，盘中高101.60。",
        "bear": "收盘仍未站100，隔夜BABA ADR跌1.12%；战略催化尚未形成利润确认。",
        "message_level": "二日守98.9 + 100未复", "judgement": "中性",
        "action": "橙色修复观察；看98.9/97/95，失97降风险；收100/103.3并守位才上调。",
        "risk_level": "橙色", "risk_note": "完成第二日守位，个股风险由红降橙；尚未突破100。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "Q3略低于预期；11月3日跌6.56%至76.05、低75.30，失80/77.1，首日修复失败。",
        "message_level": "修复失败 + 失77.1", "judgement": "利空",
        "action": "红色强防守；看75.3/72/70，失72减风险；收77.1/80只算止跌，82.7并守位才修复。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "不及预期",
        "earnings_note": "2026-10-27披露正式Q3报告：单季营收22.08亿元同比+1.57%、环比约-13%，归母2.73亿元同比+1.15%、环比约-7%，扣非2.88亿元同比+7.61%、环比约+1%；前三季度营收67.21亿元同比+3.93%，归母8.34亿元同比+4.74%，扣非8.18亿元同比+2.57%，经营现金流9.49亿元同比+6.53%。申万宏源2026-10-29覆盖报告称业绩略低于预期并下调盈利预测，压力来自LNG板材交付节奏、面板光阻剂需求及汇兑损失；因此分类为不及预期。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "正式Q3营收4.18亿元同比+37.19%、归母1.11亿元同比+36.57%、扣非1.03亿元同比+37.16%；申万宏源评价超预期，高端粉体放量并上调盈利预测。",
        "bear": "11月3日跌8.79%至72.60、低72.00，失77.8/75；Q3超预期仍未稳价，可转债、扩产融资与科技退潮共振。",
        "message_level": "Q3超预期 + 失75", "judgement": "利空",
        "action": "红色高位踩踏风险；看72/70/68，失70减风险；收75/77.8只算止跌，80并守位才修复。",
        "risk_level": "红色", "risk_note": "业绩层超预期但交易层修复失败，不能用高增长替代风险纪律。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-28披露正式Q3报告：单季营收4.18亿元同比+37.19%、环比约+25%，归母1.11亿元同比+36.57%、环比约+44%，扣非1.03亿元同比+37.16%、环比约+48%；前三季度营收10.47亿元同比+27.12%，归母2.60亿元同比+18.24%，扣非2.36亿元同比+16.57%，经营现金流1.36亿元同比+2.91%。Q3非经常性损益约788万元，主要含政府补助和金融资产公允价值/处置收益。驱动为Lowα、液相法球形二氧化硅及亚微米球硅等高阶产品销量增加。申万宏源2026-10-29覆盖报告明确评价超预期并上调2026-2028盈利预测，分类为超预期。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "11月3日盘中高86.00，商业航天相对强势仍有承接。",
        "bear": "收盘跌1.94%至79.53并回到79.5临界；Q3归母同比-44.43%、减值、可交换债与参数缺失未消。",
        "message_level": "高86回落 + 79.5临界", "judgement": "利空",
        "action": "红色高位踩踏风险；看79.1/76.2/75.6，失79减风险；收82.5只算止跌，86并守位才修复。",
        "risk_level": "红色", "risk_note": "基本面未支撑题材强度、可交换债筹码与高位回落三项共振。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-23披露正式Q3报告：单季营收0.99亿元同比-5.72%，归母1874.21万元同比-44.43%，扣非1772.44万元同比-46.69%；前三季度营收3.15亿元同比+2.86%，归母9503.74万元同比+5.18%。公司另计提前三季度资产减值准备1497.57万元，将等额减少利润总额、对经营现金流无影响。未取得可靠Q3一致预期，分类为无可靠预期；交易层商业航天强势不改变业绩层放缓。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌9.46%至173.36、3日跌25.43%", "回购未止跌，红色集中度约束完全有效。"),
    "688008": ("完全有效", "跌8.85%至150.01、失159/155", "首日修复失败，红色约束有效。"),
    "688017": ("完全有效", "跌3.63%至259.04、失260/268", "首日修复未确认，高位踩踏约束有效。"),
    "688012": ("完全有效", "跌4.98%至205.80、失210/204", "连续破位，红色约束有效。"),
    "002837": ("完全有效", "跌7.11%至35.66、失36.75/36", "修复失败，增收不增利风险验证。"),
    "03750.HK": ("修复有效需上调观察", "涨0.45%至361.00、二日守350", "完成第二日确认，个股风险降橙。"),
    "09988.HK": ("修复有效需上调观察", "微涨至99.55、二日守98.9", "完成第二日守位，个股风险降橙。"),
    "002409": ("完全有效", "跌6.56%至76.05、失80/77.1", "首日修复失败，红色约束有效。"),
    "688300": ("完全有效", "跌8.79%至72.60、失77.8/75", "Q3超预期未稳价，高位踩踏约束有效。"),
    "001270": ("完全有效", "跌1.94%至79.53、高86回落", "高位分化与不追约束有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-04",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 8,
    "triggers": [
        "沪指-0.82%、深成指-1.21%、创业板-2.73%、科创50约-3.81%，约2108股上涨、3309股下跌，首日宽度修复次日失败。",
        "涨停约52、封板率约56.5%、连板晋级率约12.1%，CPO-8.51%、HBM-6.05%，科技主线退潮与高位分化重新确认。",
        "港股恒科+0.74%、隔夜QQQ+0.63%、SOXX+2.50%仅提供外部缓冲；A股科技核心与持仓弱势仍占主导。",
    ],
    "opening_scenario": "隔夜半导体反弹可能带来低开修复，但A股CPO/HBM和持仓核心已再次破位；若上涨家数与核心不能同步修复，反抽仍优先减风险。",
    "state": "S1 冰点观察",
    "radar_score": 38.8,
    "MSS": 40,
    "MBS": 28,
    "FRS": 30,
    "TES": 30,
    "ET": 12,
    "position_ceiling": "S1标准总仓20%-35%；因组合高科技同变量暴露和多只再破位，组合覆盖上限继续15%，新增仓位与题材交易均为0。",
    "allowed": "只观察宁德/阿里二日守位与隔夜科技反弹传导；弱反抽降低新易盛、澜起、联瑞等暴露。",
    "blocked": "禁止抄底、摊低、追隔夜半导体映射或逆总阀门交易回购/财报利好。",
    "focus": "09:45观察上涨家数能否重回2500、CPO/HBM承接、新易盛171.6/165、澜起148.6/145、绿的259/253。",
    "downgrade": "若上涨家数低于1500、科技核心继续创新低，或新易盛失165、澜起失145、联瑞失70，则退回S0。升级需下一完整交易日宽度与核心共同守位。",
    "v231_link": "新易盛追加回购仍未止跌，澜起回购首日修复失败；宁德与阿里完成二日守位。经营分与交易时点继续分离，不授予加仓权限。",
}


def trim_market(market: dict) -> None:
    previous.previous.previous.previous.previous.previous.previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-03"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-03":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-03")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-03", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-03完整A股与港股收盘验证上一版06:00判断；方向与红色仓位约束分开评价。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 8, "useful_but_conservative": 0,
            "repair_upgrade": 2, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 2,
            "main_read": "11月2日首日修复在11月3日未获确认：新易盛、澜起、绿的、中微、英维克、雅克、联瑞、铖昌八只约束完全有效；仅宁德与阿里完成第二日守位，分类为修复有效需上调观察。",
        },
        "items": items,
        "logic_corrections": [
            "下跌家数回升至约3309、涨停与晋级率显著回落，宏观状态由S2降至S1冰点观察。",
            "新易盛追加回购约4亿元仍跌9.46%，回购只能提供边际承接，不能替代趋势确认。",
            "澜起回购首日修复次日跌8.85%，经营强与交易弱的背离继续扩大。",
            "宁德收361、阿里二日守98.9，符合下一交易日守位规则，可将个股风险由红降橙。",
            "隔夜SOXX反弹只提供缓冲，不能自动修复A股CPO/HBM内部筹码结构。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-03完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指-0.82%、深成指-1.21%、创业板-2.73%、科创50约-3.81%，成交约1.72万亿元；约2108股上涨、3309股下跌，涨停约52、封板率约56.5%、连板晋级率约12.1%。CPO-8.51%、HBM-6.05%。",
        "港股：恒指+0.57%至23525.97、恒生科技+0.74%至3867.73、国企指数+0.47%；宁德-H +0.45%至361.00，阿里-W +0.10%至99.55。",
        "外围：美东11月3日SPY +0.30%、QQQ +0.63%、SOXX +2.50%、NVDA +2.24%；DIA -0.44%、IEF -0.37%、UUP +0.17%，BABA ADR -1.12%。外部半导体反弹提供缓冲。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "新易盛：11月2日至3日继续回购213.91万股、耗资约4亿元，价格172.05至199.75元；叠加首次回购约2亿元，已实施约6亿元，但11月3日仍跌9.46%，回购未止跌。",
        "澜起科技：Q3经营、Q4订单与已实施约2亿元新回购均强，但11月3日跌8.85%并失155，首日修复失败。",
        "绿的谐波正式Q3：单季营收2.42亿元同比+56.10%，归母5197万元同比+29.12%，扣非约4684万元同比+39.94%；前三季度经营现金流同比-164.68%。国金证券2026-10-31评价Q3超预期，分类超预期；高估值与现金流风险单列。",
        "中微公司正式Q3：单季营收36.35亿元同比+17.18%，归母13.09亿元同比+159.02%，扣非5.00亿元同比+43.77%，经营现金流-7.90亿元；Q3非经常性损益约8.08亿元。未取得可靠单季一致预期，分类无可靠预期。",
        "联瑞新材正式Q3：单季营收4.18亿元同比+37.19%，归母1.11亿元同比+36.57%，扣非1.03亿元同比+37.16%；申万宏源2026-10-29覆盖报告明确评价超预期并上调盈利预测，但股价次日跌7.82%，业绩与交易分开处理。",
        "雅克科技正式Q3：单季营收22.08亿元同比+1.57%，归母2.73亿元同比+1.15%，扣非2.88亿元同比+7.61%；申万宏源2026-10-29覆盖报告称略低于预期并下调盈利预测，分类为不及预期。",
        "铖昌科技正式Q3：单季营收0.99亿元同比-5.72%，归母1874万元同比-44.43%，扣非1772万元同比-46.69%；10月30日失82.5，高位题材分化确认。",
        "宁德时代：11月3日收361并完成第二日守350，累计回购53.60亿元；个股风险从红降橙，但Q3不及预期结论不变。阿里H股连续第二日守98.9但未收100，个股风险同样降橙。",
        "公司公告复核：除新易盛回购进展、绿的Q3报告股东数据更正外，其余持仓截至06:00未见改变经营事实的重大新增公告；绿的更正不涉及核心财务数据。",
        "宏观雷达：MSS40、MBS28、FRS30、TES30、ET12，RadarScore38.8；首日修复未获确认，降至S1冰点观察，06:00预警红色。",
        "高位筛查：新易盛3日累计跌25.43%不是涨幅触发，但回购未止跌、板块踩踏与集中度风险共振；绿的、联瑞、铖昌旧高位踩踏标签未解除。宁德/阿里仅完成二日守位，不代表组合风险解除。",
        "财报源：新易盛、澜起、绿的、中微、英维克、宁德、雅克、联瑞、铖昌正式Q3；阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12689776&stockid=300502 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12687990&stockid=688017 ; https://www.dabanke.com/?_canonical_recover=20260920 ; https://finance.eastmoney.com/a/202611033920293950.html ; https://finance.yahoo.com/quote/SOXX/ ; https://finance.yahoo.com/quote/BABA/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-04 06:00；使用11月3日A股/港股完整收盘、收盘后公告与美东11月3日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S1冰点观察。11月2日强修复未获次日确认：约3309股下跌，CPO/HBM大跌，涨停与晋级率显著回落；隔夜SOXX反弹只作缓冲。组合覆盖上限15%、新增仓位与题材交易为0；弱反抽优先降低科技同变量与集中暴露。",
        "top_attention": [
            {"name": "新易盛", "reason": "追加回购约4亿元仍跌9.46%，3日累计跌25.43%，组合集中度最高；回购未形成趋势承接。"},
            {"name": "澜起科技", "reason": "经营、Q4订单和回购均强，但11月3日放量跌8.85%并失150；公司层与交易层背离扩大。"},
            {"name": "宁德时代-H", "reason": "完成第二日守350并收361、风险由红降橙；但高370.4回落且Q3不及预期结论未变，需继续观察。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-04", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>11月2日强修复未获次日确认，组合总阀门继续红色。</b>新易盛追加回购约4亿元仍大跌、澜起回购首日修复失败，联瑞跌破75；新易盛、绿的、联瑞、铖昌的<b>高位踩踏风险</b>未解除。宁德与阿里完成二日守位仅降至橙色，不能带动组合解除防守。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限15%、新增仓位与题材交易为0；隔夜半导体反弹只作观察。</li><li>新易盛看171.6/165/160，澜起看148.6/145/140；失位继续降集中度。</li><li>绿的看259/253，中微看200.3/195，英维克看35.3/34；弱反抽优先减风险。</li><li>宁德看357/350，阿里看98.9/97；二日守位后若失位，风险立即恢复红色。</li><li>联瑞看72/70，铖昌看79.1/76.2，雅克看75.3/72；未收上层关键位前维持红色。</li></ul></section>',
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
