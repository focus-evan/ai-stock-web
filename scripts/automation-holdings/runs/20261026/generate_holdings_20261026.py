from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261023 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261026.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "董事会已正式通过8亿至10亿元回购方案，价格上限500元/股、期限12个月，预计回购160万至200万股（总股本0.11%至0.14%），回购账户已开立；10月23日低236.10后收261.00。",
        "bear": "单日盘中振幅巨大，回购比例较小且用途为股权激励或员工持股，实际实施节奏仍取决于市场与资金安排；组合集中度最高。",
        "message_level": "正式回购方案落地 + 236深V", "judgement": "中性",
        "action": "红色高位踩踏观察；看258/250/236，失250继续降集中度；收270/280只算止跌，290并次日守位才转修复。回购消息不追。",
        "risk_level": "红色", "risk_note": "公司层支撑从提议升级为方案，但单日深V只证明波动，未证明趋势反转。",
    },
    "688008": {
        "bull": "Q3预增后价格继续确认：10月23日实际收180.00、高181.88；此前3亿至6亿元维护价值回购已完成208.80万股、实际金额4.10228亿元、均价196.47元。",
        "bear": "新一轮3亿至5亿元回购提议仍待10月29日董事会；180只完成首日收回，市场整体尚处冰点修复。",
        "message_level": "收180 + 4.10228亿元回购完成", "judgement": "利多",
        "action": "维持橙色、新增仓位为0；按除息后看175/173.8/171，今日守180并收181.9/185才延续修复，失173.8降风险。",
        "risk_level": "橙色", "risk_note": "经营与价格共振，但需下一交易日守180，且总阀门不授权加仓。",
    },
    "688017": {
        "bull": "10月23日大涨12.05%至290.00、高297，机器人板块约40股涨停，修复强度居持仓前列。",
        "bear": "5个交易日累计涨幅约22.5%、成交显著放大，触发橙色高位题材预警；涨幅主要来自板块情绪，周末未见公司基本面新增披露。",
        "message_level": "单日+12.05% + 5日约+22.5%", "judgement": "中性",
        "action": "橙色、不加仓，只持有或做T；看275/268/258，失268减风险；收297/300并次日守位才延续修复。",
        "risk_level": "橙色", "risk_note": "满足5日涨幅与高波动题材两项橙色条件，严禁追高。",
    },
    "688012": {
        "bull": "10月23日低252.17后回收至266.70、上涨0.95%，国产替代与先进封装布局未变。",
        "bear": "盘中失260/255且收盘仍未站272/278.5，深V尚未获得下一交易日确认。",
        "message_level": "252深V + 272未复", "judgement": "中性",
        "action": "看260/252/250，失252继续减风险；收272/278.5只算止跌，282/290并守位才转修复。",
        "risk_level": "红色", "risk_note": "方向修复但风险线盘中触发，维持红色。",
    },
    "002837": {
        "bull": "10月23日低40.56后回收至44.38、上涨1.95%，液冷需求和长期激励逻辑未变。",
        "bear": "盘中明显失42，收盘仍未站45/46.5；半年报利润下滑未修复，周末未见新增公司公告。",
        "message_level": "40.56深V + 45未复", "judgement": "中性",
        "action": "看42/40.6/38，失40.6继续减风险；收45/46.5只算止跌，46.73并守位才转修复。",
        "risk_level": "红色", "risk_note": "深V只完成盘中修复，尚未触发收盘关键位。",
    },
    "03750.HK": {
        "bull": "10月23日低326后反弹5.44%至356.80，结束日线七连跌；长期动力与储能需求逻辑未变。",
        "bear": "Q3利润增速不及LSEG预期结论未变，财报后累计跌幅仍大；反弹收盘未站361/380，属于踩踏后的首日技术修复。",
        "message_level": "结束七连跌 + 首日技术反弹", "judgement": "中性",
        "action": "红色修复观察；看338/326/320，失326继续减风险；收361/380只算止跌，400并次日守位才转修复。禁止抄底。",
        "risk_level": "红色", "risk_note": "首日反弹不取消不及预期与高位踩踏标签。",
    },
    "09988.HK": {
        "bull": "10月23日H股小涨0.46%至97.80、低95.30后回收，战略催化未变。",
        "bear": "仍未收100，周五BABA ADR再跌2.15%至99.64美元；卖空规模此前放大，跨市场承接仍弱。",
        "message_level": "H股弱反弹 + ADR续跌", "judgement": "利空",
        "action": "红色强防守；看95.3/95/90，失95继续减风险；收100/103.3只算止跌，105/108并守位才转修复。",
        "risk_level": "红色", "risk_note": "H股反弹未获ADR确认，跨市场弱势延续。",
    },
    "002409": {
        "bull": "华飞电子8.5亿元增资与工商变更已完成；10月23日低85.63后收94.47、上涨2.25%。",
        "bear": "盘中明显失90/88且收盘仍未站95/97，资本到位不等同当期利润改善。",
        "message_level": "85.63深V + 增资落地", "judgement": "中性",
        "action": "看91.9/88/85.6，失88继续减风险；收95/97只算止跌，100并守位才转修复。",
        "risk_level": "红色", "risk_note": "经营资金利多与盘中破位分开记录，维持红色。",
    },
    "688300": {
        "bull": "10月23日低86.30后回收至94.31，260股与除权后口径不变。",
        "bear": "收盘仍跌1.06%并失94，6.94694亿元转债绝大部分未转；盘中失90说明筹码压力仍重。",
        "message_level": "盘中失90 + 转债压力", "judgement": "利空",
        "action": "看90/86.3/85，失86.3继续减风险；收95/97.4只算止跌，100/104.6并守位才转修复。",
        "risk_level": "红色", "risk_note": "高位踩踏风险未解除，深V不等于趋势反转。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月23日低76.50后收84.00、上涨1.76%，半年报利润增长事实未变。",
        "bear": "前三季度计提资产减值准备约1497.57万元，将等额减少利润总额；盘中失80.8/78.8，股数与成本仍缺失，可交换债潜在供给延续。",
        "message_level": "1497.57万元减值 + 76.5深V", "judgement": "利空",
        "action": "红色；看80.8/76.5/75，失76.5继续减风险；收85/87只重新转修复。参数未补前不放大仓位。",
        "risk_level": "红色", "risk_note": "减值影响利润且盘中修复失败，维持红色。",
        "earnings_note": "2026-08-11披露正式半年报：营收2.16亿元同比+7.33%，归母7629.53万元同比+34.72%，扣非7437.99万元同比+35.76%。2026-10-24公告前三季度计提资产减值准备1497.57万元，将等额减少利润总额、对经营现金流无影响；未经审计。未取得可靠一致预期，分类为无可靠预期。",
    },
}


REVIEW_META = {
    "300502": ("方向偏保守但操作有效", "低236.10触发250/245后收261.00、涨1.16%", "减风险线盘中触发；收盘反弹不等于趋势反转。"),
    "688008": ("修复有效需上调观察", "除息后涨2.66%至180.00、高181.88", "首次收180，等待今日守180并收181.9/185。"),
    "688017": ("修复有效需上调观察", "涨12.05%至290.00、高297", "修复强但触发橙色高位预警，不得追高。"),
    "688012": ("方向偏保守但操作有效", "低252.17触发260/255后收266.70、涨0.95%", "盘中减风险约束有效，收盘未站272。"),
    "002837": ("方向偏保守但操作有效", "低40.56失42后收44.38、涨1.95%", "盘中风险线触发，收盘未站45。"),
    "03750.HK": ("方向偏保守但操作有效", "低326后反弹5.44%至356.80，未收361", "禁止抄底约束有效；首日修复不降风险。"),
    "09988.HK": ("方向偏保守但操作有效", "低95.30后收97.80、涨0.46%，仍未收100", "红色防守有效，ADR未确认。"),
    "002409": ("方向偏保守但操作有效", "低85.63失90/88后收94.47、涨2.25%", "盘中风险线触发，增资利好不授权加仓。"),
    "688300": ("完全有效", "跌1.06%至94.31、盘中低86.30失90", "高位踩踏红色约束有效。"),
    "001270": ("方向偏保守但操作有效", "低76.50失80.8/78.8后收84.00、涨1.76%", "盘中减风险约束有效，减值公告增加利润压力。"),
}


MACRO_RADAR = {
    "date": "2026-10-26",
    "window": "06:00盘前 / 周末",
    "warning": "橙色",
    "warning_points": 5,
    "triggers": [
        "A股从前日极端冰点反转为4476股上涨、885股下跌，涨停约82、跌停约7，但仅完成一个交易日确认。",
        "成交放大至约1.956万亿元且机器人约40股涨停，属于强修复同时伴随单主题拥挤，不能直接视为健康主升。",
        "周五QQQ近乎持平、SOXX仅反弹0.57%，阿里ADR再跌2.15%；海外并未充分确认A股机器人/科技强修复。",
    ],
    "opening_scenario": "周一可能高开兑现或分化，优先观察宽度能否连续第二日保持、机器人后排是否掉队；不把周五深V直接当趋势反转。",
    "state": "S2 冰点转折",
    "radar_score": 52.4,
    "MSS": 46,
    "MBS": 55,
    "FRS": 43,
    "TES": 65,
    "ET": 29,
    "position_ceiling": "S2标准总仓30%-45%；因本组合科技同变量和前期踩踏未修复，组合覆盖上限仍为20%，新增仓位为0。",
    "allowed": "持有观察澜起、绿的等相对强核心；对踩踏股只等次日守位，弱反抽继续降低集中度。",
    "blocked": "禁止追机器人后排、禁止抄底宁德/新易盛/联瑞、禁止把正式回购或增资利好当加仓权限。",
    "focus": "观察上涨家数能否连续高于3000、涨停是否继续多于跌停、机器人炸板率、绿的275/268、澜起180、新易盛258/250。",
    "downgrade": "若宽度重新转弱至3000家以下、机器人炸板率上升或新易盛失250/宁德失326，则返回S0；至少连续一日守位后才考虑提高组合上限。",
    "v231_link": "澜起经营和价格相对强可保留观察；绿的只计交易修复不抬高基本面；新易盛回购落地与雅克增资落地均不越过组合红色阀门。",
}


def trim_market(market: dict) -> None:
    previous.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-23"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-23":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-23")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-23", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-23完整A股与港股收盘验证上一版06:00判断；红色总阀门评价仓位纪律，不等于预测所有持仓收跌。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 1, "useful_but_conservative": 7,
            "repair_upgrade": 2, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 9,
            "main_read": "S0红色总阀门的操作约束有效，但周五出现强烈冰点反转，方向判断整体偏保守。九只持仓盘中仍触发或接近风险线；澜起首次收180、绿的放量突破，均只升级修复观察。单日深V不足以降低组合红色风险。",
        },
        "items": items,
        "logic_corrections": [
            "周五4476股上涨、涨停约82、炸板率约12.8%，宏观状态可由S0上调到S2冰点转折；但需要下一交易日守位，不直接跳到S3/S4。",
            "新易盛正式回购方案从提议升级为董事会批准，但回购比例仅0.11%-0.14%、用途为激励，价格深V不等于趋势反转。",
            "绿的5日涨幅约22.5%且放量，满足橙色高位题材条件；板块强修复只调整交易观察，不上调基本面。",
            "澜起已收180且回购完成4.10228亿元，经营与价格继续共振；仍需今日守180后才降低风险。",
            "铖昌减值约1497.57万元减少前三季度利润总额，应提高财务风险权重；盘中回收不能抵消减值与参数缺失。",
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
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note", "ex_dividend_reference", "ex_dividend_date"}}
        item.update(UPDATES[item["code"]])
        holdings.append(enrich(item, market))
    review = build_review(prior, market)
    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive = ARCHIVE / f"automation_2_holdings_{stamp}.html"
    review_archive = ARCHIVE / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-10-23完整收盘。澜起使用未复权day序列，除息后实际收180.00。",
        "A股：沪指+0.89%、深成指+2.79%、创业板+4.16%、科创50+3.04%，成交约1.9563万亿元；4476股上涨、885股下跌、涨停约82、跌停约7，早盘冰点后午后机器人/科技全面修复。",
        "港股：恒指+0.69%、恒生科技+2.05%、国企指数+0.87%；宁德-H反弹5.44%至356.80，阿里仅涨0.46%至97.80。",
        "外围：10月23日SPY -0.53%、DIA -1.24%、QQQ近乎持平、SOXX +0.57%；IEF -0.15%、TLT -0.49%、UUP +0.21%，海外未充分确认A股强修复。BABA ADR再跌2.15%。",
        "新易盛正式回购：董事会批准8亿至10亿元、价格上限500元/股、预计160万至200万股/总股本0.11%-0.14%、期限12个月，回购账户已开立。",
        "澜起回购结果：维护价值回购208.80万股、0.17%，实际金额4.10228亿元、均价196.47元；新3亿至5亿元回购提议仍待10月29日董事会。",
        "铖昌：前三季度资产减值准备合计1497.57万元，将等额减少利润总额，对经营现金流无影响；数据未经审计。",
        "公告复核：除新易盛正式回购、澜起回购结果、铖昌减值与限制性股票回购注销、雅克增资延续外，其余持仓周末未见改变经营事实的重大新增公告。",
        "宏观雷达：MSS46、MBS55、FRS43、TES65、ET29，RadarScore52.4；由S0升级S2冰点转折，但单日强修复和机器人拥挤令06:00预警维持橙色。",
        "高位筛查：绿的5日涨幅约22.5%且放量，满足橙色不加仓条件；新易盛、宁德和联瑞此前高位踩踏标签只转修复观察，尚未解除。",
        "财报源：宁德正式Q3报告及LSEG SmartEstimate、澜起Q3预告、A股正式半年报、阿里截至2026-06-30季度业绩。没有可靠一致预期时不把同比高增硬判超预期。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=300502&id=12655757 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=688008&id=12657491 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=001270&id=12658011 ; https://news.10jqka.com.cn/20261023/c681020629.shtml ; https://www.nbd.com.cn/articles/2026-10-23/4614783.html ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-26 06:00；使用10月23日A股/港股完整收盘、周末公告与周五美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：宏观雷达橙色、S2冰点转折，但本组合仍维持红色防守。周五A/H出现强力深V，允许将纯防守升级为修复观察；但机器人单主题高度拥挤、海外科技未充分确认，组合内新易盛/宁德/联瑞仍处踩踏后首日修复，阿里ADR继续下跌。组合覆盖上限仍为20%、新增仓位为0；至少等待今日宽度与关键位再守一日后，才考虑降低总风险。",
        "top_attention": [
            {"name": "新易盛", "reason": "正式8亿至10亿元回购方案落地，但仅占总股本0.11%-0.14%；低236.10后收261，集中度最高且仍是踩踏后首日修复。"},
            {"name": "绿的谐波", "reason": "单日涨12.05%至290、5日约+22.5%，机器人约40股涨停；触发橙色高位题材预警，只持有/做T、不加仓。"},
            {"name": "宁德时代-H", "reason": "低326后反弹5.44%结束七连跌，但Q3不及LSEG预期未变、尚未收361/380，禁止抄底。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-26", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>宏观由S0升级S2，但组合仍为红色修复观察。</b>周五深V只完成首日确认；新易盛、宁德和联瑞的高位踩踏风险尚未解除。绿的单日涨12.05%、5日约22.5%且机器人约40股涨停，满足橙色预警：不加仓，只持有或做T，弱转强失败即减仓。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合上限仍20%、新增仓位为0；周五反弹只升级观察，至少再守一日才降低总风险。</li><li>新易盛看258/250/236，宁德看338/326/320，联瑞看90/86.3/85；跌破继续减风险。</li><li>绿的看275/268/258，5日涨约22.5%且放量，禁止追高和加仓。</li><li>澜起今日守180并收181.9/185才延续修复；正式回购和Q3预增均不得逆总阀门追价。</li><li>铖昌减值约1497.57万元提高财务风险；阿里ADR续跌，H股未收100前维持红色。</li></ul></section>',
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
