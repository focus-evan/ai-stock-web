from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261109 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261110.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月9日涨2.27%至176.00，通信行业主力净流入约32.71亿元，其中新易盛约9.05亿元居首；累计回购约8亿元与在手订单充足提供底部承接。",
        "bear": "盘中高184.12后回落，收盘仍未收180/185；3日累计跌10.43%，组合集中度、现金流/存货与CPO修复持续性风险未消。",
        "message_level": "资金回流 + 未收180",
        "judgement": "中性",
        "action": "红色强防守；看171.6/169/165/161.2，失165继续降集中度；收180/185只算止跌，190并守位才修复。",
        "risk_level": "红色",
        "risk_note": "资金回流只形成盘中承接，尚未收复首层趋势线，集中度风险不降。",
    },
    "688008": {
        "bull": "Q3经营、Q4订单与回购逻辑未变；11月9日低147.48仍高于143.10前低。",
        "bear": "收149.67、微跌0.29%，盘中高154.70后回落且未收150/155；股东减持窗口与交易弱势继续压制。",
        "message_level": "高154.7回落 + 未收150",
        "judgement": "利空",
        "action": "红色强防守；看147.5/145/143.1，失143继续减风险；收150/155只算止跌，159并守位才修复。",
        "risk_level": "红色",
        "risk_note": "公司层强、价格层弱的背离未收敛，反抽未形成收盘确认。",
    },
    "688017": {
        "bull": "11月9日涨3.91%至296.20，收回286并盘中高305.68；Q3超预期与具身智能增长逻辑重新获得首日价格修复。",
        "bear": "高305.68后回落且未收299，经营现金流弱与高估值仍限制修复；指数宽度仍偏弱。",
        "message_level": "首日收回286 + 305.68回落",
        "judgement": "利多",
        "action": "橙色修复观察；看290.5/286/278，失286转红；收299/305并守位后再上调，禁止追高。",
        "risk_level": "橙色",
        "risk_note": "业绩层强与价格首日修复共振，但尚未通过次日守位。",
    },
    "688012": {
        "bull": "4亿至5亿元回购方案、Q3扣非增长和国产替代平台逻辑继续提供承接；11月9日低247.25仍守242下层风险线。",
        "bear": "跌2.36%至248.00并失250，高258.42后回落；Q3非经常收益放大、经营现金流为负，回购方案仍未见实际实施公告。",
        "message_level": "守242但失250 + 回购待实施",
        "judgement": "中性",
        "action": "橙色相对强观察；看247/242/238，失242转红；收250/258只算修复，263/265附近不追。",
        "risk_level": "橙色",
        "risk_note": "相对强仍在，但失250且回购未实施，维持橙色不追。",
    },
    "002837": {
        "bull": "11月9日收37.42、低37.39，未再创新低；17亿元外汇套保额度有助管理海外汇率敞口。",
        "bear": "仅涨0.24%且仍未收37.8/38.8；Q3增收不增利、前三季度归母下降、毛利率下滑与存货较年初+154.95%未变。",
        "message_level": "未创新低 + 37.8未复",
        "judgement": "利空",
        "action": "红色观察；看37.3/36.2/36，失36减风险；收37.8/38.8只算止跌，40.6并守位才修复。",
        "risk_level": "红色",
        "risk_note": "止跌信号弱，经营质量约束仍高于风险管理利多。",
    },
    "03750.HK": {
        "bull": "宁德时代与中铝集团达成战略合作，覆盖有色新材料、再生金属、绿电直连与储能、高海拔源网荷储及全球产业链配套；属于长期产业协同。",
        "bear": "11月9日跌2.68%至369.80并失370，低367.20；协议未披露订单金额，Q3不及LSEG预期和现金流下降未变，电池板块主力净流出约26.54亿元。",
        "message_level": "中铝战略合作 + 失370",
        "judgement": "中性",
        "action": "红色防守观察；看367.2/360/357，失367继续降风险；收370/377只算止跌，382并守位才修复。",
        "risk_level": "红色",
        "risk_note": "中长期合作未形成短期价格确认，失370触发上一版降级条件。",
    },
    "09988.HK": {
        "bull": "H股11月9日低104.50后收104.60，连续守103.3；Apple智能接入千问的产品催化仍在。",
        "bear": "盘中高108.10后回落，未收105；隔夜BABA ADR跌3.72%，千问调用量、收费与利润贡献仍未披露。",
        "message_level": "守103.3 + ADR跌3.72%",
        "judgement": "中性",
        "action": "橙色相对强观察；看103.3/100/98.9，失103.3降风险；收105/108.1后仍需守109/112。",
        "risk_level": "橙色",
        "risk_note": "H股守位但ADR回落，跨市场确认不足，维持橙色。",
    },
    "002409": {
        "bull": "11月9日低85.67后收85.76，仍守82.7；半导体材料长期逻辑和华飞电子增资未变。",
        "bear": "盘中高91.43后回落、仅涨0.11%，仍未收86；Q3略低于申万宏源预期，板块修复未转化为收盘确认。",
        "message_level": "高91.43回落 + 86未复",
        "judgement": "利空",
        "action": "红色观察；看85.7/83.7/82.7，失82.7减风险；收86/90只算止跌，92并守位才修复。",
        "risk_level": "红色",
        "risk_note": "盘中反抽未形成收盘突破，业绩预期差继续压制。",
    },
    "688300": {
        "bull": "11月9日涨0.44%至80.25、首日收回80；Q3超预期与高端粉体放量逻辑未变。",
        "bear": "高82.82后回落，盘中低78.16再贴77.8；可转债筹码与10亿元扩产融资风险仍在。",
        "message_level": "首日收回80 + 高位回落",
        "judgement": "中性",
        "action": "橙色修复观察；看80/78.2/77.8，失77.8转红；收82.8/84.3并守位才上调。",
        "risk_level": "橙色",
        "risk_note": "只完成首日收回关键位，按规则从纯防守升级为修复观察。",
    },
    "001270": {
        "bull": "11月9日涨4.15%至88.27，首日收回86/87.4；商业航天和低空应用逻辑继续提供题材弹性。",
        "bear": "高93.23后明显回落，Q3归母同比-44.43%、减值、可交换债筹码与持仓参数缺失未消；股东会续聘审计机构不改变经营判断。",
        "message_level": "首日收回87.4 + 高93.23回落",
        "judgement": "中性",
        "action": "橙色高波动观察；看87.4/86/82.5，失86转红；收90/93.2并守位才修复，禁止追题材。",
        "risk_level": "橙色",
        "risk_note": "首日修复有效但上影明显，基本面与筹码弱项未解除。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "涨2.27%至176、未收180", "S0不追与关键位约束有效；资金回流不足以升级。"),
    "688008": ("完全有效", "跌0.29%至149.67、高154.7回落", "经营强与价格弱背离未改善。"),
    "688017": ("修复有效需上调观察", "涨3.91%至296.20、收回286", "Q3超预期重新获价格反馈，需次日守位。"),
    "688012": ("完全有效", "跌2.36%至248、守242", "橙色不追与回购待实施约束有效。"),
    "002837": ("完全有效", "微涨至37.42、仍未收37.8", "止跌弱，红色经营约束有效。"),
    "03750.HK": ("完全有效", "跌2.68%至369.8、失370", "橙色不追与失位降级规则有效。"),
    "09988.HK": ("完全有效", "微跌至104.6、守103.3", "相对强守位但未突破，橙色约束有效。"),
    "002409": ("完全有效", "微涨至85.76、未收86", "盘中冲高未确认，红色约束有效。"),
    "688300": ("修复有效需上调观察", "涨0.44%至80.25、首日收80", "首日收回关键位，只上调为修复观察。"),
    "001270": ("修复有效需上调观察", "涨4.15%至88.27、首日收87.4", "题材修复有效，等待下一交易日守位。"),
}


MACRO_RADAR = {
    "date": "2026-11-10",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 5,
    "triggers": [
        "11月9日指数窄幅分化：沪指+0.32%、深成指/创业板各-0.27%、科创50+0.30%，但约2242股上涨、3148股下跌，属于指数与宽度背离。",
        "成交缩至约1.48万亿元；涨停约54、封板率约51.9%，连板晋级率28.1%但2板以上晋级仅9.1%，修复质量偏弱。",
        "隔夜SPY+2.36%、QQQ+3.45%、SOXX+7.51%，但NVDA-4.30%、BABA ADR-3.72%，外围指数修复与核心个股继续分化。",
    ],
    "opening_scenario": "费半大涨可能带来半导体/CPO高开，但NVDA下跌和A股宽度偏弱意味着高开兑现风险仍高；上涨家数重回3000且核心守位前，只按修复观察。",
    "state": "S1 冰点观察",
    "radar_score": 35.1,
    "MSS": 42,
    "MBS": 32,
    "FRS": 30,
    "TES": 34,
    "ET": 16,
    "position_ceiling": "S1标准总仓20%-35%；组合科技同变量集中且多数持仓未完成收盘确认，组合覆盖上限继续10%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只观察绿的/联瑞/铖昌首日修复与中微相对强；弱反抽降低新易盛、澜起等暴露。",
    "blocked": "禁止追费半映射、追盘中上影或因SOXX单日大涨恢复仓位；禁止把战略合作/回购方案提前计入利润。",
    "focus": "09:45观察上涨家数能否回到3000、CPO/半导体承接及新易盛180、澜起150/155、绿的286、中微250。",
    "downgrade": "若上涨家数低于1800、NVDA弱势传导为科技高开低走，或新易盛失169/澜起失145，则退回S0；升级需完整收盘守位。",
    "v231_link": "经营分保持稳定；绿的/联瑞超预期只提高公司层信心，交易层仍需二日确认。宁德战略合作未披露金额，不计入当前利润锚。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-09"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-09":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-09")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-09", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-09完整A股与港股收盘验证上一版06:00判断；隔夜美股11月9日表现仅用于新一版预警。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 7, "useful_but_conservative": 0,
            "repair_upgrade": 3, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 3,
            "main_read": "市场从S0极端退潮转入弱修复，但指数与宽度背离、量能缩至1.48万亿元。新易盛、澜起等仍未收复关键位；绿的、联瑞、铖昌完成首日修复，分类为修复有效需上调观察。红色总阀门作为仓位约束继续有效。",
        },
        "items": items,
        "logic_corrections": [
            "上涨家数回升但仍少于下跌家数，指数小涨不能视作宽度修复，宏观仅由S0升至S1冰点观察。",
            "通信/电子资金回流改善局部承接，但新易盛高184.12回落、澜起高154.7回落，资金流入不等于趋势确认。",
            "绿的、联瑞、铖昌只完成首日收回关键位，必须等待下一完整交易日守位。",
            "宁德失370触发降级；中铝战略合作属于产业催化，不提前计入利润。",
            "SOXX大涨而NVDA/BABA下跌说明外围内部仍分化，不能解除组合科技同变量约束。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-09完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指+0.32%、深成指-0.27%、创业板-0.27%、科创50+0.30%；约2242股上涨、3148股下跌，沪深成交约1.48万亿元；涨停约54、封板率约51.9%、连板晋级率约28.1%。",
        "资金结构：元件、通信设备、消费电子主力资金分别净流入约38.42亿、37.34亿、26.55亿元，半导体净流入约23.12亿元；电池净流出约26.54亿元。",
        "港股：恒指-0.13%至24448.95、恒生科技-0.92%至4040.73；宁德-H -2.68%至369.80，阿里-W -0.29%至104.60。",
        "外围：美东11月9日SPY +2.36%、QQQ +3.45%、SOXX +7.51%、DIA +2.16%；但NVDA -4.30%、BABA ADR -3.72%，IEF -0.07%、UUP -0.57%，外围指数与核心个股明显分化。",
        "宁德时代：11月8日公司官网披露与中铝集团达成战略合作，覆盖有色新材料、再生金属、绿电直连与储能、高海拔源网荷储、全球产业链配套；未披露订单金额，按中长期产业催化处理。",
        "公司公告复核：除宁德战略合作与铖昌股东会通过续聘审计机构外，其余持仓截至06:00未见改变经营事实的重大新增公告；中微4亿至5亿元回购方案仍未见实际实施公告。",
        "高位筛查：全部10只持仓3日涨幅未超过25%、5日涨幅未超过35%。绿的/联瑞/铖昌首日收回关键位，标橙修复观察；中微/阿里橙色相对强；新易盛、澜起、英维克、雅克与失370的宁德维持红色。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://finance.eastmoney.com/a/202611093926229186.html ; https://www.dabanke.com/ ; https://finance.sina.com.cn/stock/hkstock/ggscyd/2026-11-09/doc-iniycrzy3251301.shtml ; https://apnews.com/article/d938f8e6ff42b3706e1d36e6245ec56b ; https://www.catl.com/news/10361.html",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-10 06:00；使用11月9日A股/港股完整收盘、收盘后公告与美东11月9日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S1冰点观察。11月9日沪指/科创50小涨但约3148股下跌、成交缩至1.48万亿元，宽度确认不足；隔夜SOXX大涨7.51%但NVDA跌4.30%、BABA ADR跌3.72%，外围继续分化。组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；只验证修复，不追高。",
        "top_attention": [
            {"name": "新易盛", "reason": "通信资金回流且个股获主力净流入约9.05亿元，但高184.12回落、未收180；组合集中度最高，171.6/169是防守线。"},
            {"name": "澜起科技", "reason": "Q3/Q4订单与回购均强，但高154.70回落、收149.67，经营强与价格弱背离尚未收敛。"},
            {"name": "宁德时代-H", "reason": "中铝战略合作带来材料/储能长期协同，但H股失370且电池板块资金流出；合作未披露金额，367.2为即时防守。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-10", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>指数修复但宽度不足，组合总阀门继续红色。</b>11月9日沪指/科创50小涨但约3148股下跌、成交缩至1.48万亿元；隔夜SOXX大涨而NVDA跌4.30%、BABA ADR跌3.72%，外围内部仍分化。绿的、联瑞、铖昌只完成首日修复；新易盛、澜起仍未收复首层关键位，宁德失370。今日只验证修复，不追高、不新增仓位。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；费半映射高开不追。</li><li>新易盛看171.6/169/165，澜起看147.5/145/143.1；失位继续降科技同变量暴露。</li><li>绿的看290.5/286，中微看247/242，英维克看37.3/36，雅克看85.7/82.7，联瑞看80/77.8，铖昌看87.4/86。</li><li>宁德看367.2/360，阿里看103.3/100；战略合作与Apple催化均不得提前计入利润。</li><li>09:45若上涨家数低于1800或科技高开低走，退回S0；只有完整收盘守位，下一版才考虑降低组合风险。</li></ul></section>',
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
