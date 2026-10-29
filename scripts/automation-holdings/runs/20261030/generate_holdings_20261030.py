from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261029 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261030.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "正式Q3营收109.40亿元同比+80.30%、归母38.43亿元同比+61.15%、扣非36.30亿元同比+53.32%；公司称Q4产能产量将大幅增长，并已为Q4及明年交付备货。",
        "bear": "10月29日财报披露前跌11.06%至228.40并失243.3/236.1；Q3归母环比下降约19.1%，前三季度经营现金流同比-68.42%、存货较年初+140.70%、应收账款+68.72%。",
        "message_level": "Q3高增 + 现金流/库存压力 + 失236.1", "judgement": "中性",
        "action": "红色强防守；看228/220/210，失220继续降集中度；收236/243只算止跌，250并守位才转修复。",
        "risk_level": "红色", "risk_note": "业绩层高增但环比、现金流与交易层承压；财报在收盘后披露，不能用当日跌幅倒推财报结论。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收109.40亿元同比+80.30%，归母38.43亿元同比+61.15%，扣非36.30亿元同比+53.32%；归母环比下降约19.1%。前三季度营收318.50亿元同比+92.97%，归母113.72亿元同比+79.74%，扣非111.40亿元同比+76.79%，经营现金流14.64亿元同比-68.42%。Q3非经常性损益净额约2.13亿元，主要含金融资产公允价值/处置收益。存货较年初+140.70%、应收账款+68.72%。驱动为AI算力投资与800G/1.6T交付，公司称Q4产能产量将大幅增长。未取得可验证Q3单季一致预期，分类为无可靠预期。",
    },
    "688008": {
        "bull": "正式Q3营收20.79亿元同比+45.97%、归母12.40亿元同比+161.98%、扣非10.05亿元同比+167.21%，互连芯片毛利率68.4%；Q4在手订单25.0亿至27.9亿元。新3亿至5亿元回购获批，价格上限280元。",
        "bear": "10月29日财报披露前跌4.53%至166.79，失171/168；前三季度投资收益及公允价值变动9.04亿元、汇兑损失2.38亿元，需区分核心经营与非经常项目。",
        "message_level": "正式Q3强劲 + Q4订单 + 回购获批", "judgement": "利多",
        "action": "红色修复观察；看164.4/164.1/160，失164.1减风险；收168/171只算止跌，175并守位才上调。",
        "risk_level": "红色", "risk_note": "经营层强、交易层弱；财报与回购均在收盘后披露，等待价格确认。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-29晚披露正式Q3报告：单季营收20.79亿元同比+45.97%，归母12.40亿元同比+161.98%，扣非10.05亿元同比+167.21%，经营层互连芯片收入20.47亿元同比+49.3%、毛利率68.4%；前三季度营收54.14亿元同比+33.44%，归母32.37亿元同比+98.32%，扣非23.27亿元同比+58.60%，经营现金流28.98亿元同比+81.07%。前三季度投资收益及公允价值变动合计9.04亿元、汇兑损失2.38亿元；Q4互连芯片在手订单25.0亿至27.9亿元。正式数落在公司此前12亿至13亿元预告区间，但未取得可验证Q3市场一致预期，分类为无可靠预期。",
    },
    "688017": {
        "bull": "机器人产业长期催化与精密传动龙头逻辑未变；10月29日低278.88仍守275。",
        "bear": "跌3.76%至281.00并失283，盘中高299.69后回落；机器人与高位题材随大盘退潮，正式Q3尚未披露。",
        "message_level": "失283 + 高299.69回落", "judgement": "利空",
        "action": "橙色、不加仓；看278.9/275/268，失275减风险；收283/293只算修复，300并守位才转强。",
        "risk_level": "橙色", "risk_note": "高波动主题与市场退潮共振，维持橙色不追纪律。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变。",
        "bear": "10月29日跌5.42%至227.00、低222.22，失232/230并弱于科创50；半导体设备交易层继续破位，正式Q3尚未披露。",
        "message_level": "失230 + 低222.22", "judgement": "利空",
        "action": "红色强防守；看222.2/218/210，失218继续减风险；收230/236只算止跌，245并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "Q3增收不增利、前三季度归母-7.62%与存货较年初+154.95%的压力未变；10月29日跌5.69%至40.97，失42.3/42并逼近40.6。",
        "message_level": "修复失败 + 40.6临界", "judgement": "利空",
        "action": "红色；看40.9/40.6/38，失40.6继续减风险；收42/42.3只算止跌，44.5并守位才转修复。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "全固态电池2027年小批量生产属于远期技术期权；动力与储能长期需求逻辑未变。",
        "bear": "10月29日跌2.19%至338.80、低336.20并失342/338，恒生科技跌2.84%；Q3不及LSEG预期与财报后回撤仍未修复。",
        "message_level": "失338 + 港股科技新低", "judgement": "利空",
        "action": "红色强防守；看336.2/330/326，失336继续减风险；收342/350只算止跌，361并守位才转修复。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "美国法院暂缓执行部分涉军名单相关限制仍构成情绪缓和，但不等于移出名单。",
        "bear": "10月29日H股跌2.83%至96.10、失97并逼近96，隔夜BABA ADR再跌1.45%；DRAM长约仍是洽谈报道，未形成利润确认。",
        "message_level": "H股失97 + ADR再跌", "judgement": "利空",
        "action": "红色；看96/95/90，失95减风险；收98.9/100只算止跌，103.3并守位才转修复。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "正式Q3营收22.08亿元同比仅+1.57%、归母2.73亿元同比+1.15%，申万宏源评价略低于预期；10月29日跌5.49%至82.78并失84.5。",
        "message_level": "Q3略低于预期 + 失84.5", "judgement": "利空",
        "action": "红色；看82.7/80/78，失82.7继续减风险；收84.5/86只算止跌，88并守位才转修复。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "不及预期",
        "earnings_note": "2026-10-27披露正式Q3报告：单季营收22.08亿元同比+1.57%、环比约-13%，归母2.73亿元同比+1.15%、环比约-7%，扣非2.88亿元同比+7.61%、环比约+1%；前三季度营收67.21亿元同比+3.93%，归母8.34亿元同比+4.74%，扣非8.18亿元同比+2.57%，经营现金流9.49亿元同比+6.53%。申万宏源2026-10-29覆盖报告称业绩略低于预期并下调盈利预测，压力来自LNG板材交付节奏、面板光阻剂需求及汇兑损失；因此分类为不及预期。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "10月27日晚公告拟在四川投建10亿元半导体封装用高性能粉体项目；一期约6亿元，规划年产3万吨，方向贴合先进封装材料需求。",
        "bull": "正式Q3营收4.18亿元同比+37.19%、归母1.11亿元同比+36.57%、扣非1.03亿元同比+37.16%；申万宏源评价超预期，高端粉体放量并上调盈利预测。",
        "bear": "10月29日跌7.82%至84.20，失90/86.5，扩产催化次日大幅回吐；项目审批、融资、投产周期和6.94694亿元转债筹码压力仍在。",
        "message_level": "Q3超预期 + 催化次日回吐", "judgement": "中性",
        "action": "红色高位踩踏风险；看84/83.67/80，失83.67减风险；收86.5/90只算止跌，94并守位才转修复。",
        "risk_level": "红色", "risk_note": "业绩层超预期但交易层修复失败，不能用高增长替代风险纪律。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "超预期",
        "earnings_note": "2026-10-28披露正式Q3报告：单季营收4.18亿元同比+37.19%、环比约+25%，归母1.11亿元同比+36.57%、环比约+44%，扣非1.03亿元同比+37.16%、环比约+48%；前三季度营收10.47亿元同比+27.12%，归母2.60亿元同比+18.24%，扣非2.36亿元同比+16.57%，经营现金流1.36亿元同比+2.91%。Q3非经常性损益约788万元，主要含政府补助和金融资产公允价值/处置收益。驱动为Lowα、液相法球形二氧化硅及亚微米球硅等高阶产品销量增加。申万宏源2026-10-29覆盖报告明确评价超预期并上调2026-2028盈利预测，分类为超预期。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月29日逆势再涨6.17%至84.94，连续第二日守住75.6并收上82.5，商业航天/卫星通信成为当日逆势主线。",
        "bear": "正式Q3营收0.99亿元同比-5.72%、归母1874万元同比-44.43%、扣非1772万元同比-46.69%；减值、可交换债与股数/成本缺失仍在。",
        "message_level": "二日强修复 + Q3利润下滑44%", "judgement": "中性",
        "action": "橙色、不加仓；看82.5/80/75.6，失80减风险；收88并守位才延续强势，严禁追高。",
        "risk_level": "橙色", "risk_note": "交易层强、业绩层弱；纯高波动小市值连续大涨，维持橙色不追。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-23披露正式Q3报告：单季营收0.99亿元同比-5.72%，归母1874.21万元同比-44.43%，扣非1772.44万元同比-46.69%；前三季度营收3.15亿元同比+2.86%，归母9503.74万元同比+5.18%。公司另计提前三季度资产减值准备1497.57万元，将等额减少利润总额、对经营现金流无影响。未取得可靠Q3一致预期，分类为无可靠预期；交易层商业航天强势不改变业绩层放缓。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌11.06%至228.40、失243.3/236.1", "首日修复未获确认，红色集中度约束完全有效。"),
    "688008": ("完全有效", "跌4.53%至166.79、失171/168", "修复确认失败，财报披露前红色约束有效。"),
    "688017": ("完全有效", "跌3.76%至281.00、失283", "橙色不追和失283减风险约束有效。"),
    "688012": ("完全有效", "跌5.42%至227.00、低222.22", "连续破位，红色约束有效。"),
    "002837": ("完全有效", "跌5.69%至40.97、失42/42.3", "首日修复失败，增收不增利风险继续验证。"),
    "03750.HK": ("完全有效", "跌2.19%至338.80、盘中失338", "财报后红色观察与失位减风险约束有效。"),
    "09988.HK": ("完全有效", "跌2.83%至96.10、失97", "诉讼情绪利好未稳价，红色约束有效。"),
    "002409": ("完全有效", "跌5.49%至82.78、失84.5", "弱于指数且风险线触发，红色约束有效。"),
    "688300": ("完全有效", "跌7.82%至84.20、失90/86.5", "扩产催化次日回吐，红色高位踩踏约束有效。"),
    "001270": ("修复有效需上调观察", "涨6.17%至84.94、连续守82.5", "完成第二日守位，但业绩弱且高波动，维持橙色观察。"),
}


MACRO_RADAR = {
    "date": "2026-10-30",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 9,
    "triggers": [
        "沪指-0.82%、深成指-2.92%、创业板-4.45%、科创50-4.27%，约781股上涨、4728股下跌，10月28日宽度修复次日即失败。",
        "成交约1.56万亿元、涨停约39、跌停约42、炸板25，算力硬件/半导体/机器人集体退潮，仅商业航天与红利逆势。",
        "港股恒生科技-2.84%创年内新低；隔夜QQQ-1.41%、SOXX-1.55%、NVDA-0.78%，A/H/美科技形成共振压力。",
    ],
    "opening_scenario": "新易盛、澜起财报与回购可能带来局部高开，但A/H/美科技共振走弱；若高开后宽度不足1500或核心无法收复昨日失位，优先视为降低集中暴露窗口。",
    "state": "S0 绝对防守",
    "radar_score": 22.4,
    "MSS": 45,
    "MBS": 8,
    "FRS": 12,
    "TES": 18,
    "ET": 6,
    "position_ceiling": "S0总仓原则0%-20%；本组合科技同变量暴露高，组合覆盖上限20%，新增仓位与题材交易均为0。",
    "allowed": "只处理风险和观察财报后价格反馈；商业航天强势仅允许持有观察，不追高。",
    "blocked": "禁止抄底科技成长、追铖昌/商业航天后排、摊低新易盛/中微/联瑞或把财报高增直接当买点。",
    "focus": "09:45观察上涨家数、科创50与恒生科技映射、新易盛228/236、澜起164.1/168、联瑞83.67、铖昌82.5。",
    "downgrade": "已处S0；若上涨家数继续低于1500、科技核心高开低走，或新易盛失220、澜起失164.1、联瑞失83.67，则保持极端防守。升级需至少下一完整交易日宽度与核心同步修复。",
    "v231_link": "新易盛、澜起财报经营层强但交易层弱；联瑞Q3超预期仍催化回吐，雅克Q3略低预期。V2.3.1经营分与交易时点必须分开，禁止财报冲动交易。",
}


def trim_market(market: dict) -> None:
    previous.previous.previous.previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-29"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-29":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-29")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-29", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-29完整A股与港股收盘验证上一版06:00判断；方向与红色仓位约束分开评价。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 9, "useful_but_conservative": 0,
            "repair_upgrade": 1, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 1,
            "main_read": "10月28日首日修复在10月29日全面失败：九只持仓约束完全有效，新易盛、澜起、绿的、中微、英维克、宁德、阿里、雅克、联瑞均失去关键位；仅铖昌逆势二日守位，分类为修复有效需上调观察。",
        },
        "items": items,
        "logic_corrections": [
            "约4728股下跌、创业板-4.45%、科创50-4.27%，10月28日S2首日修复次日失败，宏观状态退回S0。",
            "新易盛、澜起财报披露发生在10月29日收盘后；当日下跌只能验证交易层，不能倒推正式财报不及预期。",
            "联瑞正式Q3获券商评价超预期，但扩产催化次日跌7.82%，再次说明业绩层与交易层必须分开。",
            "铖昌二日守82.5说明商业航天相对强，但Q3利润同比下降44.43%，只能上调交易观察、不能提高基本面分。",
            "A/H/美科技共振走弱，红色总阀门继续作为仓位和加仓约束，不等于预测所有持仓同步下跌。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-10-29完整收盘，澜起继续使用未复权day序列。",
        "A股：沪指-0.82%、深成指-2.92%、创业板-4.45%、科创50-4.27%，成交约1.56万亿元；约781股上涨、4728股下跌，涨停约39、跌停约42、炸板25，算力硬件/半导体/机器人集体退潮。",
        "港股：恒指-0.59%至22958.65、恒生科技-2.84%至3744.14并创年内新低、国企指数-0.46%；宁德-H -2.19%至338.80，阿里-W -2.83%至96.10。",
        "外围：美东10月29日SPY -0.35%、DIA -0.36%、QQQ -1.41%、SOXX -1.55%；NVDA -0.78%、IEF +0.43%、UUP -0.10%，BABA ADR -1.45%。海外科技走弱与A/H成长退潮共振。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "新易盛正式Q3：单季营收109.40亿元同比+80.30%，归母38.43亿元同比+61.15%，扣非36.30亿元同比+53.32%；归母环比约-19.1%。前三季度经营现金流同比-68.42%、存货较年初+140.70%、应收账款+68.72%。未取得可靠Q3单季一致预期，分类为无可靠预期。",
        "澜起科技正式Q3：单季营收20.79亿元同比+45.97%，归母12.40亿元同比+161.98%，扣非10.05亿元同比+167.21%；互连芯片毛利率68.4%，Q4在手订单25.0亿至27.9亿元。新3亿至5亿元回购获批、上限280元；未取得可靠Q3市场一致预期。",
        "联瑞新材正式Q3：单季营收4.18亿元同比+37.19%，归母1.11亿元同比+36.57%，扣非1.03亿元同比+37.16%；申万宏源2026-10-29覆盖报告明确评价超预期并上调盈利预测，但股价次日跌7.82%，业绩与交易分开处理。",
        "雅克科技正式Q3：单季营收22.08亿元同比+1.57%，归母2.73亿元同比+1.15%，扣非2.88亿元同比+7.61%；申万宏源2026-10-29覆盖报告称略低于预期并下调盈利预测，分类为不及预期。",
        "铖昌科技正式Q3：单季营收0.99亿元同比-5.72%，归母1874万元同比-44.43%，扣非1772万元同比-46.69%；交易层受商业航天主线推动连续上涨，不能据此上调基本面分。",
        "公司公告复核：除上述财报、澜起回购与新易盛投资者交流外，其余持仓截至06:00未见改变经营事实的重大新增公告。",
        "宏观雷达：MSS45、MBS8、FRS12、TES18、ET6，RadarScore22.4；S2首日修复失败并退回S0绝对防守，06:00预警红色。",
        "高位筛查：无持仓触发新的3日+25%或5日+35%涨幅阈值。铖昌连续两日上涨且Q3利润下滑，满足高波动题材与基本面未兑现条件，维持橙色不追；联瑞失90/86.5后高位踩踏旧标签恢复红色处理。",
        "财报源：新易盛、澜起、英维克、宁德、雅克、联瑞、铖昌正式Q3；绿的、中微正式半年报；阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12679020&stockid=300502 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12678366&stockid=688008 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12678362&stockid=688008 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12666965&stockid=688300 ; https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12664993&stockid=002409 ; https://www.nbd.com.cn/articles/2026-10-29/4627082.html ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-30 06:00；使用10月29日A股/港股完整收盘、收盘后公告与美东10月29日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S0绝对防守。10月28日首日宽度修复次日失败：约4728股下跌、双创重挫，恒生科技创年内新低，隔夜QQQ/SOXX继续下跌。九只持仓失去关键位，仅铖昌逆势。组合上限20%、新增仓位与题材交易为0；财报高增只作价格反馈观察。",
        "top_attention": [
            {"name": "新易盛", "reason": "正式Q3同比高增但归母环比约-19.1%、现金流与库存承压；收盘前跌11.06%失236.1且组合集中度最高，财报后先看价格反馈。"},
            {"name": "澜起科技", "reason": "正式Q3与Q4订单强、3亿至5亿元回购获批，但收盘前失171/168；经营层利多必须等待交易层确认。"},
            {"name": "联瑞新材", "reason": "Q3获券商评价超预期，但扩产催化次日跌7.82%并失90/86.5；业绩层与交易层明显背离，高位踩踏风险恢复红色。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-30", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色S0绝对防守：前一日修复次日失败，A/H/美科技共振走弱。</b>新易盛失236.1、中微失230、宁德盘中失338、雅克失84.5、联瑞失90/86.5。财报高增不等于可追：新易盛、澜起、联瑞都必须等待价格确认。联瑞的<b>高位踩踏风险</b>恢复红色；铖昌虽逆势二日上涨，但Q3利润同比下降44.43%，维持橙色不追。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合上限20%、新增仓位与题材交易为0；财报利多高开只观察承接，不追。</li><li>新易盛看228/220/210，澜起看164.4/164.1/160；失位继续减集中度。</li><li>联瑞看84/83.67/80，失83.67减风险；铖昌看82.5/80/75.6，商业航天高开不追。</li><li>中微看222/218，英维克看40.9/40.6，雅克看82.7/80；弱反抽优先减风险。</li><li>宁德未收342、阿里未收98.9前不得降低个股风险；任何单日反弹需下一交易日守位。</li></ul></section>',
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
