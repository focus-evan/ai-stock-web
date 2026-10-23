from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261022 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261023.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "董事长8亿至10亿元回购提议和CPO长期需求逻辑仍在，但尚未形成正式回购方案。",
        "bear": "10月22日放量跌12.28%至258.01、几乎收于全天最低258；组合集中度最高，CPO/光通信同步重挫，隔夜SOXX再跌6.82%。",
        "message_level": "单日-12.28% + CPO内外共振踩踏", "judgement": "利空",
        "action": "红色高位踩踏风险；看258/250/245，失250继续降集中度；收270/280只算止跌，290并守位才转修复。",
        "risk_level": "红色", "risk_note": "公司长期逻辑未被公告否定，但交易层进入流动性踩踏。",
    },
    "688008": {
        "bull": "Q3预增与DDR5高代际RCD放量逻辑不变；10月22日实际收175.33、低174.74，仍守173.8，强于多数科技持仓。",
        "bear": "未能站180且市场进入S0防守；10月23日每股派0.20元除息，今日理论参考约175.13，禁止把机械除息当跌幅或追高。",
        "message_level": "相对抗跌 + 今日0.20元除息", "judgement": "中性",
        "action": "维持橙色但新增仓位为0；按除息参考看175.1/173.8/171，失171降风险；收180并次日守位才延续修复。",
        "risk_level": "橙色", "risk_note": "经营层强、交易相对抗跌，但S0总阀门禁止新开仓。",
        "ex_dividend_reference": 175.13,
        "ex_dividend_date": "2026-10-23",
    },
    "688017": {
        "bull": "10月22日逆势涨0.44%至258.82，低257.80守住256/252；机器人仍有少数核心抱团。",
        "bear": "盘中高271.60后明显回落，机器人由扩散转为点状抱团；全市场近5000股下跌，连续题材修复的赔率恶化。",
        "message_level": "逆势守位 + 冲高回落", "judgement": "中性",
        "action": "维持橙色、不追；看257.8/252/245，失252减风险；收268/272只算转强，275并守位才恢复进攻观察。",
        "risk_level": "橙色", "risk_note": "相对强势但属于S0环境下高波动抱团，橙色预警成立。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变，未见新的公司级基本面利空。",
        "bear": "10月22日跌3.58%至264.18、低263.99并失268；市场与半导体风险共振，前期弱修复再次失败。",
        "message_level": "268失守 + 市场踩踏", "judgement": "利空",
        "action": "看264/260/255，失260继续减风险；收272/278.5只算止跌，282/290并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层继续破位，基本面和时点分开处理。",
    },
    "002837": {
        "bull": "液冷需求与股票期权长期考核逻辑未变，未见重大新增公司公告。",
        "bear": "10月22日跌3.59%至43.53、低43.42并失43.8；仍低于46.73元行权价，半年报利润下滑未修复。",
        "message_level": "43.8失守 + 盈利验证不足", "judgement": "利空",
        "action": "看43.4/42/40，失42继续减风险；收45/46.5只算止跌，46.73并守位才转修复。",
        "risk_level": "红色", "risk_note": "小反弹结束，重新进入纯防守。",
    },
    "03750.HK": {
        "bull": "业绩说明会仍认为全球动力与储能需求有增长潜力，长期龙头地位未因单季波动改变。",
        "bear": "10月22日再跌7.24%至338.40、低336，财报后三日累计约-23.2%；Q3利润增速不及LSEG预期，恒生科技跌5.03%，价格踩踏继续。",
        "message_level": "财报后三日-23.2% + 336防线", "judgement": "利空",
        "action": "红色极强防守；看336/320/300，失320继续减风险；收350/361只算止跌，380并守位才转修复。禁止抄底。",
        "risk_level": "红色", "risk_note": "需求长期判断不能覆盖已确认的预期落空与流动性踩踏。",
    },
    "09988.HK": {
        "bull": "速卖通品牌增长、AI硬件扶持与玄铁E908A战略催化延续，未见新的正式财务披露。",
        "bear": "H股10月22日放量跌6.12%至97.35并失100；隔夜BABA ADR再跌2.50%且盘中低99.27美元，恒生科技跌5.03%。",
        "message_level": "H股失100 + ADR续跌", "judgement": "利空",
        "action": "红色强防守；看96.8/95/90，失95继续减风险；收100/103.3只算止跌，105/108并守位才转修复。",
        "risk_level": "红色", "risk_note": "跨市场抛压加剧，战略催化未转化为价格承接。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资款已到位并完成工商变更，雅克仍持54.3541%，为电子封装粉体材料业务补充发展资金。",
        "bear": "10月22日跌4.56%至92.39、低91.90并失95；增资后外部投资人合计持股45.6459%，资本到位不等同当前利润改善。",
        "message_level": "华飞8.5亿元增资落地 + 95失守", "judgement": "中性",
        "action": "看91.9/90/88，失90继续减风险；收95/97只算止跌，100并守位才转修复。利好不追。",
        "risk_level": "红色", "risk_note": "经营资金利多已落地，但交易层破位优先。",
    },
    "688300": {
        "bull": "10转3与260股持仓口径已稳定，募集资金专户销户为程序性收尾。",
        "bear": "10月22日跌6.73%至95.32、低95.31并失97.4；6.94694亿元转债绝大部分未转，CPO/电子材料链同步退潮。",
        "message_level": "97.4失守 + 转债压力", "judgement": "利空",
        "action": "看95/94/90，失94继续减风险；收97.4/100只算止跌，104.6并守位才转修复。",
        "risk_level": "红色", "risk_note": "维持高位踩踏风险，程序性公告不改变筹码压力。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "半年报利润增长事实未变，未见新的经营层重大公告。",
        "bear": "10月22日跌3.42%至82.55、收于最低并失85/83，橙色修复条件失败；可交换债潜在供给与股数/成本缺失延续。",
        "message_level": "85/83修复失败 + 参数缺失", "judgement": "利空",
        "action": "恢复红色；看82.5/80.8/78.8，失80.8继续减风险；收85/87只重新转修复。",
        "risk_level": "红色", "risk_note": "次日修复失败，按规则恢复红色纯防守。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "放量跌12.28%至258.01、收近最低", "集中度红色防守强验证，升级高位踩踏风险。"),
    "688008": ("方向偏保守但操作有效", "实际跌1.69%至175.33，守173.8但未收180", "不追高有效；今日按175.13除息参考观察。"),
    "688017": ("完全有效", "逆势涨0.44%至258.82，低257.8守256/252但高271.6回落", "橙色守位与不追高约束均有效。"),
    "688012": ("完全有效", "跌3.58%至264.18、失268", "红色防守有效，下移看264/260/255。"),
    "002837": ("完全有效", "跌3.59%至43.53、失43.8", "红色纯防守有效。"),
    "03750.HK": ("完全有效", "再跌7.24%至338.40、低336", "红色极强防守有效，禁止抄底纪律继续。"),
    "09988.HK": ("完全有效", "放量跌6.12%至97.35、失100", "红色强防守有效，关注ADR续跌传导。"),
    "002409": ("完全有效", "跌4.56%至92.39、失95", "红色防守有效；增资落地不改变交易破位。"),
    "688300": ("完全有效", "跌6.73%至95.32、失97.4", "高位踩踏红色约束有效。"),
    "001270": ("完全有效", "跌3.42%至82.55、失85/83", "橙色修复失败条件触发，恢复红色。"),
}


MACRO_RADAR = {
    "date": "2026-10-23",
    "window": "06:00盘前（11:02补跑，严格排除10月23日盘中）",
    "warning": "红色",
    "warning_points": 10,
    "triggers": [
        "A股约4999股下跌、仅535股上涨，沪指-1.48%、创业板-4.37%，主要指数创阶段或52周新低，触发系统硬风险。",
        "成交放大至约1.529万亿元但属于放量出清；涨停约33、跌停约62、连板晋级约14%、炸板率约41%，情绪退潮确认。",
        "港股恒生科技跌5.03%，隔夜QQQ跌2.84%、SOXX跌6.82%；新易盛、宁德、阿里出现跨市场高估值科技踩踏。",
    ],
    "opening_scenario": "即使盘中出现技术性反抽，也优先视为风险收缩窗口；只有宽度、涨跌停比与科技核心同时修复，才允许从S0升级。",
    "state": "S0 绝对防守",
    "radar_score": 23.1,
    "MSS": 45,
    "MBS": 12,
    "FRS": 14,
    "TES": 15,
    "ET": 6,
    "position_ceiling": "S0标准总仓0%-20%；本组合科技同变量高度集中，覆盖上限20%，新增仓位为0，题材交易为0。",
    "allowed": "只处理风险、保留现金和高确定性低暴露核心；弱反抽优先降低新易盛、宁德、阿里及同变量集中度。",
    "blocked": "禁止抄底、禁止摊低、禁止追机器人/AI后排、禁止因公司利好逆总阀门开仓。",
    "focus": "仅核验宽度能否回到3000家上涨、涨停重新多于跌停、SOXX冲击是否传导、新易盛258/250、宁德336/320、阿里96.8/95。",
    "downgrade": "已处S0；若新易盛失250、宁德失320、阿里失95或下跌家数继续超过4000，继续收缩风险。升级至少需一整日宽度与核心科技共同修复。",
    "v231_link": "V2.3.1高分基本面也只能观察；澜起与绿的相对强不构成加仓权限，宁德预期差与价格破位继续下调估值/交易时点。",
}


def fetch_raw_montage(market: dict) -> None:
    params = urllib.parse.urlencode({"param": "sh688008,day,,,18,none"})
    request = urllib.request.Request(
        "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?" + params,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))["data"]["sh688008"]["day"]
    market["quotes"]["688008"] = [
        {"date": row[0], "open": float(row[1]), "close": float(row[2]), "high": float(row[3]), "low": float(row[4]), "volume": float(row[5])}
        for row in rows
    ]


def trim_market(market: dict) -> None:
    fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-22"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-22":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-22")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-22", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-22完整A股与港股收盘验证上一版06:00判断；澜起使用未除息实际收盘175.33，避免10月23日每股0.20元除息回改历史价格。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 9, "useful_but_conservative": 1,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 1,
            "main_read": "红色组合阀门与橙色宏观预警被市场大跌强化：九只约束完全有效，新易盛、宁德、阿里、联瑞等触发减风险线；仅澜起相对抗跌，方向偏保守但不追高约束有效。橙色铖昌失83后按规则恢复红色。",
        },
        "items": items,
        "logic_corrections": [
            "近5000股下跌、涨停少于跌停、放量杀跌和隔夜SOXX急跌构成S0硬风险，宏观雷达由S3直接降至S0。",
            "新易盛与宁德虽有长期逻辑，但放量连续破位属于流动性踩踏；应先下调交易时点与组合暴露，不改写为公司基本面突然归零。",
            "澜起10月22日实际收175.33，10月23日除息理论参考175.13；复盘必须使用实际收盘，今天不得把机械除息当跌幅。",
            "华飞电子8.5亿元增资落地改善资金条件，但雅克股价失95且市场S0，利好不构成加仓权限。",
            "绿的逆势守位但机器人从扩散转抱团，橙色只能持有观察；S0环境下禁止追强。",
        ],
    }


def render_macro() -> str:
    r = MACRO_RADAR
    triggers = "".join(f"<li>{x}</li>" for x in r["triggers"])
    return f'''<section class="panel alert" id="macro-radar"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill red">今日大盘情绪预警：{r['warning']}</span> <b>{r['state']}</b> · RadarScore {r['radar_score']}</p><p><b>评分：</b>MSS {r['MSS']} / MBS {r['MBS']} / FRS {r['FRS']} / TES {r['TES']} / ET {r['ET']}</p><ul>{triggers}</ul><p><b>最可能开盘剧本：</b>{r['opening_scenario']}</p><p><b>仓位上限：</b>{r['position_ceiling']}</p><p><b>允许：</b>{r['allowed']}</p><p><b>禁止：</b>{r['blocked']}</p><p><b>重点观察：</b>{r['focus']}</p><p><b>升级条件：</b>{r['downgrade']}</p><p><b>与V2.3.1联动：</b>{r['v231_link']}</p></section>'''


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
        "行情：腾讯/GTIMG前复权日K；全部10只持仓使用2026-10-22完整收盘。澜起改用未除息day序列，实际收175.33；10月23日每股0.20元除息理论参考约175.13。严格排除10月23日盘中行情。",
        "A股：沪指-1.48%、深成指-2.96%、创业板-4.37%、科创50-2.78%，成交约1.5287万亿元；约535股上涨、4999股下跌、涨停约33、跌停约62，放量出清并触发S0硬风险。",
        "港股：恒指-3.03%、恒生科技-5.03%、国企指数-3.20%；宁德-H跌7.24%至338.40，阿里跌6.12%至97.35，南向净卖出超92亿港元。",
        "外围：10月22日SPY -1.18%、QQQ -2.84%、SOXX -6.82%、DIA +0.04%；IEF +1.08%、TLT +1.86%、UUP -0.10%，科技暴跌与债券上涨显示风险规避，而非美元单一上行。",
        "新易盛/CPO：公司未见新增基本面利空，但新易盛跌12.28%、中际旭创跌8.76%，叠加SOXX跌6.82%，按市场风格与流动性踩踏处理。",
        "雅克：华飞电子8.5亿元增资款到位并完成工商变更；雅克仍持54.3541%，外部投资人合计45.6459%。该事项为电子封装粉体业务补充资金，不等同当期利润。",
        "宁德：Q3不及LSEG预期结论不变，H股连续三日下跌；10月22日H股翌日披露报表为例行股本披露。",
        "公告复核：除雅克华飞电子增资工商变更、宁德例行H股报表外，其余持仓未见改变经营事实的重大新增公告。",
        "宏观雷达：MSS45、MBS12、FRS14、TES15、ET6，RadarScore23.1；重大指数破位、极端宽度、涨跌停倒挂与外围科技急跌触发S0绝对防守和红色预警。",
        "高位筛查：新易盛、宁德满足板块踩踏/估值交易压力/外围同类急跌等多项，标为高位踩踏风险；联瑞仍满足转债筹码与前期板块踩踏两项；绿的在极弱大盘中逆势抱团，橙色不追高。",
        "财报源：宁德正式Q3报告及LSEG SmartEstimate、澜起Q3预告、A股正式半年报、阿里截至2026-06-30季度业绩。没有可靠一致预期时不把同比高增硬判超预期。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://caifuhao.eastmoney.com/news/20261022154628370151750 ; https://www.nbd.com.cn/articles/2026-10-22/4612619.html ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=002409&id=12653603 ; https://static.cninfo.com.cn/finalpage/2026-10-21/1225613175.PDF ; https://finance.yahoo.com/quote/SOXX/ ; https://finance.yahoo.com/quote/BABA/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-23 06:00；本轮于11:02补跑但严格排除10月23日盘中行情，使用10月22日A股/港股收盘、收盘后公告与隔夜美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S0绝对防守。A股近5000股下跌、涨停少于跌停、放量杀跌，港股恒科跌5.03%，隔夜QQQ跌2.84%、SOXX跌6.82%；新易盛、宁德、阿里及组合内多只科技股出现跨市场踩踏。总仓覆盖上限20%，新增仓位和题材交易均为0。任何反抽优先用于减集中度与同变量暴露，禁止抄底、摊低或追相对强势股；至少等待一整日宽度与核心科技共同修复后再升级。",
        "top_attention": [
            {"name": "新易盛", "reason": "组合集中度最高，放量跌12.28%至258.01并收近最低；CPO与SOXX同步重挫，升级高位踩踏风险。"},
            {"name": "宁德时代-H", "reason": "Q3不及LSEG预期后再跌7.24%至338.40，三日累计约-23.2%；长期需求解释不能覆盖流动性踩踏。"},
            {"name": "阿里巴巴-W", "reason": "H股放量跌6.12%并失100，隔夜ADR再跌2.50%；跨市场价格风险压过战略催化。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-23", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色S0绝对防守，跨市场科技流动性踩踏确认。</b>新易盛跌12.28%、宁德财报后三日约跌23.2%、阿里失100；三者均需先定减风险线。新易盛、宁德与联瑞满足至少两项红色条件，其中新易盛与宁德标记<b>高位踩踏风险</b>。绿的仅为极弱环境中的相对抱团，维持橙色且禁止追高。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>新易盛看258/250/245，宁德看336/320/300，阿里看96.8/95/90；跌破继续减风险。</li><li>宏观S0：总仓覆盖上限20%，新增仓位和题材交易为0；任何反抽优先收缩同变量暴露。</li><li>澜起今日每股0.20元除息，按175.13理论参考观察，不把机械除息当跌幅，也不逆总阀门追强。</li><li>绿的看257.8/252/245，极弱环境中的抱团不追；失252减风险。</li><li>雅克8.5亿元增资落地只计资金支持；联瑞、铖昌修复失败后均按红色处理。</li></ul></section>',
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
