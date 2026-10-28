from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261027 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261028.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "8亿至10亿元回购方案、在手订单与1.6T持续放量的公司层逻辑未变。",
        "bear": "10月27日再跌5.60%至237.59，低237.22并失238.6防线，距前低236.10仅约0.6%；五日累计跌20.32%，组合集中度风险继续放大。",
        "message_level": "失238.6 + 五日跌20.32%", "judgement": "利空",
        "action": "红色强防守；看237.2/236.1/230，失236.1继续降集中度；收250/260只算止跌，270并守位才转修复。",
        "risk_level": "红色", "risk_note": "回购与经营利多连续未获价格确认，集中度约束优先。",
    },
    "688008": {
        "bull": "Q3预增与DDR5高代际RCD放量逻辑不变，旧回购4.10228亿元已完成。",
        "bear": "10月27日再跌1.78%至164.50，低164.10并失165.9；Q3预增未稳价，新3亿至5亿元回购提议仍待10月29日审议。",
        "message_level": "失165.9 + 利多未稳价", "judgement": "利空",
        "action": "红色；看164.1/163/157.7，失163继续减风险；收167.5/171只算止跌，175并守位才转修复。",
        "risk_level": "红色", "risk_note": "基本面强但交易确认失败，典型经营层与交易层背离。",
    },
    "688017": {
        "bull": "机器人产业长期催化与公司精密传动龙头逻辑未变。",
        "bear": "10月27日跌6.03%至275.33、低275.10，机器人涨停股由约24只缩至9只；前日318.8长上影后的兑现继续。",
        "message_level": "机器人缩至9板 + 275临界", "judgement": "利空",
        "action": "橙色、不加仓；看275/268/260，失275减风险；收283/293只算修复，300并守位才重新转强。",
        "risk_level": "橙色", "risk_note": "高波动主题与弱市退潮两项共振，维持橙色不追。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变。",
        "bear": "10月27日再跌5.30%至238.23、低236.02，连续失250/245，科创50大跌4.81%放大高估值半导体压力。",
        "message_level": "失245 + 低236.02", "judgement": "利空",
        "action": "红色；看236/230/220，失236继续减风险；收245/250只算止跌，260并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "Q3增收不增利、前三季度归母-7.62%与存货较年初+154.95%的压力未变；10月27日再跌3.68%至41.39并失42.3。",
        "message_level": "失42.3 + 增收不增利", "judgement": "利空",
        "action": "红色；看41.36/40.6/38，失40.6继续减风险；收42.3/44.5只算止跌，45并守位才转修复。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "10月27日低342.20仍守338，动力与储能需求长期增长逻辑未变。",
        "bear": "再跌2.30%至348.60且未收361；Q3利润增速不及LSEG预期、前三季度经营现金流同比下降与财报后回撤仍未修复。",
        "message_level": "342.2临界 + 361未复", "judgement": "利空",
        "action": "红色；看342.2/338/326，失338减风险；收361/380只算止跌，400并守位才转修复。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "10月27日H股低96.60仍守96，隔夜美股科技与半导体普涨。",
        "bear": "H股跌0.97%至97.00仍未收100，BABA ADR近乎持平；战略催化尚未形成利润与价格确认。",
        "message_level": "H股97未复100 + ADR持平", "judgement": "中性",
        "action": "红色；看96/95/90，失95减风险；收100/103.3只算止跌，105/108并守位才转修复。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "10月27日再跌4.50%至86.02、低86.00并失88；资本到位不等同当期利润，科创/半导体退潮加重交易压力。",
        "message_level": "失88 + 86临界", "judgement": "利空",
        "action": "红色；看86/85.6/82，失85.6继续减风险；收88/90只算止跌，92.4并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "10月27日晚公告拟在四川投建10亿元半导体封装用高性能粉体项目；一期约6亿元，规划年产3万吨，方向贴合先进封装材料需求。",
        "bear": "股价跌4.70%并收最低83.67、失85；项目用地、审批、建设周期与融资成本均有不确定性，且不构成业绩承诺，6.94694亿元转债筹码压力仍在。",
        "message_level": "10亿元扩产利多 + 收盘失85", "judgement": "中性",
        "action": "红色高位踩踏风险；看83.67/80/78，失83.67继续减风险；收86.3/90只算止跌，94并守位才转修复。",
        "risk_level": "红色", "risk_note": "经营扩产利多与交易/融资压力背离，不能以规划产能替代利润兑现。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "部分限制性股票回购注销完成，股本程序性调整落地。",
        "bear": "10月27日再跌3.80%并收最低72.73，连续失75.6；前三季度减值1497.57万元、可交换债潜在供给与股数/成本缺失共振。",
        "message_level": "连续收低 + 72临界", "judgement": "利空",
        "action": "红色强防守；看72.7/72/70，失72继续减风险；收75.6/80只算止跌，82.5并守位才转修复。",
        "risk_level": "红色", "risk_note": "新财务压力已被价格确认，参数缺失放大风险。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌5.60%至237.59、失238.6", "红色集中度与失位减风险约束被继续验证。"),
    "688008": ("完全有效", "跌1.78%至164.50、失165.9", "经营强但交易修复失败，红色约束有效。"),
    "688017": ("完全有效", "跌6.03%至275.33、低275.10", "橙色不追高约束有效，机器人继续缩容。"),
    "688012": ("完全有效", "跌5.30%至238.23、失245", "交易层继续破位，红色约束有效。"),
    "002837": ("完全有效", "跌3.68%至41.39、失42.3", "增收不增利后的红色防守有效。"),
    "03750.HK": ("完全有效", "跌2.30%至348.60、未收361", "财报后红色观察与不加仓约束有效。"),
    "09988.HK": ("完全有效", "跌0.97%至97.00、仍未收100", "中性偏弱判断与红色不加仓约束有效。"),
    "002409": ("完全有效", "跌4.50%至86.02、失88", "资本补充未稳价，红色约束有效。"),
    "688300": ("完全有效", "跌4.70%并收最低83.67、失85", "高位踩踏与转债风险继续验证。"),
    "001270": ("完全有效", "跌3.80%并收最低72.73", "减值、供给与参数缺失风险继续被价格确认。"),
}


MACRO_RADAR = {
    "date": "2026-10-28",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 9,
    "triggers": [
        "沪指-1.33%、深成指-2.50%、创业板-3.41%、科创50-4.81%，约567股上涨、4774股下跌，宽度与成长同步进入极弱区。",
        "成交缩至约1.473万亿元，涨停约41、跌停约26、炸板28；机器人涨停由约24只进一步缩至9只，题材退潮延续。",
        "港股恒指-0.73%、恒生科技-1.48%；虽隔夜QQQ+1.27%、SOXX+3.92%，10年美债收益率仍约4.99%，外部反弹不足以修复A/H内部筹码。",
    ],
    "opening_scenario": "隔夜美股芯片大涨或带来高开/反抽，但A股宽度、双创和机器人均处极弱状态；若早盘上涨家数与科技核心不共振，反抽仍是降低同变量暴露窗口。",
    "state": "S0 绝对防守",
    "radar_score": 24.6,
    "MSS": 52,
    "MBS": 6,
    "FRS": 10,
    "TES": 18,
    "ET": 7,
    "position_ceiling": "S0总仓原则0%-20%；本组合覆盖上限20%，新增仓位为0、题材交易为0，禁止以隔夜SOXX反弹为加仓依据。",
    "allowed": "只观察关键位承接；若反抽无宽度配合，优先降低新易盛、联瑞、铖昌及半导体同变量暴露。",
    "blocked": "禁止抄底、摊低、追机器人/半导体反抽或逆总阀门交易回购与扩产利好。",
    "focus": "09:45观察上涨家数能否重回2500、科创50是否止跌、机器人炸板率、新易盛236.1、联瑞83.67、铖昌72、绿的275。",
    "downgrade": "已处S0；若上涨家数仍不足1500或新易盛失236.1、联瑞失83.67、铖昌失72，继续按极端防守处理。升级至少需下一完整交易日守住关键位且宽度与科技核心同步修复。",
    "v231_link": "联瑞10亿元扩产属于长期产能期权而非当期利润，新易盛回购与澜起业绩均未稳价；所有基本面利多继续服从交易层和组合集中度约束。",
}


def trim_market(market: dict) -> None:
    previous.previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-27"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-27":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-27")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-27", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-27完整A股与港股收盘验证上一版06:00判断；严格排除10月28日盘中行情。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 10, "useful_but_conservative": 0,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 0,
            "main_read": "10月27日市场进入普跌，全部10只上一版约束完全有效；新易盛失238.6、中微失245、英维克失42.3、雅克失88、联瑞失85、铖昌逼近72，宁德与阿里均未收回修复位。",
        },
        "items": items,
        "logic_corrections": [
            "上涨家数仅约567、科创50跌4.81%，市场宽度与成长风格同时恶化，宏观状态由S1降至S0。",
            "绿的失283并回踩275，机器人涨停缩至9只；橙色不追约束继续有效，不能因相对强势追加仓位。",
            "联瑞10亿元扩产公告在收盘后发布，只能作为下一交易日催化；项目审批、融资与投产周期风险必须同时列示。",
            "全部10只验证均为完全有效，不因隔夜SOXX上涨3.92%修改上一交易日收盘结论。",
            "任何单日反抽只可从纯防守升级为修复观察，至少等待下一交易日守位后再降低总风险。",
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
        "截止纪律：本轮在北京时间09:49后补跑，但窗口严格固定为2026-10-28 06:00；全部10只持仓使用10月27日完整收盘，明确排除10月28日盘中行情。澜起继续使用未复权day序列。",
        "A股：沪指-1.33%、深成指-2.50%、创业板-3.41%、科创50-4.81%，成交约1.4729万亿元；约567股上涨、4774股下跌，涨停约41、跌停约26、炸板28，机器人涨停由约24只缩至9只。",
        "港股：恒指跌约0.73%至23041点、恒生科技-1.48%至3800.43点，成交约1783.5亿港元；宁德-H -2.30%至348.60，阿里-W -0.97%至97.00。",
        "外围：美东10月27日SPY +0.57%、DIA +0.06%、QQQ +1.27%、SOXX +3.92%；NVDA +0.88%、IEF -0.03%、UUP +0.34%，10年美债收益率约4.993%。BABA ADR -0.05%，外部科技反弹只作缓冲。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "联瑞新材公告：10月27日晚披露拟在四川建设半导体封装用高性能粉体材料项目，总投资10亿元、分两期，一期约6亿元，规划年产3万吨；新设全资子公司注册资本1.5亿元。项目用地、审批、融资成本与投产周期存在不确定性，公告不构成业绩承诺。",
        "公司公告复核：除联瑞新材10亿元扩产项目外，其余持仓截至06:00未见改变经营事实的重大新增公告；新易盛回购、澜起Q3预增/回购提议、英维克Q3、雅克增资、铖昌减值等结论延续。",
        "宏观雷达：MSS52、MBS6、FRS10、TES18、ET7，RadarScore24.6；宽度、双创与题材同步恶化，状态降至S0绝对防守，06:00预警为红色。",
        "高位筛查：绿的前日长上影后跌6.03%、机器人涨停缩至9只，满足弱市退潮与高波动主题两项，维持橙色不加仓；联瑞转债筹码、扩产融资与前期踩踏共振，维持高位踩踏风险。",
        "财报源：英维克正式Q3、宁德正式Q3及LSEG、澜起Q3预告、A股正式半年报、阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12666963&stockid=688300 ; https://static.cninfo.com.cn/finalpage/2026-10-28/1225631305.PDF ; https://stock.10jqka.com.cn/20261027/c681131701.shtml ; https://www.hkcd.com/hkcdweb/content/2026/10/27/content_8782085.html ; https://finance.yahoo.com/quote/SOXX/ ; https://finance.yahoo.com/quote/BABA/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-28 06:00；使用10月27日A股/港股完整收盘、收盘后公告与美东10月27日收盘；严格排除10月28日盘中行情。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S0绝对防守。10月27日约4774股下跌，创业板-3.41%、科创50-4.81%，机器人涨停缩至9只；10只持仓全部未完成修复确认，多只再失关键位。隔夜SOXX上涨3.92%只构成外部缓冲。组合上限20%、新增仓位和题材交易为0；任何反抽优先降低科技同变量与集中暴露。",
        "top_attention": [
            {"name": "新易盛", "reason": "10月27日再跌5.60%并失238.6，五日累计跌20.32%，距前低236.10仅约0.6%；组合集中度最高。"},
            {"name": "联瑞新材", "reason": "晚间10亿元扩产属长期利多，但股价收最低83.67并失85；项目审批、融资与转债筹码压力需和利多分开评估。"},
            {"name": "铖昌科技", "reason": "减值公告后连续两日收低，10月27日收72.73并逼近72防线；可交换债、参数缺失与财务压力共振。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-28", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色S0绝对防守：约4774股下跌、科创50跌4.81%，10只持仓全部未完成修复确认。</b>新易盛失238.6、联瑞收最低83.67、铖昌逼近72。联瑞晚间10亿元扩产是长期产能期权，不等同当期利润，项目审批、融资成本、转债筹码与<b>高位踩踏风险</b>仍需并列处理。绿的维持橙色：不加仓，只持有或做T。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合上限20%、新增仓位与题材交易为0；隔夜芯片反弹只作观察或减风险窗口。</li><li>新易盛看237.2/236.1/230，联瑞看83.67/80/78，铖昌看72.7/72/70；跌破继续减风险。</li><li>中微失245后看236/230；英维克看41.36/40.6；雅克看86/85.6，均未收回上层关键位前维持红色。</li><li>绿的失283后回踩275，机器人涨停缩至9只；失275减风险，不追隔夜半导体映射。</li><li>宁德未收361、阿里未收100前不得降低个股风险；任何单日反弹至少等待下一交易日守位。</li></ul></section>',
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
