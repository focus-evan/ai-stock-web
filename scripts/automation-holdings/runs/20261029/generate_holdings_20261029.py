from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261028 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261029.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "10月28日放量反弹8.08%至256.79并收回250；8亿至10亿元回购、在手订单及1.6T放量逻辑未变。",
        "bear": "盘中低243.26仍接近前低区，收盘尚未站260/270；单日修复不能消除五日仍跌12.69%与组合集中度风险。",
        "message_level": "放量收回250 + 260未复", "judgement": "中性",
        "action": "红色修复观察；看250/243.3/236.1，失243.3减风险；收260只算修复延续，270并守位才降低风险。",
        "risk_level": "红色", "risk_note": "价格完成首日修复，但集中度与前低风险未解除。",
    },
    "688008": {
        "bull": "10月28日涨6.20%至174.70，收回167.5/171；Q3预增、高代际RCD放量及港股存储链走强共同提供催化。",
        "bear": "收盘仍略低于175且未站180；新3亿至5亿元回购提议仍待10月29日董事会审议，正式Q3报告亦尚未披露。",
        "message_level": "收回171 + 175临界", "judgement": "利多",
        "action": "红色修复观察；看171/168/164.1，失168降风险；收175/180并守位才逐级上调。",
        "risk_level": "红色", "risk_note": "经营与交易首次共振，但必须等待下一交易日确认。",
    },
    "688017": {
        "bull": "10月28日涨6.05%至291.98，机器人涨停由9只回升至约10只，收回283并逼近293。",
        "bear": "盘中高305后回落、成交放大，仍低于300/305及318.8前高；炸板69只显示高位题材承接质量偏弱。",
        "message_level": "收回283 + 高305回落", "judgement": "中性",
        "action": "维持橙色、不加仓；看283/275/268，失283减风险；收293/300只算修复，305并守位才转强。",
        "risk_level": "橙色", "risk_note": "首日修复叠加高换手与高位回落，仍维持橙色不追纪律。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变。",
        "bear": "10月28日仅涨0.74%至240.00，盘中低232.01再破236风险线；明显弱于科创50+2.45%与半导体反弹，仍未收245/250。",
        "message_level": "低232.01 + 弱于科创50", "judgement": "利空",
        "action": "红色；看236/232/230，失232继续减风险；收245/250只算止跌，260并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层继续破位，维持纯防守。",
    },
    "002837": {
        "bull": "正式Q3报告显示单季营收19.33亿元同比+33.04%、经营现金流前三季度2.14亿元同比+167.07%，在手订单充沛。",
        "bear": "Q3增收不增利、前三季度归母-7.62%与存货较年初+154.95%的压力未变；10月28日收43.44仍未站44.5/45。",
        "message_level": "收回42.3 + 44.5未复", "judgement": "中性",
        "action": "红色修复观察；看42.3/42/40.6，失42减风险；收44.5/45并守位才降低风险。",
        "risk_level": "红色", "risk_note": "现金流改善但利润、毛利率与库存验证偏弱，未取得可靠一致预期。",
        "earnings_status": "正式半年报已披露",
        "earnings_expectation_result": "无可靠预期",
        "earnings_note": "2026-10-26正式Q3报告：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度营收49.50亿元同比+22.94%，归母3.69亿元同比-7.62%，扣非3.56亿元同比-7.06%，经营现金流2.14亿元同比+167.07%。前三季度综合毛利率26.07%同比下降1.25个百分点，存货较年初增长154.95%；驱动为算力/储能温控收入增长，压力来自区域销售组合、发货确认节奏、费用及汇兑损失。未取得可验证单季一致预期，分类为无可靠预期。",
    },
    "03750.HK": {
        "bull": "互动易重申全固态电池持续投入、2027年有望小批量生产；10月28日低343.80仍守342/338。",
        "bear": "收盘再跌0.63%至346.40、未收361；固态电池仍处研发至小批量阶段，不能计入当前业绩，Q3不及LSEG预期压力未消。",
        "message_level": "固态电池期权 + 361未复", "judgement": "中性",
        "action": "红色；看343.8/342/338，失342减风险；收361/380只算止跌，400并守位才转修复。",
        "risk_level": "红色", "risk_note": "第二日未创新低但也未收复关键位，不降低风险。",
    },
    "09988.HK": {
        "bull": "10月28日H股涨1.96%至98.90、隔夜ADR再涨约0.74%；美国法院暂缓执行部分涉军名单相关限制，构成情绪面缓和。",
        "bear": "H股仍未收100；法院裁定不等于移出名单，DRAM十年长约仍是媒体所称洽谈意向而非正式签约，均不能计入利润。",
        "message_level": "诉讼阶段缓和 + 100未复", "judgement": "中性",
        "action": "红色修复观察；看97/96/95，失96减风险；收100/103.3只算止跌，105并守位才转修复。",
        "risk_level": "红色", "risk_note": "跨市场压力边际缓和但H股未完成关键位确认。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资已落地，电子封装粉体业务资金条件改善。",
        "bear": "10月28日盘中低84.51再破85.6风险线，收87.59仍未站88/90；反弹明显弱于科创50与半导体链。",
        "message_level": "盘中失85.6 + 88未复", "judgement": "利空",
        "action": "红色；看86/85.6/84.5，失84.5继续减风险；收88/90只算止跌，92.4并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易弱势压过资本补充利多。",
    },
    "688300": {
        "bull": "10月27日晚公告拟在四川投建10亿元半导体封装用高性能粉体项目；一期约6亿元，规划年产3万吨，方向贴合先进封装材料需求。",
        "bear": "10月28日涨9.17%至91.34但高94.26后回落，尚未站94；项目审批、融资与投产周期不确定，6.94694亿元转债筹码压力仍在。",
        "message_level": "扩产获价格确认 + 94未复", "judgement": "利多",
        "action": "红色高位踩踏风险转修复观察；看90/86.5/83.67，失90降风险；收94并守位才逐级降低风险。",
        "risk_level": "红色", "risk_note": "经营扩产利多与交易/融资压力背离，不能以规划产能替代利润兑现。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月28日涨停至80.00，收回75.6并触及80，显示连续下跌后的强力技术修复。",
        "bear": "前三季度减值1497.57万元、控股股东可交换债潜在供给及股数/成本缺失仍在；单日涨停尚未站82.5。",
        "message_level": "涨停80 + 风险未消", "judgement": "中性",
        "action": "橙色、不加仓；看77.9/75.6/72.3，失75.6减风险；收82.5并守位才上调修复。",
        "risk_level": "橙色", "risk_note": "纯高波动小市值且前一日涨停，满足橙色不加仓条件。",
    },
}


REVIEW_META = {
    "300502": ("修复有效需上调观察", "涨8.08%至256.79、收回250但未收260", "从纯防守升级为修复观察，需下一交易日守250/243.3。"),
    "688008": ("修复有效需上调观察", "涨6.20%至174.70、收回171但未收175", "经营与交易首次共振，等待175/180确认。"),
    "688017": ("修复有效需上调观察", "涨6.05%至291.98、收回283", "橙色不追仍有效，等待293/300确认。"),
    "688012": ("完全有效", "盘中低232.01失236，收240仍低于245", "风险线被触发且明显弱于指数，红色约束有效。"),
    "002837": ("修复有效需上调观察", "涨4.95%至43.44、收回42.3", "从纯防守升级为修复观察，等待44.5/45。"),
    "03750.HK": ("完全有效", "跌0.63%至346.40、仍未收361", "财报后红色观察与不加仓约束有效。"),
    "09988.HK": ("完全有效", "涨1.96%至98.90、仍未收100", "中性判断与红色不追约束有效，尚未完成关键位修复。"),
    "002409": ("完全有效", "盘中低84.51失85.6，收87.59未收88", "风险线触发且相对弱，红色约束有效。"),
    "688300": ("修复有效需上调观察", "涨9.17%至91.34、收回90但未收94", "扩产利多获首日确认，只升级修复观察。"),
    "001270": ("修复有效需上调观察", "涨停80.00、收回75.6", "首日强修复但未收82.5，升级橙色观察。"),
}


MACRO_RADAR = {
    "date": "2026-10-29",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 5,
    "triggers": [
        "沪指+0.91%、深成指+2.02%、创业板+3.40%、科创50+2.45%，约4051股上涨、1163股下跌，宽度从极端冰点完成首日修复。",
        "成交约1.64万亿元、涨停约71、跌停约7，但炸板69、封板率约50%，芯片与机器人反弹仍有明显兑现和拥挤压力。",
        "港股恒指+0.23%、恒生科技+1.40%，隔夜QQQ+0.59%、SOXX+2.09%；美联储维持3.75%-4.00%但有两票主张加息，10年美债约5.05%，外部仍非无条件顺风。",
    ],
    "opening_scenario": "隔夜芯片继续上涨可能带来高开，但前一日69只炸板说明追涨承接不足；优先看宽度和核心能否守住昨日收复位，冲高无量则仍视为减风险窗口。",
    "state": "S2 冰点转折",
    "radar_score": 51.5,
    "MSS": 50,
    "MBS": 58,
    "FRS": 45,
    "TES": 52,
    "ET": 28,
    "position_ceiling": "S2标准总仓30%-45%；因本组合科技同变量集中、昨日仅首日修复且多股仍低于上层关键位，组合覆盖上限继续20%，新增仓位为0、题材交易为0。",
    "allowed": "只观察修复确认；持有已收回关键位的核心，冲高无宽度配合时继续降低同变量暴露。",
    "blocked": "禁止把首日普涨当趋势反转；禁止追铖昌涨停、绿的/联瑞高波动反弹或摊低中微、雅克。",
    "focus": "09:45观察上涨家数能否继续超过2500、炸板率是否下降、科创50承接、新易盛250、澜起171/175、联瑞90/94、铖昌75.6。",
    "downgrade": "若上涨家数重回1500以下、炸板率继续高位，或新易盛失243.3、澜起失168、联瑞失90、铖昌失75.6，则退回S0/S1防守。升级至少需下一完整交易日守位。",
    "v231_link": "联瑞扩产、澜起业绩与新易盛回购均只获得首日价格确认；中微、雅克相对弱势。V2.3.1基本面分与交易时点继续分离，不授予加仓权限。",
}


def trim_market(market: dict) -> None:
    previous.previous.previous.previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-28"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-28":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-28")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-28", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-28完整A股与港股收盘验证上一版06:00判断；方向与红色仓位约束分开评价。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 4, "useful_but_conservative": 0,
            "repair_upgrade": 6, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 6,
            "main_read": "10月28日出现宽度修复：新易盛、澜起、绿的、英维克、联瑞、铖昌收回部分关键位，均分类为修复有效需上调观察；中微与雅克盘中仍触发风险线，宁德、阿里未完成上层修复。红色总阀门的仓位约束仍有效。",
        },
        "items": items,
        "logic_corrections": [
            "约4051股上涨、跌停降至约7只，宏观状态由S0升级到S2冰点转折；但炸板69只，不能直接进入结构进攻。",
            "新易盛、澜起、绿的、英维克、联瑞、铖昌只完成首日修复；按规则至少等待下一交易日守位后再降低总风险。",
            "中微盘中失236、雅克盘中失85.6且均弱于科创50，说明同为半导体链也需做相对强弱区分。",
            "宁德固态电池2027小批量属于远期技术期权，阿里DRAM长约仍为洽谈报道；均不得计入当前利润锚。",
            "红色总阀门是仓位/加仓约束，不等于预测全部持仓下跌；本次六只反弹不构成总阀门失效。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-10-28完整收盘，澜起继续使用未复权day序列。",
        "A股：沪指+0.91%、深成指+2.02%、创业板+3.40%、科创50+2.45%，成交约1.64万亿元；约4051股上涨、1163股下跌，涨停约71、跌停约7、炸板69，机器人涨停约10、芯片约6。",
        "港股：恒指+0.23%至23094.83、恒生科技+1.40%至3853.72、国企指数+0.32%；宁德-H -0.63%至346.40，阿里-W +1.96%至98.90。",
        "外围：美东10月28日SPY +0.35%、DIA +0.27%、QQQ +0.59%、SOXX +2.09%；NVDA -1.16%、IEF -0.26%、UUP -0.21%，10年美债收益率约5.045%。BABA ADR +0.74%。",
        "美联储：10月28日以10比2维持联邦基金目标区间3.75%-4.00%，两位委员主张加息25个基点；通胀仍高、12月加息风险未消，不能把按兵不动等同于全面流动性宽松。",
        "英维克正式Q3：单季营收19.33亿元同比+33.04%，归母1.84亿元同比+0.25%，扣非1.81亿元同比-0.20%；前三季度归母3.69亿元同比-7.62%、经营现金流2.14亿元同比+167.07%，存货较年初+154.95%。",
        "英维克预期差：未取得可验证FactSet/Visible Alpha/Q3一致预期，不能因媒体称不及预期直接分类；本报告按无可靠预期处理，同时将增收不增利列为经营风险。",
        "联瑞新材：10亿元半导体封装粉体扩产公告获首日价格确认，股价涨9.17%并收回90；但高94.26回落、项目审批/融资/投产周期与未转债券压力仍需并列处理。",
        "宁德时代：互动易重申全固态电池2027年有望小批量生产；证据阶段为研发至小批量前，属于远期技术期权，不计入当前业绩锚。",
        "阿里巴巴：美国法院暂缓执行部分涉军名单相关限制，属于诉讼阶段性情绪利好，不等于移出名单；与韩系存储厂商十年DRAM长约仍为媒体所称洽谈，未见正式签约公告。",
        "公司公告复核：除上述信息外，其余持仓截至06:00未见改变经营事实的重大新增公告；澜起正式Q3报告及新回购提议董事会审议仍待后续披露。",
        "宏观雷达：MSS50、MBS58、FRS45、TES52、ET28，RadarScore51.5；由S0升级S2冰点转折，但炸板69只，06:00预警仍为橙色。",
        "高位筛查：无持仓触发新的3日+25%或5日+35%红色涨幅阈值。绿的、联瑞均为高波动首日修复，铖昌前一日涨停且属小市值高波动，三者维持不追；联瑞高位踩踏旧标签需下一日守94后再评估。",
        "财报源：英维克正式Q3、宁德正式Q3及LSEG、澜起Q3预告、A股正式半年报、阿里截至2026-06-30季度业绩。无可靠一致预期时不硬判。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12666963&stockid=688300 ; https://wap.stockstar.com/detail/RB2026102700037638 ; https://www.zaobao.com.sg/news/china/story20261027-9900936 ; https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm ; https://finance.eastmoney.com/a/202610283911893242.html ; https://finance.yahoo.com/quote/SOXX/ ; https://finance.yahoo.com/quote/BABA/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-29 06:00；使用10月28日A股/港股完整收盘、收盘后公告与美东10月28日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、宏观S2冰点转折。10月28日宽度与双创完成首日修复，但炸板69只；六只持仓仅升级为修复观察，中微与雅克盘中仍触发风险线，宁德与阿里未收上层关键位。组合上限继续20%、新增仓位和题材交易为0；至少等待下一完整交易日守位。",
        "top_attention": [
            {"name": "新易盛", "reason": "放量涨8.08%并收回250，但仍未站260/270；组合集中度最高，首日修复不能视为趋势反转。"},
            {"name": "联瑞新材", "reason": "10亿元扩产获价格确认、涨9.17%并收回90，但高94.26回落；审批、融资、转债与旧踩踏标签仍待确认。"},
            {"name": "铖昌科技", "reason": "10月28日涨停80完成强修复，但减值、可交换债和股数/成本缺失未消；纯高波动小市值次日禁止追涨。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-29", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>宏观升级S2，但组合总阀门仍红色。</b>10月28日约4051股上涨，然而炸板69只；六只持仓只完成首日修复。绿的、联瑞、铖昌均属高波动反弹，不加仓、不追高。联瑞的<b>高位踩踏风险</b>旧标签至少等待收94并守位后再评估；中微、雅克盘中仍触发风险线。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合上限20%、新增仓位与题材交易为0；首日普涨后先看守位，不追高。</li><li>新易盛看250/243.3/236.1，澜起看171/168/164.1；失位恢复纯防守。</li><li>联瑞看90/86.5/83.67，铖昌看77.9/75.6/72.3；高开不能追，失90/75.6减风险。</li><li>中微盘中失236、雅克盘中失85.6且弱于指数，未收245/88前维持红色。</li><li>宁德未收361、阿里未收100前不得降低个股风险；任何单日反弹至少等待下一交易日守位。</li></ul></section>',
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
