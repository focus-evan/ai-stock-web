from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261026 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261027.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "正式8亿至10亿元回购方案已落地；10月26日盘中低238.64仍守前低236.10。",
        "bear": "收盘跌3.57%至251.69并失258，回购未转化为收盘承接；组合集中度最高、CPO/通信链继续出清。",
        "message_level": "正式回购未止跌 + 251.69", "judgement": "利空",
        "action": "红色高位踩踏风险；看250/238.6/236，失238.6继续降集中度；收260/270只算止跌，280/290并守位才转修复。",
        "risk_level": "红色", "risk_note": "公司层支撑明确，但交易层未确认，集中度约束优先。",
    },
    "688008": {
        "bull": "Q3预增与DDR5高代际RCD放量逻辑不变，旧回购4.10228亿元已完成。",
        "bear": "10月26日高179.09后跌6.96%至167.48，失180/175/173.8/171，公告后修复失败；新3亿至5亿元回购提议仍待10月29日审议。",
        "message_level": "业绩利多兑现失败 + 171失守", "judgement": "利空",
        "action": "个股恢复红色；看165.9/163/157.7，失163减风险；收171/173.8只算止跌，180并守位才转修复。",
        "risk_level": "红色", "risk_note": "基本面强但交易确认失败，典型经营层与交易层背离。",
    },
    "688017": {
        "bull": "10月26日再涨1.03%至293.00，机器人方向仍有约24股涨停，保持持仓内最强相对表现。",
        "bear": "盘中高318.80后大幅回落、成交继续放大；机器人涨停数量较前一日约40股收缩，出现高位分化与兑现。",
        "message_level": "318.8冲高回落 + 机器人缩容", "judgement": "中性",
        "action": "维持橙色、不加仓；看283/275/268，失275减风险；收300只重新转强，318.8并守位才延续修复。",
        "risk_level": "橙色", "risk_note": "高波动主题满足橙色不追条件，长上影强化兑现风险。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变。",
        "bear": "10月26日跌5.68%至251.55、低248.83，盘中深V未获次日确认并再次失252/250附近。",
        "message_level": "248.83新低 + 修复失败", "judgement": "利空",
        "action": "看250/248.8/245，失248.8继续减风险；收260/266.7只算止跌，272/278.5并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "Q3归母1.84亿元同比仅+0.25%、扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、扣非3.56亿元同比-7.06%，综合毛利率26.07%同比降1.25个百分点，存货较年初增154.95%。10月26日股价跌3.18%至42.97。",
        "message_level": "增收不增利 + 存货增154.95%", "judgement": "利空",
        "action": "红色；看42.3/40.6/38，失40.6继续减风险；收44.5/45只算止跌，46.5并守位才转修复。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "10月26日收356.80持平、低342.20仍守338/326，踩踏后的首日反弹未被完全吞没。",
        "bear": "收盘未站361/380，Q3利润增速不及LSEG预期与财报后大幅回撤仍未修复。",
        "message_level": "横盘守338 + 361未复", "judgement": "中性",
        "action": "红色修复观察；看342/338/326，失338减风险；收361/380只算止跌，400并守位才转修复。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "10月26日H股微涨0.15%至97.95，隔夜BABA ADR回升0.62%至100.25美元。",
        "bear": "H股仍未收100，修复幅度显著弱于美股科技；战略催化尚未形成利润与价格确认。",
        "message_level": "H股97.95横盘 + ADR微修复", "judgement": "中性",
        "action": "红色；看96/95/90，失95减风险；收100/103.3只算止跌，105/108并守位才转修复。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "10月26日跌4.66%至90.07、低89.81并逼近88；前一日深V未获确认，资本到位不等同当期利润。",
        "message_level": "90临界 + 增资未稳价", "judgement": "利空",
        "action": "看89.8/88/85.6，失88继续减风险；收92.4/95只算止跌，97并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "除权后持仓与成本口径已稳定，未见新的经营层重大公告。",
        "bear": "10月26日跌6.90%至87.80、低86.90并失90；6.94694亿元转债绝大部分未转，前一日深V修复失败。",
        "message_level": "90失守 + 转债压力", "judgement": "利空",
        "action": "看86.9/86.3/85，失86.3继续减风险；收90/94只算止跌，97.4并守位才转修复。",
        "risk_level": "红色", "risk_note": "高位踩踏与转债筹码压力延续。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "部分限制性股票回购注销完成，股本程序性调整落地。",
        "bear": "10月26日跌停至75.60并收最低；前三季度减值约1497.57万元、可交换债潜在供给、股数/成本缺失三项共振。",
        "message_level": "跌停75.60 + 1497.57万元减值", "judgement": "利空",
        "action": "红色强防守；看75.6/72/70，失72继续减风险；收80/82.5只算止跌，85并守位才转修复。",
        "risk_level": "红色", "risk_note": "新财务压力已被价格确认，参数缺失放大风险。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌3.57%至251.69、失258", "正式回购未稳价，红色集中度约束有效。"),
    "688008": ("完全有效", "跌6.96%至167.48、失180/175/173.8/171", "经营强但交易修复失败，个股恢复红色。"),
    "688017": ("完全有效", "涨1.03%至293.00但高318.80后回落", "橙色不追高约束有效，关注长上影兑现。"),
    "688012": ("完全有效", "跌5.68%至251.55、低248.83", "前日深V未确认，红色约束有效。"),
    "002837": ("完全有效", "跌3.18%至42.97、失43.4", "三季报增收不增利，红色防守有效。"),
    "03750.HK": ("完全有效", "收356.80持平，低342.20且未收361", "红色修复观察有效，不追首日反弹。"),
    "09988.HK": ("方向偏保守但操作有效", "涨0.15%至97.95，仍未收100", "方向偏保守但红色不加仓约束有效。"),
    "002409": ("完全有效", "跌4.66%至90.07、低89.81", "增资利多未稳价，红色约束有效。"),
    "688300": ("完全有效", "跌6.90%至87.80、失90", "高位踩踏与转债风险验证。"),
    "001270": ("完全有效", "跌停75.60、收最低", "减值与参数缺失风险被价格确认。"),
}


MACRO_RADAR = {
    "date": "2026-10-27",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 7,
    "triggers": [
        "沪指+0.19%但约3156股下跌，深成指-1.19%、创业板-1.71%、科创50-2.23%，构成指数与宽度/成长背离。",
        "机器人涨停由约40只降至约24只，涨停约55、跌停约25、炸板23，周五S2修复未获次日确认。",
        "绿的盘中高318.80后回落、澜起跌6.96%，高位与业绩利多股均出现兑现；虽隔夜SOXX+2.94%，本地结构风险仍占主导。",
    ],
    "opening_scenario": "美股半导体反弹可能带来低开修复，但A股成长和机器人已出现兑现；反抽优先视为降低科技集中暴露的窗口。",
    "state": "S1 冰点观察",
    "radar_score": 42.4,
    "MSS": 50,
    "MBS": 34,
    "FRS": 35,
    "TES": 48,
    "ET": 18,
    "position_ceiling": "S1标准总仓20%-35%；因组合高科技同变量暴露和多只关键位破位，组合覆盖上限20%，新增仓位为0、题材交易为0。",
    "allowed": "只观察绿的相对强度、宁德/阿里是否止跌；弱反抽降低新易盛、联瑞、铖昌等风险暴露。",
    "blocked": "禁止抄底、摊低、追机器人后排或逆总阀门交易财报/回购利好。",
    "focus": "09:45观察上涨家数能否重回3000、机器人炸板率、SOXX反弹传导、绿的283/275、新易盛250/238.6、澜起165.9/163。",
    "downgrade": "若下跌家数继续超过3000且创业板/科创50再创新低，或新易盛失238.6、联瑞失86.3、铖昌失72，则保持S0式风险处理。升级至少需一整日宽度与科技核心共同修复。",
    "v231_link": "英维克增收不增利、铖昌减值、新易盛回购未稳价均需下调交易时点；绿的相对强仅保留橙色观察，不获得加仓权限。",
}


def trim_market(market: dict) -> None:
    previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-26"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-26":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-26")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-26", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-26完整A股与港股收盘验证上一版06:00判断；周五S2修复是否获次日确认是本次核心。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 9, "useful_but_conservative": 1,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 1,
            "main_read": "周五冰点修复未获周一次日确认，九只约束完全有效：新易盛、澜起、中微、英维克、雅克、联瑞、铖昌均继续破位；宁德横盘未收361。仅阿里微涨但未收100，方向偏保守、操作仍有效。",
        },
        "items": items,
        "logic_corrections": [
            "沪指收红但3156股下跌、双创显著下跌，属于红利托底的指数假强，MBS必须下调。",
            "周五S2修复只维持一日，机器人涨停缩容、绿的长上影、澜起利多兑现失败，宏观状态降至S1冰点观察。",
            "英维克Q3营收增长33%但扣非利润同比微降、前三季度净利下降7.62%，现金流改善不能掩盖增收不增利。",
            "铖昌减值公告后的跌停确认财务压力；股数成本缺失继续作为风险放大器。",
            "隔夜SOXX上涨只提供外部缓冲，不能自动修复A股CPO、半导体与机器人内部筹码结构。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-10-26完整收盘，澜起继续使用未复权day序列。",
        "A股：沪指+0.19%、深成指-1.19%、创业板-1.71%、科创50-2.23%，成交约1.6088万亿元；约3156股下跌，涨停约55、跌停约25、炸板23，机器人涨停由约40只缩至约24只。",
        "港股：恒指+0.51%、恒生科技-0.36%、国企指数+0.59%；宁德-H收356.80持平，阿里+0.15%至97.95。",
        "外围：10月26日SPY +0.69%、DIA +0.31%、QQQ +1.09%、SOXX +2.94%；IEF +0.07%、UUP +0.19%、NVDA +2.40%，外部科技修复提供缓冲。BABA ADR +0.62%。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "公司公告复核：除英维克正式三季报/电话会与铖昌限制性股票回购注销外，其余持仓未见改变经营事实的重大新增公告；新易盛回购、澜起回购、雅克增资、铖昌减值结论延续。",
        "宏观雷达：MSS50、MBS34、FRS35、TES48、ET18，RadarScore42.4；周五S2修复未获次日确认，降至S1冰点观察，06:00预警为红色。",
        "高位筛查：绿的盘中创318.8阶段高位后回落、成交放大且机器人缩容，维持橙色不加仓；新易盛、宁德、联瑞高位踩踏标签未解除。",
        "财报源：英维克正式Q3、宁德正式Q3及LSEG、澜起Q3预告、A股正式半年报、阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=002837&id=12660398 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=002837&id=12663893 ; https://caifuhao.eastmoney.com/news/20261026193311897827420 ; https://finance.yahoo.com/quote/SOXX/ ; https://finance.yahoo.com/quote/BABA/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-27 06:00；使用10月26日A股/港股完整收盘、收盘后公告与隔夜美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S1冰点观察。周五S2强修复未获周一确认：沪指由红利托底微涨，但3156股下跌、双创再跌，机器人缩容；新易盛、澜起、中微、英维克、雅克、联瑞、铖昌继续破位。隔夜SOXX上涨2.94%只构成缓冲。组合上限20%、新增仓位和题材交易为0；反抽继续优先降低科技同变量与集中暴露。",
        "top_attention": [
            {"name": "铖昌科技", "reason": "前三季度减值1497.57万元后10月26日跌停75.60并收最低；财务压力、可交换债和参数缺失共振。"},
            {"name": "英维克", "reason": "正式Q3营收+33.04%但扣非-0.20%，前三季度净利-7.62%、存货+154.95%；现金流改善未扭转增收不增利。"},
            {"name": "澜起科技", "reason": "Q3预增后10月26日跌6.96%并失171，经营强但交易确认失败；等待10月29日新回购方案审议。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-27", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色S1冰点观察，周五修复次日失败。</b>新易盛、澜起、中微、英维克、雅克、联瑞、铖昌七只A股继续破位；铖昌减值后跌停。绿的盘中高318.8后回落、机器人涨停缩容，维持橙色预警：不加仓，只持有或做T。新易盛、宁德、联瑞的<b>高位踩踏风险</b>尚未解除。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合上限20%、新增仓位与题材交易为0；隔夜科技反弹仅作减风险窗口。</li><li>铖昌看75.6/72/70，新易盛看250/238.6/236，联瑞看86.9/86.3/85；跌破继续减风险。</li><li>英维克看42.3/40.6/38；Q3增收不增利且存货高增，未站45前维持红色。</li><li>澜起失171恢复红色，收171/173.8只算止跌；绿的高位长上影，失275减风险。</li><li>宁德未收361/380、阿里未收100/103.3前，均不得降低个股风险。</li></ul></section>',
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
