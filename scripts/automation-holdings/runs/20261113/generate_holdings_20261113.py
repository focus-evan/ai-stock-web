from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261112 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261113.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月12日收205.58，仍守住205收盘防线；累计约8亿元回购、在手订单与CPO长期需求逻辑未变，未见重大新增公司层利空。",
        "bear": "盘中冲225后回落并跌4.38%，形成放量上影；全市场4635股下跌、CPO多只高位股炸板，隔夜NVDA跌4.39%，高位拥挤与外部映射同时转弱。",
        "message_level": "225冲高回落 + 宽度崩坏 + NVDA -4.39%",
        "judgement": "利空",
        "action": "红色防守；看205/200/195，失200减风险；反抽215/225不追，至少等宽度与外盘共同修复。",
        "risk_level": "红色",
        "risk_note": "板块高位回落与隔夜AI硬件走弱同时触发红色预警，基本面未变但交易风险上调。",
    },
    "688008": {
        "bull": "11月12日收162.89、基本持平且继续守160/155，显著强于大盘；Q3经营、Q4订单与回购逻辑未变。",
        "bear": "盘中高169.36后回落，成交放大；半导体高位分化、全市场宽度崩坏与隔夜NVDA/美债压力叠加，减持窗口仍在。",
        "message_level": "相对强势 + 169.36回落 + 外部科技转弱",
        "judgement": "中性",
        "action": "红色系统门控下的相对强势观察；看160/155/150，失155降风险；169附近不追。",
        "risk_level": "红色",
        "risk_note": "公司层未恶化，但系统性宽度、板块回落和外部科技压力覆盖个股相对强势。",
    },
    "688017": {
        "bull": "Q3超预期的经营证据未变，11月12日高304.77一度守住300；未见重大新增公司层利空。",
        "bear": "收283.93、跌6.29%，失296/290.5并接近日低；机器人板块多只炸板或大跌，经营现金流弱和高估值与题材退潮形成三重压力。",
        "message_level": "失296/290.5 + 机器人退潮 + 高估值",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看283/278/270，反抽290.5/296先看减压，不追；重新收296仅算止跌。",
        "risk_level": "红色",
        "risk_note": "基本面弱项、机器人退潮和外部高估值科技承压满足三项红色条件。",
    },
    "688012": {
        "bull": "11月12日涨1.02%至252.55，收盘仍守250；4亿至5亿元回购方案及首次回购动作提供承接，国产替代逻辑未变。",
        "bear": "盘中高266.33后大幅回落，形成放量长上影；收盘后仅披露回购前十大股东信息，不是经营改善，半导体和外部AI链转弱。",
        "message_level": "守250但266.33长上影 + 系统转弱",
        "judgement": "中性",
        "action": "红色系统门控；看250/245/242，失245降风险；反抽260/266不追。",
        "risk_level": "红色",
        "risk_note": "相对强势不能覆盖放量上影、半导体退潮和隔夜高估值科技压力。",
    },
    "002837": {
        "bull": "11月12日低40.82后收40.98，仍勉强守住40.6；算力基础设施与液冷长期需求未变，未见重大新增公司层利空。",
        "bear": "涨停次日放量跌5.40%，高44.50后回落；Q3增收不增利、前三季度归母下降、毛利率下滑和存货较年初+154.95%未改善，液冷/CPO退潮叠加隔夜NVDA下跌。",
        "message_level": "涨停次日-5.40% + 经营弱 + 外部AI转弱",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看40.6/39.4/38.8，失40.6降风险；反抽43.3/44.5不追。",
        "risk_level": "红色",
        "risk_note": "经营质量弱、液冷/CPO退潮和外部AI硬件下跌满足三项红色条件。",
    },
    "03750.HK": {
        "bull": "公司11月12日再回购290,900股A股，价格240.12至241.02元、耗资69,964,683元并拟注销；持续回购形成真实资本动作。",
        "bear": "H股跌3.41%至374.20并失382/377，恒生科技跌2.36%；Q3不及LSEG预期、现金流下降和隔夜美债ETF下跌仍压制估值。",
        "message_level": "再回购6996万元 + H股失377",
        "judgement": "利空",
        "action": "红色防守；看374/370/367，失370减风险；收377/382只算止跌，回购不替代业绩确认。",
        "risk_level": "红色",
        "risk_note": "回购是公司层利多，但交易层失关键位并受港股科技和利率压力覆盖。",
    },
    "09988.HK": {
        "bull": "Apple智能接入千问的产品催化仍在，未见改变经营事实的重大新增利空公告。",
        "bear": "H股放量跌6.76%至93.80并失100/98.9，隔夜BABA ADR再跌7.06%至94.36；跨市场同步走弱，千问调用、收费和利润贡献仍未披露。",
        "message_level": "H股-6.76% + ADR -7.06% + 失98.9",
        "judgement": "利空",
        "action": "红色防守；看93.3/90，失93.3继续减风险；收98.9/100只算止跌，103.3/105并守位才修复。",
        "risk_level": "红色",
        "risk_note": "H股和ADR双市场大跌并失全部近端支撑，产品催化尚无利润验证。",
    },
    "002409": {
        "bull": "11月12日涨1.19%至90.37，连续第二日守88.6，完成价格修复确认；半导体材料长期逻辑未变。",
        "bear": "盘中高97.20后大幅回落，成交显著放大；Q3略低于申万宏源预期、半导体高位分化和隔夜NVDA/利率压力叠加。",
        "message_level": "二日守88.6但97.2长上影",
        "judgement": "中性",
        "action": "红色系统门控下相对强势观察；看90/88.6/86，失88.6降风险；97.2附近不追。",
        "risk_level": "红色",
        "risk_note": "二日守位仅确认价格修复，放量长上影、业绩预期差和外部半导体风险覆盖加仓。",
    },
    "688300": {
        "bull": "收盘后正式签署四川半导体封装用高性能粉体项目投资协议：计划总投资约10亿元、一期约6亿元，一期规划年产3万吨球形无机粉体；11月12日收89.31仍守87。",
        "bear": "项目用地尚未取得，备案、能评、环评等审批存在不确定性，资金来源含自筹和贷款且不构成业绩承诺；盘中高95.44后回落，可转债与扩产融资压力上升。",
        "message_level": "10亿元项目签约 + 用地审批/融资待落地",
        "judgement": "中性",
        "action": "红色系统门控；看89/87/84.3，失87降风险；项目签约只计长期产能期权，不因公告追高。",
        "risk_level": "红色",
        "risk_note": "正式签约是长期产能利多，但落地和资金风险、板块退潮及外部科技压力满足红色约束。",
    },
    "001270": {
        "bull": "11月12日低87.20后收87.27，尚未明显跌穿87整数区；商业航天与机器人长期映射未变，未见重大新增公司层利空。",
        "bear": "跌3.81%并略失87.4，盘中高91.45后回落；Q3归母同比-44.43%、减值和可交换债筹码压力未消，机器人板块显著退潮。",
        "message_level": "失87.4 + 机器人退潮 + Q3利润下滑",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看87/84.8/82.9，失87减风险；收88.9/90仅算止跌。",
        "risk_level": "红色",
        "risk_note": "经营弱项、筹码压力和机器人退潮叠加，关键位已轻微失守。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌4.38%至205.58、盘中225回落", "橙色不追和205防线约束有效，系统风险上升后转红。"),
    "688008": ("完全有效", "收162.89、继续守160/155", "修复确认与不追169附近同时有效；系统门控转红。"),
    "688017": ("完全有效", "跌6.29%至283.93、失296/290.5", "上一版失位降风险条件准确触发。"),
    "688012": ("完全有效", "涨1.02%至252.55、266.33回落", "守250但不追高约束有效，长上影要求提高风险。"),
    "002837": ("完全有效", "涨停次日跌5.40%、低40.82", "禁止追涨与40.6承接观察完全有效。"),
    "03750.HK": ("完全有效", "跌3.41%至374.2、失377", "上一版失377降风险条件准确触发。"),
    "09988.HK": ("完全有效", "跌6.76%至93.8、失100/98.9", "红色防守和失100减风险约束完全有效。"),
    "002409": ("完全有效", "涨1.19%至90.37、第二日守88.6", "首日修复获得次日确认，但97.2长上影保留不追约束。"),
    "688300": ("完全有效", "收89.31、守87但95.44回落", "橙色持有观察和压力区不追均有效。"),
    "001270": ("完全有效", "跌3.81%至87.27、略失87.4", "上一版失87.4降风险条件触发。"),
}


MACRO_RADAR = {
    "date": "2026-11-13",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 9,
    "triggers": [
        "11月12日五大指数全跌：上证-0.67%、深证-1.68%、创业板-2.44%、科创综指-0.35%；沪深京约875股上涨、4635股下跌，红盘率仅15.7%。",
        "成交放大至约1.95万亿元，但封板率降至48.1%、晋级率降至12.9%、1进2仅7.6%；昨日涨停股平均-0.92%，大面率27.4%，增量成交对应风险释放而非健康扩散。",
        "隔夜SPY -0.34%、QQQ -0.32%、SOXX -0.28%，但NVDA -4.39%、BABA ADR -7.06%、IEF -0.80%、UUP +0.24%；核心AI和中概风险显著高于指数。",
    ],
    "opening_scenario": "A股宽度和短线生态已转入风险释放，隔夜NVDA与BABA继续下挫；若09:45上涨家数仍低于1800、CPO/半导体高开低走，反抽应优先降低科技同变量暴露。",
    "state": "S0 绝对防守",
    "radar_score": 15.3,
    "MSS": 30,
    "MBS": 8,
    "FRS": 15,
    "TES": 5,
    "ET": 5,
    "position_ceiling": "S0标准总仓0%-20%；组合科技同变量暴露显著超过30%且变量反转，组合覆盖上限由15%降至10%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险和验证承接；相对强势的澜起、中微、雅克也只观察，不因抗跌加仓。",
    "blocked": "禁止抄底CPO、液冷、机器人与半导体，禁止把联瑞项目签约或宁德回购当成开盘追买理由，禁止对阿里摊低。",
    "focus": "09:45观察上涨家数能否回到2500以上、炸板率是否收敛，以及新易盛200、英维克40.6、绿的283、阿里93.3。",
    "downgrade": "已处S0；若上涨不足1800、昨日强势股继续负溢价或新易盛失200/阿里失93.3，组合继续只减不加。升级至少需要下一完整交易日宽度和封板质量同时修复。",
    "v231_link": "经营分不因价格下跌或上涨直接改写；联瑞项目只计战略期权、宁德回购计资本动作，交易层由S0和关键位覆盖。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-12"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-12":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-12")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-12", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-12完整A股与港股收盘验证上一版06:00判断；隔夜美股11月12日表现仅用于新一版预警。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 10, "useful_but_conservative": 0,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 0,
            "main_read": "上一版橙色不追和关键位纪律在11月12日全部有效：新易盛、英维克出现急涨后回落，绿的、宁德、阿里、铖昌触发失位条件；澜起、中微、雅克相对强势也未获得加仓许可。总阀门验证的是仓位约束，不是预测所有持仓同跌。",
        },
        "items": items,
        "logic_corrections": [
            "约4635股下跌、红盘率15.7%，成交放大但封板率和晋级率骤降，宏观由S3直接降至S0。",
            "新易盛未失205收盘但225冲高回落，风险由接近涨幅阈值转为高位分配与外部映射。",
            "绿的失296/290.5、宁德失377、阿里失100/98.9、铖昌失87.4，上一版失位条件均应执行。",
            "雅克第二日守88.6只确认价格修复，不覆盖97.2长上影与系统性退潮。",
            "联瑞签署10亿元项目协议属于战略期权，土地、审批、资金和达产均未完成，不上调财务质量。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-12完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：上证-0.67%、深证-1.68%、创业板-2.44%、科创综指-0.35%；沪深京约875股上涨、4635股下跌，成交约1.95万亿元。",
        "短线生态：封板37/77、封板率48.1%；晋级11/85、晋级率12.9%；1进2仅7.6%；昨日涨停股平均-0.92%、大面率27.4%。",
        "港股：恒指-1.26%至24008.55、恒生科技-2.36%至3931.93；宁德-H -3.41%至374.20，阿里-W -6.76%至93.80。",
        "外围：美东11月12日SPY -0.34%、QQQ -0.32%、SOXX -0.28%、NVDA -4.39%、BABA ADR -7.06%；IEF -0.80%、UUP +0.24%。",
        "联瑞新材正式公告：签署四川半导体封装用高性能粉体项目投资协议，总投资约10亿元、一期约6亿元、一期规划年产3万吨；用地和审批未取得，资金含自筹/贷款，不构成业绩承诺。https://pdf.dfcfw.com/pdf/H2_AN202611121831659821_1.pdf",
        "宁德时代港交所翌日披露报表：11月12日回购290,900股A股，价格240.12至241.02元、耗资69,964,683元，全部拟注销。https://pdf.dfcfw.com/pdf/H2_AN202611121831664865_1.pdf",
        "中微公司收盘后披露回购前十大股东信息、雅克科技披露股东会决议，均不改变经营判断；其余持仓截至06:00未见改变经营事实的重大新增公告。",
        "高位筛查：全部持仓3日涨幅未超过25%、5日涨幅未超过35%；但主线高位回落、封板/晋级恶化及隔夜核心AI下跌同时出现，全部持仓交易风险升至红色。绿的、英维克、铖昌满足基本面弱项/题材退潮/外围压力三项条件，标为高位踩踏风险。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://agu-app.com/daily/2026-11-12 ; https://www.dabanke.com/index-20261112.html ; https://finance.yahoo.com/quote/NVDA/history/ ; https://finance.yahoo.com/quote/BABA/history/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-13 06:00；使用11月12日A股/港股完整收盘、收盘后公告与美东11月12日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S0绝对防守。11月12日约4635股下跌、红盘率15.7%，成交放大但封板率降至48.1%、晋级率降至12.9%；隔夜NVDA跌4.39%、BABA ADR跌7.06%、美债ETF下跌。组合覆盖上限由15%降至10%，新增仓位、题材交易和摊低均为0；反抽只用于处理风险。",
        "top_attention": [
            {"name": "阿里巴巴-W", "reason": "H股-6.76%并失100/98.9，隔夜ADR再跌7.06%；跨市场同步破位，产品催化尚无利润验证。"},
            {"name": "新易盛", "reason": "高225后收205.58、跌4.38%，CPO高位回落且隔夜NVDA跌4.39%；组合集中度最高，200防线最关键。"},
            {"name": "联瑞新材", "reason": "签署约10亿元半导体粉体项目协议是长期产能利多，但一期约6亿元、用地审批和融资均待落地；不得把签约当利润兑现。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-13", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色：宽度崩坏、短线生态退潮、外围核心科技继续下跌。</b>11月12日约4635股下跌，封板率降至48.1%、晋级率降至12.9%，成交放大但对应风险释放；隔夜NVDA跌4.39%、BABA ADR跌7.06%、美债ETF跌0.80%。新易盛225冲高回落，绿的失296/290.5，英维克涨停次日回撤，阿里跨市场破位。今日组合上限10%，不新增、不摊低，反抽只处理风险。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限降至10%，新增仓位、题材交易和摊低均为0；CPO、液冷、机器人和半导体反抽不追。</li><li>新易盛看205/200/195，英维克看40.6/39.4/38.8，绿的看283/278/270；失位优先降低科技同变量暴露。</li><li>澜起看160/155，中微看250/245/242，雅克看90/88.6/86，联瑞看89/87/84.3，铖昌看87/84.8。</li><li>宁德看374/370/367，阿里看93.3/90；回购、产品催化和项目签约均不替代价格与利润确认。</li><li>只有下一完整交易日上涨家数回到2500以上、封板率和晋级率共同修复，才评估由S0上调；单日高开无效。</li></ul></section>',
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
