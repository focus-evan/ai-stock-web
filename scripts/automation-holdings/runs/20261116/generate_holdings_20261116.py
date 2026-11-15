from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261113 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261116.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "累计约8亿元回购、在手订单与CPO长期需求逻辑未变，周末未见重大新增公司层利空。",
        "bear": "11月13日再跌8.76%至187.58，失200/195且接近日低，连续两日从225高点回撤；全市场4593股下跌，周五SOXX跌3.63%、NVDA跌2.02%，高位分配与外部AI冲击延续。",
        "message_level": "再跌8.76% + 失200/195 + SOXX -3.63%",
        "judgement": "利空",
        "action": "红色防守；看186/180/176，失180继续减风险；反抽195/200先看减压，不追。",
        "risk_level": "红色",
        "risk_note": "CPO高位回撤、宽度退潮和海外半导体连续下跌延续红色约束。",
    },
    "688008": {
        "bull": "Q3经营、Q4订单、回购与DDR5/RDIMM长期逻辑未变，周末未见重大新增公司层利空。",
        "bear": "11月13日跌7.32%至150.97，失160/155并低见149.63；半导体退潮与周五SOXX/NVDA继续下跌覆盖前一日相对强势，减持窗口仍在。",
        "message_level": "失160/155 + 半导体退潮 + 外部科技续跌",
        "judgement": "利空",
        "action": "红色防守；看150/147.5/143，失147.5降风险；收155/160仅算止跌。",
        "risk_level": "红色",
        "risk_note": "经营逻辑未变，但价格失位、减持窗口和外部半导体压力同时存在。",
    },
    "688017": {
        "bull": "Q3超预期的经营证据未变，11月13日低279.20后收281.80，尚守278；周末未见重大新增公司层利空。",
        "bear": "连续失296/290.5/283，机器人主线周五虽有4只涨停但昨日机器人涨停成员平均-6.65%，经营现金流弱与高估值风险未消。",
        "message_level": "继续失283 + 机器人昨日强股平均-6.65%",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看278/270/260，失278继续减风险；收283/290.5只算止跌。",
        "risk_level": "红色",
        "risk_note": "基本面弱项、机器人退潮和外部高估值科技承压继续满足三项红色条件。",
    },
    "688012": {
        "bull": "周末发布2027年度提质增效方案：前三季度营收约103.26亿元、同比+28.08%；LPCVD/ALD获重复订单、薄膜设备累计出货超500反应台，EPI设备进入量产验证；4亿至5亿元回购方案提供承接。",
        "bear": "11月13日跌2.63%至245.90，盘中低243.81；行动方案为前瞻性规划、不构成承诺，研发投入占营收约31.20%、扩产品线与并购仍带来费用和整合压力，外部半导体继续下跌。",
        "message_level": "行动方案硬数据利多 + 价格守245临界 + 外部半导体跌",
        "judgement": "中性",
        "action": "红色系统门控下相对强势观察；看245/242/238，失242降风险；收250/260只算修复。",
        "risk_level": "红色",
        "risk_note": "方案强化长期国产替代逻辑，但前瞻性陈述不能覆盖S7退潮和价格临界。",
    },
    "002837": {
        "bull": "算力基础设施与液冷长期需求未变，周末未见重大新增公司层利空。",
        "bear": "11月13日再跌6.39%至38.36，失40.6/39.4/38.8；Q3增收不增利、前三季度归母下降、毛利率下滑和存货较年初+154.95%未改善，液冷/CPO与海外AI同步退潮。",
        "message_level": "再跌6.39% + 失全部近端支撑 + 经营弱",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看38.1/37.3/36.2，失37.3继续减风险；反抽38.8/39.4不追。",
        "risk_level": "红色",
        "risk_note": "经营质量、板块退潮和外部AI硬件下跌继续满足三项红色条件。",
    },
    "03750.HK": {
        "bull": "A股持续回购并拟注销、累计资本动作提供中长期支撑；周末未见改变经营事实的重大新增公告。",
        "bear": "11月13日再跌1.18%至369.80，盘中低367.00并失370；恒生科技跌3.02%，Q3不及LSEG预期、现金流下降和利率压力未变。",
        "message_level": "失370 + 港科指-3.02% + 业绩预期差",
        "judgement": "利空",
        "action": "红色防守；看367/360/350，失367继续减风险；收374/377只算止跌，回购不替代业绩确认。",
        "risk_level": "红色",
        "risk_note": "资本动作利多仍被价格失位、港股科技退潮和业绩预期差覆盖。",
    },
    "09988.HK": {
        "bull": "9月季度业绩将于11月19日公布，届时可验证云/AI与电商投入的真实利润转化；周五BABA ADR基本持平。",
        "bear": "11月13日H股再跌3.46%至90.55，盘中低89.60并失93.3/90；恒生科技跌3.02%，业绩前预期差缺少可靠一致预期，事件波动风险上升。",
        "message_level": "H股再跌3.46% + 失93.3 + 11月19日业绩临近",
        "judgement": "利空",
        "action": "红色防守；看89.6/88/85，失89.6继续减风险；收93.3/98.9只算止跌，业绩前不摊低。",
        "risk_level": "红色",
        "risk_note": "H股继续破位，ADR止跌仅是单日现象，业绩事件临近且预期差无法可靠判断。",
    },
    "002409": {
        "bull": "半导体材料长期逻辑未变，11月13日低85.51后收86.34，仍勉强守住86；周末未见重大新增公司层利空。",
        "bear": "跌4.46%并失90/88.6，前一日97.20上影后的修复失败；Q3略低于申万宏源预期，周五SOXX跌3.63%。",
        "message_level": "失90/88.6 + 修复失败 + SOXX -3.63%",
        "judgement": "利空",
        "action": "红色防守；看86/83.7/82.7，失86继续减风险；收88.6/90仅算止跌。",
        "risk_level": "红色",
        "risk_note": "业绩预期差、价格修复失败和外部半导体下跌延续红色门控。",
    },
    "688300": {
        "bull": "约10亿元四川半导体封装用高性能粉体项目签约仍是长期产能期权，Q3超预期逻辑未变。",
        "bear": "签约次日跌9.88%至80.49，失89/87/84.3，显示市场先交易用地、审批、约6亿元一期资金与可转债压力；项目不构成业绩承诺，外部半导体继续下跌。",
        "message_level": "项目公告后-9.88% + 失全部支撑 + 融资落地风险",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看80/78.2/76.2，失78.2继续减风险；收84.3/87只算止跌。",
        "risk_level": "红色",
        "risk_note": "项目期权未转为订单/利润，扩产融资、板块退潮和外部科技下跌满足三项红色条件。",
    },
    "001270": {
        "bull": "11月13日低84.70后收85.19，尚守84.8；商业航天与机器人长期映射未变，周末未见重大新增公司层利空。",
        "bear": "继续跌2.38%，失87；Q3归母同比-44.43%、减值和可交换债筹码压力未消，机器人昨日涨停成员周五平均-6.65%。",
        "message_level": "继续失87 + Q3利润下滑 + 机器人退潮",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看84.8/82.9/80，失84.8继续减风险；收87/88.9仅算止跌。",
        "risk_level": "红色",
        "risk_note": "经营弱项、筹码压力和机器人退潮继续满足红色高位踩踏条件。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "再跌8.76%至187.58、失200/195", "红色反抽减压和失位降风险条件完全有效。"),
    "688008": ("完全有效", "跌7.32%至150.97、失160/155", "红色系统门控覆盖前一日相对强势，失位条件触发。"),
    "688017": ("完全有效", "收281.8、继续失283", "红色踩踏风险和反抽不追约束有效。"),
    "688012": ("完全有效", "跌2.63%至245.9、守245临界", "红色门控与245/242承接观察有效。"),
    "002837": ("完全有效", "再跌6.39%至38.36、失38.8", "红色不追和失位降风险条件准确。"),
    "03750.HK": ("完全有效", "跌1.18%至369.8、失370", "红色防守和失370减风险条件触发。"),
    "09988.HK": ("完全有效", "跌3.46%至90.55、盘中失90", "红色防守与失93.3继续降风险条件准确。"),
    "002409": ("完全有效", "跌4.46%至86.34、失90/88.6", "红色系统门控识别修复失败，失位条件触发。"),
    "688300": ("完全有效", "项目公告后跌9.88%至80.49", "不因项目签约追高、失87降风险约束完全有效。"),
    "001270": ("完全有效", "跌2.38%至85.19、失87", "红色踩踏与失87减风险条件触发。"),
}


MACRO_RADAR = {
    "date": "2026-11-16",
    "window": "06:00盘前（周一）",
    "warning": "红色",
    "warning_points": 10,
    "triggers": [
        "11月13日五大指数再度全跌：上证-0.59%、深证-2.05%、创业板-3.32%、科创综指-2.74%；约734股上涨、4593股下跌，连续第二日超过4500股下跌。",
        "成交约1.66万亿元，涨停37、跌停38；昨日涨停股平均-1.54%、大面率43.2%，最高板降至4板。封板率虽回升至约63.8%，但无法覆盖宽度和跌停扩散。",
        "美股周五SPY -0.38%、QQQ -1.20%、SOXX -3.63%、NVDA -2.02%；英伟达治理事件与更严芯片出口管制讨论增加外部不确定性，IEF -0.18%、UUP +0.27%。",
    ],
    "opening_scenario": "A股已连续两日宽度崩坏、科技同变量持仓普遍破位，周五海外半导体继续下跌；周末稳市与长期资本政策表态只能缓冲情绪。若09:45上涨仍不足1800或科技反抽无量，继续只减不加。",
    "state": "S7 退潮确认",
    "radar_score": 13.0,
    "MSS": 32,
    "MBS": 4,
    "FRS": 8,
    "TES": 3,
    "ET": 3,
    "position_ceiling": "S7标准总仓20%-40%；但组合科技同变量暴露超过30%、两日宽度崩坏且海外半导体继续跌，组合覆盖上限继续10%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险、保留高确定性观察；中微行动方案与政策缓冲只作基本面跟踪，不构成买点。",
    "blocked": "禁止抄底CPO、液冷、机器人与半导体，禁止把中微行动方案、联瑞项目或宁德回购当成逆势加仓理由，禁止阿里业绩前摊低。",
    "focus": "09:45观察上涨家数能否回到1800/2500、跌停是否收敛，以及新易盛180、澜起147.5、联瑞78.2、阿里89.6。",
    "downgrade": "已处S7；若上涨不足1200、跌停继续超过20或科技核心再现放量长阴，组合只减不加。解除S7至少需要下一完整交易日宽度、跌停和涨停溢价共同修复。",
    "v231_link": "经营分不随价格直接改写；中微重复订单和前三季度营收属于经营证据，联瑞项目仍是战略期权，交易层统一服从S7和关键位。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-13"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-13":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-13")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-13", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-13完整A股与港股收盘验证上一版06:00判断；美股11月13日与周末消息仅用于周一新预警，未回填A/H复盘。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 10, "useful_but_conservative": 0,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 0,
            "main_read": "上一版S0红色总阀门与全部个股关键位纪律在11月13日完全有效：八只A股持仓全部下跌，新易盛、澜起、英维克、雅克、联瑞和铖昌继续失位，宁德与阿里港股继续走弱。红色总阀门是仓位/加仓纪律，不等于对每只持仓跌幅的预测。",
        },
        "items": items,
        "logic_corrections": [
            "连续第二日约4500股以上下跌，跌停升至38、昨日涨停平均-1.54%，状态由S0风险处理升级描述为S7退潮确认。",
            "新易盛失200/195、澜起失160/155、英维克失38.8、雅克失88.6、联瑞失84.3，上一版关键位纪律应继续执行。",
            "中微行动方案提供营收、重复订单和出货经营证据，但属于前瞻性规划，不覆盖价格与系统风险。",
            "联瑞项目公告后跌9.88%，再次验证战略期权不能提前计入利润和交易买点。",
            "周末证监会稳市与长期资本表态是政策缓冲，至少等待下一完整交易日宽度和跌停共同改善。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-13完整A/H收盘，澜起继续使用未复权day序列；周一盘前未混入11月16日盘中数据。",
        "A股：上证-0.59%、深证-2.05%、创业板-3.32%、科创综指-2.74%；约734股上涨、4593股下跌，成交约1.66万亿元；涨停37、跌停38。",
        "短线生态：封板率约63.8%，但昨日涨停股平均-1.54%、大面率43.2%，最高板降至4板；前一日机器人涨停成员平均-6.65%。",
        "港股：恒指-1.55%至23637.60、恒生科技-3.02%至3813.19；宁德-H -1.18%至369.80，阿里-W -3.46%至90.55。",
        "外围：美东11月13日SPY -0.38%、QQQ -1.20%、SOXX -3.63%、NVDA -2.02%、BABA ADR +0.04%；IEF -0.18%、UUP +0.27%。",
        "中微公司2027提质增效方案：前三季度营收约103.26亿元、同比+28.08%；LPCVD/ALD获重复订单、薄膜设备累计出货超500反应台，EPI进入量产验证；文件明确前瞻性规划不构成承诺。https://pdf.dfcfw.com/pdf/H2_AN202611131831698080_1.pdf",
        "证监会11月14日：研究发展长期资本、耐心资本，减少羊群效应和短期交易波动，优化量化交易与减持规则；属于稳市政策方向，尚非当日资金确认。https://www.csrc.gov.cn/csrc/c106311/c7670983/content.shtml",
        "外部治理/政策风险：英伟达治理事件与美国进一步收紧AI芯片出口管制讨论增加半导体不确定性。https://apnews.com/article/aba7f92a1ec2f0f9e4b4da206d640d61",
        "阿里巴巴官方IR：9月季度业绩将于2026-11-19公布；现阶段未取得可靠一致预期，不提前判定超预期/不及预期。https://www.alibabagroup.com/en-US/investor-relations/",
        "周末公告复核：除中微行动方案外，全部持仓未见改变经营事实的重大新增公告；联瑞项目、宁德回购、雅克股东会沿用已核验口径。",
        "高位筛查：全部持仓3日涨幅未超过25%、5日涨幅未超过35%；但两日宽度崩坏、主线亏钱扩散与海外半导体续跌同时出现，全部持仓维持红色。绿的、英维克、联瑞和铖昌满足三项红色条件，标为高位踩踏风险。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里当前为无可靠预期，等待11月19日正式业绩。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://agu-app.com/daily/2026-11-13 ; https://www.dabanke.com/index-20261113.html ; https://finance.yahoo.com/quote/SOXX/history/ ; https://finance.yahoo.com/quote/NVDA/history/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-16 06:00；使用11月13日A股/港股完整收盘、周末公告与美东11月13日收盘，未使用11月16日盘中数据。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S7退潮确认。A股连续两日超过4500股下跌，11月13日跌停38、昨日涨停股平均-1.54%，周五SOXX跌3.63%、NVDA跌2.02%；周末稳市与长期资本表态仅作政策缓冲。组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；反抽只用于处理风险。",
        "top_attention": [
            {"name": "新易盛", "reason": "再跌8.76%并失200/195，组合集中度最高；周五SOXX与NVDA继续下跌，180防线决定是否继续降风险。"},
            {"name": "联瑞新材", "reason": "10亿元项目公告次日跌9.88%并失84.3，说明市场先交易审批、一期约6亿元资金与可转债压力；78.2是下一风险位。"},
            {"name": "阿里巴巴-W", "reason": "H股再跌3.46%、盘中失90；11月19日业绩临近但无可靠一致预期，业绩前不摊低。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-16", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色：连续两日宽度崩坏，退潮从高位题材扩散到科技持仓。</b>11月13日约4593股下跌、跌停38，昨日涨停股平均-1.54%、大面率43.2%；周五SOXX跌3.63%、NVDA跌2.02%。新易盛失200/195，澜起失160/155，英维克失38.8，联瑞项目公告后跌9.88%，阿里盘中失90。周末政策表态和中微行动方案只能缓冲基本面预期，不能解除S7。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；科技反抽只用于处理风险。</li><li>新易盛看186/180/176，澜起看150/147.5/143，英维克看38.1/37.3，联瑞看80/78.2；失位继续降低同变量暴露。</li><li>绿的看278/270，中微看245/242，雅克看86/83.7，铖昌看84.8/82.9；中微行动方案只作基本面跟踪。</li><li>宁德看367/360，阿里看89.6/88；阿里11月19日业绩前不摊低，回购和产品催化不替代价格确认。</li><li>解除S7至少需要下一完整交易日上涨家数回到2500以上、跌停显著收敛且昨日涨停平均收益转正。</li></ul></section>',
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
