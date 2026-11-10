from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261110 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261111.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月10日涨4.43%至183.80，首日收回180；累计回购约8亿元、在手订单充足与通信设备资金回流继续提供承接。",
        "bear": "高191.51后回落并未收185/190，说明上方抛压仍重；隔夜NVDA再跌5.53%，组合集中度、现金流与存货风险未消。",
        "message_level": "首日收180 + 高191.51回落",
        "judgement": "中性",
        "action": "橙色修复观察；看183/180/176，失180转红；收185/190并守位后才上调，禁止追费半映射。",
        "risk_level": "橙色",
        "risk_note": "只完成首日收回180，按规则从纯防守升级为修复观察。",
    },
    "688008": {
        "bull": "11月10日涨3.43%至154.80，首日收回150；Q3经营、Q4订单与回购逻辑继续提供公司层支撑。",
        "bear": "盘中高158.20后回落，收盘仍略低于155；股东减持窗口与经营强/价格弱背离未解除，隔夜高估值科技再分化。",
        "message_level": "首日收150 + 155未复",
        "judgement": "中性",
        "action": "橙色修复观察；看154/150/147.5，失150转红；收155/159并守位才修复。",
        "risk_level": "橙色",
        "risk_note": "价格首日回到150上方，但尚未通过155和次日守位。",
    },
    "688017": {
        "bull": "11月10日再涨2.21%至302.76，连续第二日守286并首次收上299；Q3超预期与机器人主线13只涨停形成经营/行业共振。",
        "bear": "盘中高315.95后回落，5日涨16.88%；经营现金流弱、高估值与机器人明牌后的兑现风险仍需约束。",
        "message_level": "二日守286 + 首收299 + 高315.95回落",
        "judgement": "利多",
        "action": "橙色偏强观察；看300/296/290.5，失296降风险；315附近不追，守305/315后再上调。",
        "risk_level": "橙色",
        "risk_note": "业绩和价格修复延续，但上影、高估值与现金流限制追高。",
    },
    "688012": {
        "bull": "4亿至5亿元回购方案、Q3扣非增长与国产替代平台逻辑未变；11月10日低244.35仍守242下层风险线。",
        "bear": "跌0.94%至245.66并继续失247/250，盘中高255.55后回落；回购仍未见实际实施，隔夜NVDA跌5.53%、美债收益率上行。",
        "message_level": "守242但失250 + 回购待实施",
        "judgement": "中性",
        "action": "橙色观察；看245/242/238，失242转红；收250/255只算修复，263附近不追。",
        "risk_level": "橙色",
        "risk_note": "公司层承接仍在，但价格未收250且外围核心AI走弱。",
    },
    "002837": {
        "bull": "11月10日涨5.24%至39.38，首日收回37.8/38.8；17亿元外汇套保额度和算力基础设施修复提供边际支撑。",
        "bear": "盘中高39.88仍未收40.6，Q3增收不增利、前三季度归母下降、毛利率下滑与存货较年初+154.95%不变。",
        "message_level": "首日收回38.8 + 40.6未复",
        "judgement": "中性",
        "action": "橙色修复观察；看38.8/37.8/37.3，失37.8转红；收40.6并守位才修复。",
        "risk_level": "橙色",
        "risk_note": "价格完成首日修复，但经营质量和库存风险尚未改善。",
    },
    "03750.HK": {
        "bull": "11月10日涨2.22%至378.00，首日收回370/377；中铝战略合作、回购注销与储能/材料产业协同继续支撑。",
        "bear": "盘中高381.60仍未收382，Q3不及LSEG预期和现金流下降未变；隔夜通胀偏高、利率上行压制风险资产。",
        "message_level": "首日收回377 + 382未复",
        "judgement": "中性",
        "action": "橙色修复观察；看377/373/370，失370转红；收382/395并守位才上调。",
        "risk_level": "橙色",
        "risk_note": "只完成首日收回关键位，战略合作不提前计入利润。",
    },
    "09988.HK": {
        "bull": "Apple智能接入千问的产品催化仍在，11月10日低100.50后未失100。",
        "bear": "跌2.87%至101.60并失103.3，隔夜BABA ADR再跌2.56%；千问调用量、收费和利润贡献未披露，催化继续兑现。",
        "message_level": "失103.3 + ADR再跌2.56%",
        "judgement": "利空",
        "action": "红色防守；看100.5/100/98.9，失100减风险；收103.3/105只算止跌，109/112并守位才修复。",
        "risk_level": "红色",
        "risk_note": "跨市场同步走弱并失103.3，触发上一版降级条件。",
    },
    "002409": {
        "bull": "11月10日低85.55后收85.97，仍守82.7；半导体材料长期逻辑和华飞电子增资未变。",
        "bear": "高88.59后回落、仅涨0.24%，仍未有效收86；Q3略低于申万宏源预期，隔夜NVDA与利率压力仍在。",
        "message_level": "守82.7但86未确认",
        "judgement": "利空",
        "action": "红色观察；看85.5/83.7/82.7，失82.7减风险；收86/88.6只算止跌，92并守位才修复。",
        "risk_level": "红色",
        "risk_note": "收盘仍处86临界下方，业绩预期差与外围压力未解除。",
    },
    "688300": {
        "bull": "11月10日涨3.71%至83.23，连续第二日守80并收上82.8；Q3超预期与高端粉体放量得到二日价格确认。",
        "bear": "高86.95后回落且未收84.3，可转债筹码和10亿元扩产融资风险仍在。",
        "message_level": "二日守80 + 首收82.8",
        "judgement": "利多",
        "action": "橙色修复观察；看82.7/80/78.2，失80降风险；收84.3/87并守位后再上调。",
        "risk_level": "橙色",
        "risk_note": "二日关键位确认有效，但上层压力和筹码风险仍需观察。",
    },
    "001270": {
        "bull": "11月10日再涨3.14%至91.04，连续第二日守86并首次收上90；商业航天和机器人题材扩散增强。",
        "bear": "盘中高92.31仍低于前日93.23，Q3归母同比-44.43%、减值、可交换债筹码与持仓参数缺失未消。",
        "message_level": "二日守86 + 首收90",
        "judgement": "利多",
        "action": "橙色高波动观察；看90/88.9/87.4，失87.4降风险；93.2附近不追，守位后再上调。",
        "risk_level": "橙色",
        "risk_note": "题材修复延续，但基本面和筹码弱项限制风险等级。",
    },
}


REVIEW_META = {
    "300502": ("修复有效需上调观察", "涨4.43%至183.80、首日收180", "从红色纯防守上调为橙色修复观察，等待守位。"),
    "688008": ("修复有效需上调观察", "涨3.43%至154.80、首日收150", "首次收回下层关键位，等待155与次日确认。"),
    "688017": ("完全有效", "涨2.21%至302.76、二日守286", "Q3超预期与修复方向延续，橙色不追仍有效。"),
    "688012": ("完全有效", "跌0.94%至245.66、守242", "橙色承接与回购待实施约束有效。"),
    "002837": ("修复有效需上调观察", "涨5.24%至39.38、首日收38.8", "首日收回关键位，上调为修复观察。"),
    "03750.HK": ("修复有效需上调观察", "涨2.22%至378、首日收377", "首日收回关键位，战略催化仅作观察。"),
    "09988.HK": ("完全有效", "跌2.87%至101.60、失103.3", "橙色风险与失位降级规则完全有效。"),
    "002409": ("完全有效", "微涨至85.97、仍处86临界", "红色业绩/外围约束有效。"),
    "688300": ("完全有效", "涨3.71%至83.23、二日守80", "Q3超预期修复延续，橙色观察有效。"),
    "001270": ("完全有效", "涨3.14%至91.04、二日守86", "题材修复延续，橙色不追有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-11",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 4,
    "triggers": [
        "11月10日A股广泛修复：沪指+0.08%、深成指+0.86%、创业板+1.46%、科创50+0.64%，约4273股上涨、1149股下跌，涨停93、跌停0、封板率约83%。",
        "成交约1.52万亿元，较5日均量仍低约16.4%；机器人13只涨停、AI应用9只涨停，修复强但量能与主线集中度仍需次日确认。",
        "隔夜美国通胀高于预期：SPY-0.36%、QQQ-0.65%、SOXX-0.21%、NVDA-5.53%，IEF-0.84%、UUP+0.62%，利率/美元重新压制高估值成长。",
    ],
    "opening_scenario": "A股广度与短线生态首日转强，但隔夜NVDA和利率变量转弱；若机器人/半导体高开后宽度仍高于3000，可延续修复观察，否则优先兑现高波动反弹。",
    "state": "S2 冰点转折",
    "radar_score": 54.0,
    "MSS": 32,
    "MBS": 68,
    "FRS": 52,
    "TES": 68,
    "ET": 28,
    "position_ceiling": "S2标准总仓30%-45%；但组合科技同变量集中且A股仅完成首日广度修复，组合覆盖上限继续10%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只验证新易盛/澜起/英维克/宁德首日修复，绿的/联瑞/铖昌二日守位；弱转强失败时降风险。",
    "blocked": "禁止追机器人/半导体涨停扩散、追上影股或逆隔夜NVDA/利率压力恢复仓位。",
    "focus": "09:45观察上涨家数能否高于3000、涨停溢价及新易盛180、澜起150、绿的300、中微242、阿里100。",
    "downgrade": "若上涨家数低于1800、科技核心高开低走，或新易盛失180/澜起失150/阿里失100，则退回S1/S0；升级需下一完整交易日守位。",
    "v231_link": "经营分不因广度反弹上调；绿的/联瑞超预期与中微回购保留公司层信心，交易层必须等待次日确认。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-10"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-10":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-10")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-10", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-10完整A股与港股收盘验证上一版06:00判断；隔夜美股11月10日表现仅用于新一版预警。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 6, "useful_but_conservative": 0,
            "repair_upgrade": 4, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 4,
            "main_read": "A股广度与短线生态完成首日强修复：新易盛、澜起、英维克、宁德收回下层关键位，分类为修复有效需上调观察；绿的、联瑞、铖昌延续修复，阿里失103.3。红色总阀门作为不追涨/不加仓纪律继续有效。",
        },
        "items": items,
        "logic_corrections": [
            "上涨家数约4273、涨停93、封板率约83%，宏观由S1上调至S2冰点转折，但量能仍低于均值。",
            "新易盛、澜起、英维克、宁德只完成首日收回关键位，必须等待下一完整交易日守位。",
            "绿的、联瑞、铖昌价格修复延续，但上影与基本面/筹码弱项仍限制追高。",
            "阿里失103.3且ADR继续下跌，官方产品催化不能替代跨市场价格确认。",
            "隔夜通胀、利率与NVDA转弱提高高开兑现权重，组合上限不因A股单日普涨而放松。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-10完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指+0.08%、深成指+0.86%、创业板+1.46%、科创50+0.64%；约4273股上涨、1149股下跌，沪深北成交约1.52万亿元；涨停93、跌停0、封板率约83%。",
        "题材与资金：机器人概念约13只涨停、AI应用约9只涨停；半导体、通信设备、消费电子主力资金分别净流入约40.62亿、32.25亿、23.11亿元。",
        "港股：恒指+0.44%至24557.04、恒生科技约+1.08%；宁德-H +2.22%至378.00，阿里-W -2.87%至101.60。",
        "外围：美国10月通胀高于预期，美东11月10日SPY -0.36%、QQQ -0.65%、SOXX -0.21%、NVDA -5.53%、BABA ADR -2.56%；IEF -0.84%、UUP +0.62%，利率与美元压力回升。",
        "公司公告复核：截至06:00，全部持仓未见改变经营事实的重大新增公告；宁德中铝战略合作、新易盛约8亿元回购、中微4亿至5亿元回购方案及英维克17亿元套保额度沿用已核验口径。",
        "高位筛查：全部10只持仓3日涨幅未超过25%、5日涨幅未超过35%。绿的5日+16.88%、中微+19.37%、铖昌+14.47%，均未触发硬阈值；绿的/联瑞/铖昌橙色不追，新易盛/澜起/英维克/宁德首日修复，阿里/雅克红色。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://agu-app.com/daily/2026-11-10 ; https://www.dabanke.com/ ; https://www.tansuoguangnian.com/markets/hsi ; https://apnews.com/article/ffe205fbc4fddf65c3e8e64e740355b7 ; https://www.catl.com/news/10361.html",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-11 06:00；使用11月10日A股/港股完整收盘、收盘后公告与美东11月10日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S2冰点转折。11月10日约4273股上涨、涨停93、封板率约83%，A股完成首日广度修复；但成交仍低于均值，隔夜美国通胀偏高、NVDA跌5.53%、美元和利率上行。组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；只验证守位，不追高。",
        "top_attention": [
            {"name": "新易盛", "reason": "首日收回180但高191.51回落、未收185；集中度最高，隔夜NVDA再跌5.53%，183/180守位决定修复有效性。"},
            {"name": "绿的谐波", "reason": "二日守286并首收299，Q3超预期与机器人主线共振；但高315.95回落、现金流弱和高估值未消，禁止追高。"},
            {"name": "阿里巴巴-W", "reason": "H股失103.3、ADR再跌2.56%，跨市场同步走弱；Apple千问催化仍未形成可量化利润确认。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-11", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>A股完成首日广度修复，但组合总阀门仍为红色。</b>约4273股上涨、涨停93、封板率约83%，新易盛、澜起、英维克、宁德收回下层关键位；但成交仍低于均值，隔夜美国通胀偏高、NVDA跌5.53%、美元与利率上行。阿里失103.3，绿的高315.95回落。今日只验证守位，不追机器人/半导体扩散，不新增仓位。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；机器人/半导体高开不追。</li><li>新易盛看183/180，澜起看154/150；失下层关键位恢复红色并降科技同变量暴露。</li><li>绿的看300/296，中微看245/242，英维克看38.8/37.8，雅克看85.5/82.7，联瑞看82.7/80，铖昌看90/87.4。</li><li>宁德看377/373/370，阿里看100.5/100；失位按红色处理，战略合作与Apple催化不提前计入利润。</li><li>09:45若上涨家数低于1800或科技高开低走，退回S1/S0；只有完整收盘守位，下一版才考虑降低组合风险。</li></ul></section>',
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
