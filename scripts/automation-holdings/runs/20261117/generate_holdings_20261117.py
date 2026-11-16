from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261116 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261117.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "累计约8亿元回购、在手订单与CPO长期需求逻辑未变，盘后未见重大新增公司层利空。",
        "bear": "11月16日再跌11.08%至166.80，失186/180/176并接近日低；科创综指跌5.41%、跌停64，隔夜SOXX跌5.42%、NVDA跌4.11%，现金流/存货、CPO退潮与外围冲击三重叠加。",
        "message_level": "再跌11.08% + 失全部支撑 + SOXX -5.42%",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看165/161/155，失161继续减风险；反抽176/180先看减压，不追。",
        "risk_level": "红色",
        "risk_note": "经营质量弱项、CPO高位退潮和海外半导体暴跌满足三项红色条件。",
    },
    "688008": {
        "bull": "Q3经营、Q4订单、回购与DDR5/RDIMM长期逻辑未变；盘后仅有H股翌日披露报表，未见重大新增经营利空。",
        "bear": "11月16日再跌7.41%至139.79，失150/147.5/143；减持窗口、半导体退潮与隔夜SOXX/NVDA大跌同时存在。",
        "message_level": "再跌7.41% + 失143 + 外部半导体暴跌",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看137.8/135/130，失135继续减风险；收143/147.5只算止跌。",
        "risk_level": "红色",
        "risk_note": "筹码压力、板块退潮和外部半导体暴跌满足三项红色条件。",
    },
    "688017": {
        "bull": "Q3超预期的经营证据未变，盘后未见重大新增公司层利空。",
        "bear": "11月16日跌5.87%至265.26，失278/270并低见263；机器人前排分化、经营现金流弱和高估值风险叠加隔夜科技下跌。",
        "message_level": "失278/270 + 机器人分化 + 高估值科技跌",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看263/255/250，失255继续减风险；收270/278只算止跌。",
        "risk_level": "红色",
        "risk_note": "基本面弱项、机器人退潮和外部高估值科技承压继续满足三项红色条件。",
    },
    "688012": {
        "bull": "2027提质增效方案披露的前三季度营收+28.08%、LPCVD/ALD重复订单、薄膜设备超500反应台及EPI量产验证仍是经营证据；4亿至5亿元回购提供中长期承接。",
        "bear": "11月16日跌5.16%至233.20，失245/242/238，低见230.01；行动方案不构成承诺，研发强度、扩产品线与并购整合压力未变，隔夜SOXX跌5.42%。",
        "message_level": "失245/242/238 + 行动方案难抵S7 + SOXX -5.42%",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看230/222/218，失222继续减风险；收238/242只算止跌。",
        "risk_level": "红色",
        "risk_note": "现金流/非经常收益弱项、半导体退潮和外部冲击满足三项红色条件；经营分不因价格下跌改写。",
    },
    "002837": {
        "bull": "算力基础设施与液冷长期需求未变，盘后未见重大新增公司层利空。",
        "bear": "11月16日再跌9.18%至34.84，失38.1/37.3/36.2；前三季度利润下降、毛利率下滑和存货较年初+154.95%未改善，液冷/CPO与海外AI继续退潮。",
        "message_level": "再跌9.18% + 失全部支撑 + 经营弱",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看34.6/33.5/32，失33.5继续减风险；反抽36.2/37.3不追。",
        "risk_level": "红色",
        "risk_note": "经营质量、板块退潮和海外AI暴跌继续满足三项红色条件。",
    },
    "03750.HK": {
        "bull": "A股持续回购并拟注销、储能和材料协同提供中长期支撑；11月16日低361.20后收366.40，尚未失360。",
        "bear": "H股再跌0.92%并收在367下方，恒生科技跌0.30%；Q3不及LSEG预期、现金流下降与隔夜全球科技大跌未变。",
        "message_level": "失367 + 全球科技继续跌 + 业绩预期差",
        "judgement": "利空",
        "action": "红色防守；看361/350/340，失350继续减风险；收367/374只算止跌。",
        "risk_level": "红色",
        "risk_note": "回购和产业协同不能覆盖价格失位、业绩预期差与全球成长股压力。",
    },
    "09988.HK": {
        "bull": "H股11月16日仅跌0.44%至90.15、仍守89.8；9月季度业绩将于11月19日公布，可验证云/AI与电商投入的利润转化。",
        "bear": "隔夜BABA ADR跌3.98%至90.62，H股仍未收回93.3；业绩前无可靠一致预期，恒生科技和全球风险偏好偏弱。",
        "message_level": "H股守89.8但ADR -3.98% + 业绩临近",
        "judgement": "利空",
        "action": "红色防守；看89.8/88/85，失88继续减风险；收93.3/98.9只算止跌，业绩前不摊低。",
        "risk_level": "红色",
        "risk_note": "H股短线抗跌不改变ADR走弱、业绩事件风险和全局退潮。",
    },
    "002409": {
        "bull": "半导体材料长期逻辑未变，盘后未见重大新增公司层利空。",
        "bear": "11月16日跌8.15%至79.30，失86/83.7/82.7；Q3略低于申万宏源预期，半导体退潮与隔夜SOXX跌5.42%叠加。",
        "message_level": "跌8.15% + 失全部支撑 + SOXX -5.42%",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看78.8/76/74，失76继续减风险；收82.7/83.7只算止跌。",
        "risk_level": "红色",
        "risk_note": "业绩预期差、半导体退潮和外部暴跌满足三项红色条件。",
    },
    "688300": {
        "bull": "约10亿元四川半导体粉体项目仍是长期产能期权，Q3超预期逻辑未变，盘后未见新的项目进展公告。",
        "bear": "11月16日再跌8.92%至73.31，失80/78.2并低见72.77；项目用地、审批、一期约6亿元资金与可转债压力未解，外部半导体继续暴跌。",
        "message_level": "再跌8.92% + 失78.2 + 项目融资/外部风险",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看72.8/70/68，失70继续减风险；收78.2/80只算止跌。",
        "risk_level": "红色",
        "risk_note": "项目期权未转为利润，扩产融资、板块退潮和外部科技暴跌继续满足三项红色条件。",
    },
    "001270": {
        "bull": "商业航天与机器人长期映射未变，盘后未见重大新增公司层利空。",
        "bear": "11月16日跌停至76.67，失84.8/82.9/80；Q3归母同比-44.43%、减值与可交换债筹码压力未消，机器人高位分化加剧。",
        "message_level": "跌停 + 失全部支撑 + Q3利润下滑",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看75.6/72/69，跌停打开后的反抽只减风险；收80/82.9只算止跌。",
        "risk_level": "红色",
        "risk_note": "经营弱项、筹码压力和机器人退潮满足高位踩踏条件，跌停确认流动性风险。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌11.08%至166.8、失180/176", "S7只减不加和失位降风险条件完全有效。"),
    "688008": ("完全有效", "跌7.41%至139.79、失143", "红色防守与失147.5/143降风险条件触发。"),
    "688017": ("完全有效", "跌5.87%至265.26、失278/270", "红色踩踏与失位减风险约束准确。"),
    "688012": ("完全有效", "跌5.16%至233.2、失242/238", "行动方案不构成买点、关键位约束有效。"),
    "002837": ("完全有效", "跌9.18%至34.84、失37.3", "红色只减不加和失位条件完全有效。"),
    "03750.HK": ("完全有效", "跌0.92%至366.4、失367", "红色防守与失367条件触发。"),
    "09988.HK": ("完全有效", "跌0.44%至90.15、守89.8", "红色业绩前不摊低纪律有效，抗跌不等于修复。"),
    "002409": ("完全有效", "跌8.15%至79.3、失82.7", "红色失位降风险条件完全有效。"),
    "688300": ("完全有效", "跌8.92%至73.31、失78.2", "战略期权不计买点和失位降风险约束有效。"),
    "001270": ("完全有效", "跌停76.67、失80", "红色高位踩踏与流动性风险判断完全有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-17",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 12,
    "triggers": [
        "11月16日五大指数再跌：上证-0.87%、深证-2.53%、创业板-4.37%、科创综指-5.41%；约1118股上涨、4171股下跌，连续第三日宽度严重偏弱。",
        "成交缩至约1.48万亿元，涨停32、跌停64。昨日涨停股平均+0.99%、晋级率改善只是少数接力岛屿，无法覆盖跌停扩散和科技持仓普遍长阴。",
        "隔夜SPY -1.90%、QQQ -2.65%、SOXX -5.42%、NVDA -4.11%、BABA ADR -3.98%；美元继续偏强，A股高估值科技面临新的外部传导。",
    ],
    "opening_scenario": "A股科技已出现流动性踩踏，隔夜美股半导体再度暴跌；即使少数题材高开，若09:45上涨不足1800或跌停仍超过30，反抽只用于减风险。",
    "state": "S7 退潮确认",
    "radar_score": 11.0,
    "MSS": 25,
    "MBS": 2,
    "FRS": 5,
    "TES": 8,
    "ET": 2,
    "position_ceiling": "S7标准总仓20%-40%；但组合科技同变量暴露超过30%、A股跌停扩至64且海外半导体暴跌，组合风险预算上限由10%再降至5%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险和观察跌停打开质量；阿里H股抗跌也仅观察，中微经营证据不构成逆势加仓。",
    "blocked": "禁止抄底CPO、液冷、机器人、半导体与先进材料，禁止抢跌停反弹，禁止阿里业绩前摊低。",
    "focus": "09:45观察上涨家数、跌停数量及新易盛161、澜起135、英维克33.5、联瑞70、铖昌跌停打开质量。",
    "downgrade": "已处S7；若上涨不足1000、跌停继续超过50或科技核心再现跌停，风险预算维持5%且只减不加。解除S7需至少两个完整交易日宽度与跌停持续改善。",
    "v231_link": "价格崩跌不直接改写经营分；中微硬数据和联瑞项目期权保留，但交易时机、相对强弱和组合暴露评分继续下调。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-16"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-16":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-16")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-16", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-16完整A股与港股收盘验证上一版06:00判断；隔夜美股11月16日表现仅用于新一版预警。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 10, "useful_but_conservative": 0,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 0,
            "main_read": "上一版S7红色总阀门与全部关键位纪律在11月16日完全有效：八只A股持仓全部继续下跌，新易盛、英维克、雅克、联瑞和铖昌跌幅超过8%，铖昌跌停；宁德和阿里港股也未形成修复。红色总阀门验证的是仓位/加仓纪律，不是每只持仓跌幅预测。",
        },
        "items": items,
        "logic_corrections": [
            "下跌仍超4100家且跌停升至64，少数涨停平均收益转正不足以解除全市场S7。",
            "新易盛失176、澜起失143、英维克失36.2、雅克失82.7、联瑞失78.2、铖昌跌停，关键位纪律继续执行。",
            "阿里H股守89.8只构成相对抗跌，隔夜ADR下跌和业绩事件风险要求维持红色。",
            "隔夜SOXX/NVDA再度暴跌，组合相同宏观变量风险权重继续上调。",
            "风险预算上限由10%降至5%；解除S7至少要求两个完整交易日宽度和跌停持续改善。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-16完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：上证-0.87%、深证-2.53%、创业板-4.37%、科创综指-5.41%；约1118股上涨、4171股下跌，成交约1.48万亿元；涨停32、跌停64。",
        "短线生态：封板率约66.7%、昨日涨停股平均+0.99%、晋级率改善；但大面率22.2%、跌停64，属于少数接力岛屿而非宽度修复。",
        "港股：恒指+0.49%至23753.84、恒生科技-0.30%至3801.64；宁德-H -0.92%至366.40，阿里-W -0.44%至90.15。",
        "外围：美东11月16日SPY -1.90%、QQQ -2.65%、SOXX -5.42%、NVDA -4.11%、BABA ADR -3.98%；IEF +0.21%、UUP +0.20%。",
        "公司公告复核：澜起仅新增H股翌日披露报表；其余持仓截至06:00未见改变经营事实的重大新增公告。中微行动方案、联瑞项目、宁德回购和阿里11月19日业绩日沿用已核验口径。",
        "高位筛查：全部持仓3日/5日累计涨幅均未触发正向硬阈值；但科技板块连续退潮、跌停扩散及海外半导体暴跌同时出现。新易盛、澜起、绿的、中微、英维克、雅克、联瑞、铖昌均满足至少三项红色条件，标为高位踩踏风险。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里当前为无可靠预期，等待11月19日正式业绩。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://agu-app.com/daily/2026-11-16 ; https://www.dabanke.com/index-20261116.html ; https://finance.yahoo.com/quote/SOXX/history/ ; https://finance.yahoo.com/quote/NVDA/history/ ; https://www.alibabagroup.com/en-US/investor-relations/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-17 06:00；使用11月16日A股/港股完整收盘、盘后公告与美东11月16日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S7退潮确认。11月16日约4171股下跌、跌停64，创业板跌4.37%、科创综指跌5.41%；隔夜QQQ跌2.65%、SOXX跌5.42%、NVDA跌4.11%。少数涨停股溢价转正不能覆盖流动性踩踏。组合风险预算上限由10%降至5%，新增仓位、题材交易和摊低均为0；反抽只用于处理风险。",
        "top_attention": [
            {"name": "新易盛", "reason": "再跌11.08%并失176，三日累计-22.42%，组合集中度最高；隔夜SOXX/NVDA继续暴跌，161是下一风险位。"},
            {"name": "联瑞新材", "reason": "项目公告后连续两日急跌，11月16日再跌8.92%并失78.2；项目融资与可转债压力仍在，70是下一风险位。"},
            {"name": "阿里巴巴-W", "reason": "H股守89.8但ADR跌3.98%；11月19日业绩临近且无可靠一致预期，业绩前不摊低。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-17", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色：A股科技出现流动性踩踏，隔夜海外半导体再度暴跌。</b>11月16日约4171股下跌、跌停64，创业板跌4.37%、科创综指跌5.41%；隔夜SOXX跌5.42%、NVDA跌4.11%。新易盛失176，澜起失143，英维克失36.2，雅克失82.7，联瑞失78.2，铖昌跌停。少数涨停溢价转正只是接力岛屿，不能解除S7。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合风险预算上限降至5%，新增仓位、题材交易和摊低均为0；所有科技反抽只用于处理风险。</li><li>新易盛看165/161/155，澜起看137.8/135，英维克看34.6/33.5，联瑞看72.8/70；失位继续减同变量暴露。</li><li>绿的看263/255，中微看230/222，雅克看78.8/76，铖昌看75.6/72；跌停打开不等于反转。</li><li>宁德看361/350，阿里看89.8/88；阿里11月19日业绩前不摊低，H股抗跌不替代ADR和事件风险。</li><li>解除S7需要至少两个完整交易日上涨家数回到2500以上、跌停持续收敛且科技核心停止放量长阴。</li></ul></section>',
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
