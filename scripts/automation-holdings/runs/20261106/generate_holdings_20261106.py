from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261105 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261106.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月5日低177.64后回升收185.61，仍守185下层修复线；公司累计实施约6亿元回购，Q4产能指引未变。",
        "bear": "跌5.54%并失190，首日强反弹未守上层关键位；组合集中度最高，经营现金流/存货压力未消，隔夜QQQ跌6.33%、NVDA跌9.08%、SOXX跌12.75%直接冲击CPO估值与情绪。",
        "message_level": "失190 + 隔夜AI硬件踩踏",
        "judgement": "利空",
        "action": "红色强防守；看185/180/177.6，失180继续降集中度；收190/196.5只算止跌，200/205并守位才重新修复。",
        "risk_level": "红色",
        "risk_note": "首日修复次日只守下层，叠加海外AI踩踏和集中度，恢复红色处理。",
    },
    "688008": {
        "bull": "11月5日收163.80，低158.44仍守159附近；Q3经营、Q4订单与回购逻辑未变。",
        "bear": "跌2.40%并失164.1，二日确认不完整；9月25日股东减持计划仍在窗口，隔夜半导体指数暴跌形成直接外部压力。",
        "message_level": "失164.1 + 减持窗口 + 费半踩踏",
        "judgement": "利空",
        "action": "红色强防守；看159/155/150，失155降风险；收164.1/168只算止跌，170并守位才修复。",
        "risk_level": "红色",
        "risk_note": "经营强与交易弱仍背离，海外半导体硬风险覆盖国内二日修复。",
    },
    "688017": {
        "bull": "11月5日再涨2.62%至293.50，连续第二日守275并收上286；Q3超预期得到二日价格确认。",
        "bear": "盘中高298.94后回落，经营现金流弱、高估值仍是基本面约束；隔夜高估值AI/半导体踩踏提高物理AI方向兑现风险。",
        "message_level": "二日守275 + 外围高估值踩踏",
        "judgement": "中性",
        "action": "红色外部风险观察；看286/275/268，失275减风险；只有海外止跌且收299并守位才降低风险。",
        "risk_level": "红色",
        "risk_note": "业绩与价格完成二日确认，但高估值/现金流和外围踩踏满足红色组合条件。",
    },
    "688012": {
        "bull": "11月5日涨5.83%至254.00，连续第二日守222；公司11月5日晚通过4亿至5亿元回购方案，上限433.04元/股，拟用于股权激励或员工持股。",
        "bear": "盘中高265后回落，Q3归母受约8.08亿元非经常收益放大、经营现金流为负；隔夜SOXX跌12.75%、NVDA跌9.08%，是直接硬风险。",
        "message_level": "4亿至5亿元回购 + 隔夜SOXX跌12.75%",
        "judgement": "中性",
        "action": "红色强防守；看250/242/240，失242减风险；回购只提供承接，收265并守位且外围止跌后才修复。",
        "risk_level": "红色",
        "risk_note": "公司回购利多无法覆盖海外半导体系统性抛售与现金流/非经常收益约束。",
    },
    "002837": {
        "bull": "11月5日涨1.96%至39.58、连续第二日守37.8；公司将外汇套保最高合约价值由2亿元提高至17亿元，以匹配海外业务敞口并降低汇率风险。",
        "bear": "盘中高40.76但未收40.6；Q3增收不增利、前三季度归母下降、毛利率下滑与存货较年初+154.95%未变。套保也存在判断、操作和交易对手风险。",
        "message_level": "套保上限升至17亿元 + 40.6未收",
        "judgement": "中性",
        "action": "红色外部风险观察；看38.8/37.8/36，失37.8减风险；套保不等于利润增长，收40.6并守位后再评估。",
        "risk_level": "红色",
        "risk_note": "风险管理改善，但经营质量偏弱与海外AI基础设施回撤共振，维持红色。",
    },
    "03750.HK": {
        "bull": "11月5日再涨4.67%至394.60，连续守370并盘中高402.80；回购注销、欧洲智能家储MOU与电池主线相对强势继续支撑。",
        "bear": "近5日涨16.47%、接近400压力区；Q3不及LSEG预期和现金流下降未变，隔夜全球风险资产大跌可能引发高位波动。",
        "message_level": "连续守370 + 接近400压力",
        "judgement": "利多",
        "action": "橙色高位守位；看382/377/370，失377降风险；400/403附近不追，守住400两日才进一步上调。",
        "risk_level": "橙色",
        "risk_note": "价格连续确认且相对强，但临近压力位与全球风险偏好下降要求不追高。",
    },
    "09988.HK": {
        "bull": "11月5日放量涨8.45%至109.10，收复103.3；Apple智能接入千问进入正式开发者测试，隔夜BABA ADR逆市再涨2.66%。",
        "bear": "近5日涨13.53%，盘中高109.4后接近110压力；千问调用量、收费和利润贡献未披露，不能把产品催化直接等同业绩兑现。",
        "message_level": "收复103.3 + ADR逆市上涨",
        "judgement": "利多",
        "action": "橙色偏强观察；看105/103.3/100，失103.3降风险；110/112附近不追，守112再上调。",
        "risk_level": "橙色",
        "risk_note": "官方催化与跨市场相对强度共振，但利润验证仍缺失且短线临近压力。",
    },
    "002409": {
        "bull": "11月5日再涨7.22%至89.70，连续第二日守82.7并收上86；半导体材料链修复延续。",
        "bear": "盘中高92.03后回落且成交放大，Q3仍略低于申万宏源预期；隔夜SOXX跌12.75%对半导体材料映射构成硬压力。",
        "message_level": "二日守86 + 隔夜费半踩踏",
        "judgement": "中性",
        "action": "红色外部风险观察；看86/82.7/80，失82.7减风险；收92并守位且外围止跌后才修复。",
        "risk_level": "红色",
        "risk_note": "价格二日修复不改变Q3略低预期，外围半导体大跌覆盖交易强度。",
    },
    "688300": {
        "bull": "11月5日再涨1.52%至84.32，连续第二日守80；Q3超预期与高端粉体放量获得二日确认。",
        "bear": "高88.50回落，换手仍高；可转债筹码、10亿元扩产融资与隔夜半导体踩踏风险共振。",
        "message_level": "二日守80 + 筹码/外围共振",
        "judgement": "中性",
        "action": "红色外部风险观察；看83/80/77.8，失80减风险；收88.5并守位且外围止跌后再修复。",
        "risk_level": "红色",
        "risk_note": "业绩层强但筹码、融资与外围半导体满足红色风险组合。",
    },
    "001270": {
        "bull": "11月5日再涨1.59%至87.42，连续第二日守86，商业航天方向保持相对强。",
        "bear": "高89.80回落；Q3归母同比-44.43%、减值、可交换债筹码与持仓股数/成本缺失未消，隔夜高估值科技风险偏好骤降。",
        "message_level": "二日守86 + Q3利润下降",
        "judgement": "中性",
        "action": "红色高波动观察；看86/82.5/79.5，失82.5减风险；禁止追题材，收90并守位后才上调。",
        "risk_level": "红色",
        "risk_note": "题材价格确认与业绩/筹码弱项并存，外围风险偏好骤降触发红色处理。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌5.54%至185.61、失190但守185", "橙色不追约束有效；首日修复未完成上层守位。"),
    "688008": ("完全有效", "跌2.40%至163.80、失164.1", "经营强但价格确认不足，观察约束有效。"),
    "688017": ("完全有效", "涨2.62%至293.50、二日守275", "Q3超预期和修复方向获二日确认。"),
    "688012": ("完全有效", "涨5.83%至254.00、二日守222", "半导体修复延续，回购方案随后落地。"),
    "002837": ("完全有效", "涨1.96%至39.58、守37.8未收40.6", "中性修复判断有效，经营约束未解除。"),
    "03750.HK": ("完全有效", "涨4.67%至394.60、连续守370", "利多方向和橙色守位均有效。"),
    "09988.HK": ("完全有效", "涨8.45%至109.10、收复103.3", "Apple催化与相对强度继续验证。"),
    "002409": ("修复有效需上调观察", "涨7.22%至89.70、二日守86", "Q3略低预期未变，交易修复需上调观察。"),
    "688300": ("完全有效", "涨1.52%至84.32、二日守80", "Q3超预期获得二日价格确认。"),
    "001270": ("修复有效需上调观察", "涨1.59%至87.42、二日守86", "题材修复继续，但业绩与筹码约束保留。"),
}


MACRO_RADAR = {
    "date": "2026-11-06",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 6,
    "triggers": [
        "11月5日A股第二日普涨：沪指+0.10%、深成指+1.19%、创业板+0.87%、科创50+1.68%，约4869股上涨、624股下跌，成交约2.14万亿元。",
        "短线质量边际走弱：涨停约84只低于前日118只，晋级率约17.8%低于25%，炸板率约36.4%高于21.9%；通信行业主力净流出约41.58亿元。",
        "隔夜美股发生AI踩踏：SPY-4.35%、QQQ-6.33%、SOXX-12.75%、NVDA-9.08%，显著覆盖A股两日修复；BABA ADR逆市+2.66%仅是个股例外。",
    ],
    "opening_scenario": "A股科技大概率承受大幅低开与流动性测试；若CPO/半导体开盘失守昨日半分位且上涨家数低于1500，直接按S0减风险，不博V形。",
    "state": "S0 绝对防守（外部硬风险覆盖）",
    "radar_score": 47.6,
    "MSS": 35,
    "MBS": 70,
    "FRS": 48,
    "TES": 40,
    "ET": 35,
    "position_ceiling": "S0标准总仓0%-20%；因组合科技同变量暴露显著超过30%且海外变量反转，组合覆盖上限由15%降至10%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险：高开兑现、失位减弱项；宁德/阿里作为相对强度温度计，不新增。",
    "blocked": "禁止抄底CPO/半导体/机器人映射，禁止用中微回购或A股两日普涨抵消隔夜外部踩踏。",
    "focus": "09:45观察上涨家数、CPO/半导体跌停与成交，新易盛185/180、澜起159/155、中微250/242、雅克86/82.7。",
    "downgrade": "若上涨家数低于1000、科技核心出现批量跌停或新易盛失180/中微失242，则继续压缩风险；只有美股科技止跌且A股完整收盘守位，下一版才退出S0。",
    "v231_link": "基本面分不因隔夜价格下调，但交易时点和组合暴露折价显著上调；中微回购、绿的/联瑞超预期只保留公司层利多，不授予加仓权限。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-05"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-05":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-05")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-05", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-05完整A股与港股收盘验证上一版06:00判断；隔夜美股11月5日暴跌仅用于新一版预警，不倒灌已完成A/H收盘复盘。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 8, "useful_but_conservative": 0,
            "repair_upgrade": 2, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 2,
            "main_read": "A/H市场完成第二日宽度修复：八只判断完全有效，雅克与铖昌分类为修复有效需上调观察。红色总阀门作为仓位/加仓约束有效；隔夜美股AI踩踏属于下一版新增硬风险，不用于改写已完成的A/H复盘。",
        },
        "items": items,
        "logic_corrections": [
            "A股连续两日普涨确认国内修复，但涨停缩容、晋级率下降和炸板率上升说明短线质量并未同步强化。",
            "新易盛失190但守185、澜起失164.1但守159，均不满足进一步上调条件。",
            "中微、绿的、联瑞完成二日守位；经营层评分保持，交易层因隔夜半导体踩踏重新加大折价。",
            "宁德连续守370、阿里收复103.3且ADR逆市上涨，个股相对强度有效，但不提升组合总阀门。",
            "外部AI踩踏触发同宏观变量暴露硬约束，组合状态覆盖国内RadarScore并降为S0。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-05完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指+0.10%、深成指+1.19%、创业板+0.87%、科创50+1.68%；约4869股上涨、624股下跌，沪深京成交约2.14万亿元；涨停约84、跌停0。",
        "短线质量：涨停由118降至约84，晋级率约17.8%低于前日25%，炸板率约36.4%高于前日21.9%；通信行业主力净流出约41.58亿元，科技内部出现兑现。",
        "港股：恒指+3.67%至24796.98、恒生科技+5.55%至4154.29；宁德-H +4.67%至394.60，阿里-W +8.45%至109.10。",
        "外围：美东11月5日SPY -4.35%、QQQ -6.33%、DIA -3.50%、SOXX -12.75%、NVDA -9.08%；IEF +0.34%、UUP +0.09%。BABA ADR逆市+2.66%，但不能代表AI硬件链。",
        "中微公司：2026-11-05董事会通过回购，金额4亿至5亿元，价格上限433.04元/股，期限12个月，拟用于股权激励或员工持股；按公告方案处理，不假设已实施。",
        "英维克：新增15亿元外汇套期保值额度，最高合约价值由2亿元增至17亿元，对应保证金/权利金上限合计1.7亿元，期限一年；用于匹配海外业务汇率敞口，不属于利润承诺。",
        "澜起科技：11月5日新增H股翌日披露报表，未见改变经营事实的重大新增事项；其余持仓截至06:00未见改变经营事实的重大新增公告。",
        "高位筛查：全部10只持仓3日涨幅未超过25%、5日涨幅未超过35%；但新易盛、澜起、绿的、中微、英维克、雅克、联瑞、铖昌均有公司特定弱项与隔夜高估值科技踩踏两项共振，按红色处理。宁德/阿里维持橙色相对强观察。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://finance.eastmoney.com/a/202611053923568519.html ; https://finance.jrj.com.cn/2026/11/05160159027817.shtml ; https://finance.sina.com.cn/stock/hkstock/ggscyd/2026-11-05/doc-inixsrrq8756558.shtml ; https://apnews.com/article/7ee9c212805aa5e70cf34d25aab7a36e ; https://www.sse.com.cn/assortment/stock/list/info/announcement/index.shtml?productId=688012 ; https://www.cninfo.com.cn/new/disclosure/stock?orgId=9900029666&stockCode=002837",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-06 06:00；使用11月5日A股/港股完整收盘、收盘后公告与美东11月5日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S0绝对防守（外部硬风险覆盖）。A/H市场11月5日完成第二日宽度修复，但涨停缩容、晋级率下降；隔夜QQQ跌6.33%、SOXX跌12.75%、NVDA跌9.08%，组合科技同变量暴露显著超过30%。组合覆盖上限由15%降至10%，新增仓位、题材交易和摊低均为0；开盘只处理风险。",
        "top_attention": [
            {"name": "新易盛", "reason": "失190后仅守185、集中度最高；隔夜NVDA/SOXX发生踩踏，CPO外部映射最直接，185/180为防守线。"},
            {"name": "中微公司", "reason": "二日守222且4亿至5亿元回购方案落地，但高265回落、现金流/非经常收益风险仍在，隔夜SOXX跌12.75%覆盖公司利多。"},
            {"name": "阿里巴巴-W", "reason": "H股涨8.45%收复103.3、ADR在美股暴跌中逆市涨2.66%，相对强度最突出；但110/112临压且千问利润贡献未披露。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-06", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>隔夜AI硬件发生系统性踩踏，总阀门降为S0绝对防守。</b>QQQ约跌6.33%、SOXX约跌12.75%、NVDA约跌9.08%，覆盖A/H连续两日修复；组合科技同变量暴露显著超过30%。新易盛、澜起、绿的、中微、英维克、雅克、联瑞、铖昌均按<b>红色</b>处理；宁德与阿里仅保留<b>橙色相对强观察</b>。没有个股新触发3日+25%或5日+35%的涨幅阈值，但外部冲击与公司特定弱项满足红色组合条件。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限降至10%，新增仓位、题材交易和摊低均为0；开盘只处理风险。</li><li>新易盛看185/180，澜起看159/155，中微看250/242；失下层关键位优先降科技同变量暴露。</li><li>绿的看286/275，英维克看38.8/37.8，雅克看86/82.7，联瑞看83/80，铖昌看86/82.5。</li><li>宁德看382/377，阿里看105/103.3；相对强只作温度计，400/110上方均不追。</li><li>09:45若上涨家数低于1000或科技核心批量跌停，继续压缩；只有美股科技止跌且A股完整收盘守位，下一版才退出S0。</li></ul></section>',
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
