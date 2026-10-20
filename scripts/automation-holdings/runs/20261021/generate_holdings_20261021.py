from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261020 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261021.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "董事长8亿至10亿元回购提议仍构成公司层支撑，CPO长期需求逻辑未见新增否定。",
        "bear": "10月20日跌3.19%至298.17、盘中低294.66并触发295风险线；组合集中度最高，回购方案和实施仍未落地。",
        "message_level": "295风险线触发 + 集中度最高", "judgement": "利空",
        "action": "看294.7/290，失290继续降集中度；收303/308只算止跌，315/320并守位才转修复。",
        "risk_level": "红色", "risk_note": "295盘中失守验证筹码风险，回购提议不能替代价格确认。",
    },
    "688008": {
        "bull": "公司预计2026Q3营收约20.79亿元同比+46.0%，归母12亿至13亿元同比+153.6%至+174.7%，扣非9.5亿至10.5亿元同比+152.6%至+179.2%；DDR5高代际RCD占比提升、互连芯片毛利率预计68.0%至68.5%。",
        "bear": "业绩预告未经审计，未取得可靠单季一致预期，不能把高同比直接写成超预期；10月20日收169.27仍未站173.4。",
        "message_level": "Q3预增153.6%-174.7% + 预期差待证", "judgement": "利多",
        "action": "橙色事件观察，利多高开不追；看164/163，守170/171.1并收173.4后只转修复，180并次日守位再降风险。",
        "risk_level": "橙色", "risk_note": "经营数据强，但公告后价格尚未验证且单季一致预期缺失。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-21自愿披露Q3业绩预增：营收约20.79亿元，同比+46.0%、环比+10.9%；归母12亿至13亿元，同比+153.6%至+174.7%、环比+4.3%至+13.0%；扣非9.5亿至10.5亿元，同比+152.6%至+179.2%、环比+32.2%至+46.1%。驱动为DDR5接口及模组配套芯片放量、高代际RCD占比提升；预告未经审计。公开年度一致预期不能可靠替代Q3单季预期，故不硬判超预期。",
    },
    "688017": {
        "bull": "10月20日再涨7.09%至268.25并守住245/252/255，机器人主线扩散至百余只个股，修复获得第二日确认。",
        "bear": "两日累计涨约13.7%、盘中高275.33后回落；上涨主要来自行业风格，未见公司经营层新增披露，接近275/280压力。",
        "message_level": "两日修复确认 + 275压力", "judgement": "中性",
        "action": "个股降至橙色、禁止追高；看255/252/245，失252减风险；只有收275/280并守位才延续修复。",
        "risk_level": "橙色", "risk_note": "第二日守位允许降低个股风险，但连续题材上涨触发黄色高位关注。",
    },
    "688012": {
        "bull": "10月20日低269.80后回收至278.50、上涨0.44%；国产替代与先进封装布局未变。",
        "bear": "收盘仍未站280且盘中再创新低；前一日6%下跌后的弱反弹尚未形成修复。",
        "message_level": "269.8探底回收 + 280未复", "judgement": "中性",
        "action": "看269.8/268/265，失268继续减风险；收282/290只算止跌，300并守位才转修复。",
        "risk_level": "红色", "risk_note": "方向有所修复但关键位未收回，基本面与交易时点继续分开。",
    },
    "002837": {
        "bull": "10月20日小涨0.85%至44.84，股票期权长期考核与液冷需求逻辑未变。",
        "bear": "仍低于46.73元行权价，盘中低43.80；半年报利润同比下滑尚未修复，未见重大新增公司公告。",
        "message_level": "44.84弱反弹 + 行权价未复", "judgement": "中性",
        "action": "看43.8/43/42，失42继续减风险；收46.5/46.73只算止跌，48.8/50并守位才转修复。",
        "risk_level": "红色", "risk_note": "反弹未触发确认，激励目标不等于当前盈利兑现。",
    },
    "03750.HK": {
        "bull": "2026Q3营收1652.21亿元同比+58.58%，前三季度营收4421.37亿元同比+56.19%，规模扩张强；Q3扣非188.62亿元同比+14.86%。",
        "bear": "H股10月20日跌6.58%至411.80、低402.60；Q3归母212.46亿元同比仅+14.54%、环比-5.77%，LSEG SmartEstimate原预期利润增速约41.2%，收入增速实际58.58%亦略低于60.2%预期。前三季度经营现金流616.25亿元同比-23.60%，利润增速显著落后收入。",
        "message_level": "Q3不及LSEG预期 + H股跌6.58%", "judgement": "利空",
        "action": "红色强防守；看402.6/400/390，失400继续减风险；收420/430只算止跌，440/450并守位才转修复。禁止首日抄底。",
        "risk_level": "红色", "risk_note": "业绩层面收入高增但利润预期落空，交易层已先行破位。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "不及预期",
        "earnings_note": "2026-10-20正式Q3报告：单季营收1652.21亿元同比+58.58%，归母212.46亿元同比+14.54%，扣非188.62亿元同比+14.86%；前三季度营收4421.37亿元同比+56.19%，归母645.30亿元同比+31.60%，扣非578.76亿元同比+32.68%，经营现金流616.25亿元同比-23.60%。Q3非经常性损益净额约23.84亿元，主要含其他收益及金融资产公允价值/处置等。LSEG SmartEstimate显示市场预期Q3净利增速约41.2%、收入增速约60.2%，实际利润增速明显不及预期；业绩与交易均偏空。",
    },
    "09988.HK": {
        "bull": "速卖通双50%品牌增长目标、AI硬件扶持计划与玄铁E908A继续提供战略催化；隔夜BABA ADR约+0.07%。",
        "bear": "港股10月20日跌3.58%至104.90并失108/105，前一版修复确认失败；战略目标尚未形成新增利润。",
        "message_level": "108修复失败 + H股失105", "judgement": "利空",
        "action": "恢复红色纯防守；看104.5/102.6/100，失100继续减风险；收108只重新转修复，112并次日守位才降风险。",
        "risk_level": "红色", "risk_note": "复市即跌破修复位，战略催化不能覆盖交易失败。",
    },
    "002409": {
        "bull": "10月20日盘中高100.17后收97.25、上涨1.19%；半导体材料国产替代逻辑未变。",
        "bear": "收盘仍未站97.9/100，新业务仍处研发验证且尚未形成利润；未见重大新增公司公告。",
        "message_level": "盘中上探100 + 收盘未确认", "judgement": "中性",
        "action": "看95/92.7/90，失90继续减风险；收100只算止跌，101.9/105并守位才转修复。",
        "risk_level": "红色", "risk_note": "冲高未确认，战略投入不能替代利润和价格验证。",
    },
    "688300": {
        "bull": "10月20日上涨2.78%至103.22、盘中高104.50，接近104.623理论除权参考；260股与约190元参考成本不变。",
        "bear": "收盘仍未站104.6，6.94694亿元转债绝大部分未转；前一日盘中低94的筹码波动尚未消化。",
        "message_level": "接近104.6基准 + 转债压力", "judgement": "中性",
        "action": "看97.4/94/92，失94减风险；收104.6只算止跌，107.7并次日守位才转修复。",
        "risk_level": "红色", "risk_note": "回到理论基准前不降低风险，高位踩踏标签继续保留。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月20日上涨2.57%至84.55并首次收上83，连续三日守住80.8，修复继续。",
        "bear": "仍未收85，控股股东可交换债形成潜在供给，股数与成本继续缺失。",
        "message_level": "首次收83 + 85待确认", "judgement": "中性",
        "action": "红色修复观察；看83/81/80.8，今日守83并收85/87才考虑橙色，失80.8恢复纯防守。",
        "risk_level": "红色", "risk_note": "首日收回83只升级观察，仓位参数缺失继续限制风险判断。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌3.19%至298.17、盘中低294.66触发295线", "集中度防守强验证，下移看294.7/290。"),
    "688008": ("方向偏保守但操作有效", "涨2.43%至169.27、高171.11但未收170/173.4", "不追事件利多有效；新业绩预告需等待价格确认。"),
    "688017": ("修复有效需上调观察", "再涨7.09%至268.25，第二日守245并收252/255上方", "修复获次日确认，个股风险由红降橙；连续上涨不追。"),
    "688012": ("方向偏保守但操作有效", "涨0.44%至278.50，低269.80后回收但未站280", "止跌未确认，红色操作约束仍有效。"),
    "002837": ("方向偏保守但操作有效", "涨0.85%至44.84，仍低于46.73", "弱反弹未触发修复。"),
    "03750.HK": ("完全有效", "跌6.58%至411.80、低402.60", "业绩前红色不押注纪律有效；正式结果显示利润预期落空。"),
    "09988.HK": ("完全有效", "跌3.58%至104.90并失108/105", "修复失败条件准确触发，恢复红色纯防守。"),
    "002409": ("方向偏保守但操作有效", "涨1.19%至97.25，高100.17但收盘未站97.9/100", "冲高回落未触发止跌确认。"),
    "688300": ("方向偏保守但操作有效", "涨2.78%至103.22，高104.50但未收104.6", "只算向理论基准回归，高位踩踏约束仍有效。"),
    "001270": ("修复有效需上调观察", "涨2.57%至84.55并首次收83", "只升级红色修复观察，今日守83并收85/87后再降风险。"),
}


MACRO_RADAR = {
    "date": "2026-10-21",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 4,
    "triggers": [
        "10月20日A股宽度显著修复，但炸板率约34.9%、下午封板质量回落，题材修复仍有分歧。",
        "港股恒生科技跌1.52%，宁德-H跌6.58%、阿里跌3.58%，形成跨市场高估值科技压力。",
        "绿的谐波两日累计上涨约13.7%并接近275/280压力，机器人主线进入不追后排阶段。",
    ],
    "opening_scenario": "A股可能先受宁德财报不及预期与港股科技弱势扰动，再观察机器人/半导体主线是否维持宽度；指数红不等于持仓同步修复。",
    "state": "S3 震荡精选",
    "radar_score": 58.1,
    "MSS": 54,
    "MBS": 64,
    "FRS": 47,
    "TES": 66,
    "ET": 64,
    "position_ceiling": "S3标准总仓40%-60%；因本组合科技同变量暴露高且宁德财报预期差为负，组合覆盖上限压至40%，新增仓位为0。",
    "allowed": "持有高确定性核心、对绿的/铖昌做守位观察、弱反抽降低集中度与同变量暴露。",
    "blocked": "禁止追机器人后排、禁止抄底宁德首日反应、禁止因澜起高同比直接追高、禁止摊低弱势股。",
    "focus": "09:45观察宁德A/H财报定价、全市场上涨家数是否继续高于下跌家数、机器人封板质量及绿的245/255承接。",
    "downgrade": "若上涨家数重新低于下跌家数、恒生科技继续下挫、宁德失400或机器人炸板率继续升高，则降至S1/S0防守。",
    "v231_link": "仅允许风险门通过且有经营数据支持的标的观察；澜起经营数据上调但交易确认未完成，宁德估值/交易时点下调。",
}


def trim_market(market: dict) -> None:
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-20"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-20":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-20")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-20", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-20完整A股与港股收盘验证上一版06:00判断；宁德三季报于收盘后披露，价格表现与财报预期差分开记录。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 3, "useful_but_conservative": 5,
            "repair_upgrade": 2, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 7,
            "main_read": "红色组合阀门仍有效：新易盛盘中失295，宁德-H跌6.58%，阿里失108/105；五只方向偏保守但操作约束有效。绿的完成第二日修复并可降为橙色，铖昌首次收83只升级观察。宽度改善不等于所有持仓转强。",
        },
        "items": items,
        "logic_corrections": [
            "A股3734只上涨、仅1639只下跌，MBS应上调；但港股科技与两只港股持仓大跌，组合总阀门不能跟随宏观状态直接降级。",
            "绿的完成第二日守位，可按规则从红色降为橙色；但两日涨约13.7%且接近275/280，禁止追高。",
            "澜起Q3高同比来自DDR5放量和高代际RCD占比提升，经营数据应上调；缺乏可靠Q3一致预期，不硬判超预期。",
            "宁德Q3收入高增但利润增速显著低于LSEG SmartEstimate，必须标为不及预期；股价下跌与业绩判断分别记录。",
            "铖昌收83只完成首日修复，仍需今日守83并收85/87后才降低个股风险。",
        ],
    }


def render_macro() -> str:
    r = MACRO_RADAR
    triggers = "".join(f"<li>{x}</li>" for x in r["triggers"])
    return f'''<section class="panel plan" id="macro-radar"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill orange">今日大盘情绪预警：{r['warning']}</span> <b>{r['state']}</b> · RadarScore {r['radar_score']}</p><p><b>评分：</b>MSS {r['MSS']} / MBS {r['MBS']} / FRS {r['FRS']} / TES {r['TES']} / ET {r['ET']}</p><ul>{triggers}</ul><p><b>最可能开盘剧本：</b>{r['opening_scenario']}</p><p><b>仓位上限：</b>{r['position_ceiling']}</p><p><b>允许：</b>{r['allowed']}</p><p><b>禁止：</b>{r['blocked']}</p><p><b>重点观察：</b>{r['focus']}</p><p><b>降级条件：</b>{r['downgrade']}</p><p><b>与V2.3.1联动：</b>{r['v231_link']}</p></section>'''


def main() -> None:
    prior = json.loads(LATEST_JSON.read_text(encoding="utf-8-sig"))
    market = base.fetch_market()
    trim_market(market)
    holdings = []
    for old in prior["holdings"]:
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note"}}
        item.update(UPDATES[item["code"]])
        holdings.append(enrich(item, market))
    review = build_review(prior, market)
    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive = ARCHIVE / f"automation_2_holdings_{stamp}.html"
    review_archive = ARCHIVE / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG前复权日K；全部10只持仓使用2026-10-20完整收盘。联瑞继续使用除权后价格序列。",
        "A股：沪指+0.12%、深成指-0.14%、创业板-0.26%、科创50+1.00%，成交约1.4561万亿元；3734股上涨、1639股下跌、56股涨停、7股跌停，宽度显著修复但炸板率约34.9%。",
        "港股：恒指-1.32%、恒生科技-1.52%、国企指数-1.21%；宁德-H跌6.58%至411.80，阿里跌3.58%至104.90。",
        "外围：10月20日SPY +0.31%、DIA +1.05%、QQQ -0.12%、SOXX -0.37%；IEF +0.19%、TLT +0.82%、UUP -0.29%，利率与美元代理缓和但半导体小幅承压。",
        "宁德正式Q3报告：单季营收1652.21亿元同比+58.58%，归母212.46亿元同比+14.54%，扣非188.62亿元同比+14.86%；前三季度经营现金流616.25亿元同比-23.60%。",
        "宁德预期来源：Reuters转述LSEG SmartEstimate，市场预期Q3净利同比增约41.2%、营收同比增约60.2%；实际分别为14.54%与58.58%，本报告判定不及预期。",
        "澜起Q3预增：营收约20.79亿元，归母12亿至13亿元，扣非9.5亿至10.5亿元；DDR5高代际RCD与互连芯片放量驱动，预告未经审计。无可靠单季一致预期，分类为无可靠预期。",
        "公告复核：除宁德正式三季报/董事会决议与澜起Q3预增外，其余持仓未见改变经营事实的重大新增公司公告。",
        "宏观雷达：MSS54、MBS64、FRS47、TES66、ET64，RadarScore58.1，对应S3震荡精选；因港股科技弱、A股炸板率回升和机器人短线升温，06:00预警为橙色。",
        "高位筛查：无持仓触发3日+25%或5日+35%阈值；绿的两日涨约13.7%且接近275/280，黄色关注；联瑞仍满足转债筹码与前期板块踩踏/放量弱势两项，维持高位踩踏风险。",
        "财报源：A股使用正式2026半年报并叠加最新可靠三季报/预告；阿里使用截至2026-06-30季度业绩。未有可靠一致预期时不把同比高增硬判超预期。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://static.cninfo.com.cn/finalpage/2026-10-21/1225613175.PDF ; https://www1.hkexnews.hk/search/titlesearch.xhtml?category=0&market=SEHK&stockId=1000259940 ; https://www.investing.com/news/stock-market-news/chinas-catl-profit-growth-slows-in-third-quarter-as-competition-intensifies-4959970 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=688008&id=12650706 ; https://news.10jqka.com.cn/20261020/c680878401.shtml ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-21 06:00；使用10月20日A股/港股完整收盘、收盘后正式公告与隔夜美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：宏观雷达橙色、S3震荡精选，但本组合维持红色防守。A股宽度显著修复、机器人与半导体扩散，允许观察核心修复；但宁德Q3利润增速明显不及LSEG预期且H股先跌6.58%，阿里失108/105，新易盛盘中触发295线，组合科技同变量暴露仍高。今日新增仓位为0，禁止追绿的和澜起利多，弱反抽优先降集中度；只有个股关键位连续守住后才降低风险。",
        "top_attention": [
            {"name": "宁德时代-H", "reason": "正式Q3营收高增但利润同比仅+14.54%、低于LSEG约+41.2%预期，H股已跌6.58%至411.80；业绩和交易双重偏空。"},
            {"name": "澜起科技", "reason": "Q3预告归母12亿至13亿元、同比+153.6%至+174.7%，经营层利多明确；但无可靠单季一致预期且价格未站173.4，利多不追。"},
            {"name": "新易盛", "reason": "组合集中度最高，10月20日盘中低294.66触发295风险线；未收303/308前维持红色。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-21", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>组合红色防守，宁德财报预期差为本日首要风险。</b>宁德Q3营收高增但净利增速明显低于LSEG预期，H股已跌6.58%；新易盛盘中失295，阿里失108/105。联瑞可转债筹码与前期板块踩踏/放量弱势仍满足两项，继续标记<b>高位踩踏风险</b>。绿的两日涨约13.7%、接近275/280，标记黄色关注，不追高。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>宁德看402.6/400/390，正式财报反应首日禁止抄底；收420/430只算止跌。</li><li>新易盛看294.7/290，失290继续降集中度；回购提议不能替代价格确认。</li><li>澜起利多高开不追，守170/171.1并收173.4只转修复；无单季一致预期不得写超预期。</li><li>绿的已降橙色但两日涨约13.7%，看255/252/245；失252减风险，禁止追机器人后排。</li><li>阿里失108/105恢复红色；联瑞收104.6只算止跌；铖昌今日守83并收85/87后才降风险。</li></ul></section>',
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
