from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261106 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261109.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "公司正式确认截至11月5日累计回购421.63万股、耗资约7.999亿元，最高213.27元、最低172.05元；同时称生产经营正常、在手订单充足、交付与扩产按需求推进，回购增持再贷款利率降至1%提供资金工具支持。",
        "bear": "11月6日仍跌7.28%至172.10、盘中低161.16，8亿元回购与订单表态均未止跌；CPO当日跌5.26%，组合集中度、经营现金流和存货压力继续共振。",
        "message_level": "累计回购约8亿元 + 盘中低161.16",
        "judgement": "利空",
        "action": "红色高位踩踏风险；看171.6/165/161.2/160，失161继续降集中度；收180/185只算止跌，190并守位才修复。",
        "risk_level": "红色",
        "risk_note": "公司层回购与订单利多被交易层继续破位抵消，集中度仍是组合第一风险。",
    },
    "688008": {
        "bull": "Q3经营、Q4订单与回购逻辑未变；11月7日仅新增H股翌日披露报表，未改变经营事实。",
        "bear": "11月6日跌8.36%至150.10、低143.10，失159/155并一度跌破145；股东减持窗口与海外半导体冲击继续压制。",
        "message_level": "失155 + 盘中低143.1",
        "judgement": "利空",
        "action": "红色强防守；看150/145/143.1/140，失143继续减风险；收155/159只算止跌，164.1并守位才修复。",
        "risk_level": "红色",
        "risk_note": "经营强与交易弱背离扩大，回购尚未形成持续价格承接。",
    },
    "688017": {
        "bull": "Q3超预期、具身智能业务增长逻辑未变；11月6日低277.90仍守275风险线。",
        "bear": "跌2.88%至285.05并失286，盘中高297.78后明显回落；经营现金流弱、高估值与机器人/高估值科技退潮仍共振。",
        "message_level": "守275但失286 + 高位回落",
        "judgement": "利空",
        "action": "红色观察；看278/275/268，失275减风险；收286/299只算止跌，外围稳定并守位才修复。",
        "risk_level": "红色",
        "risk_note": "业绩层强但价格未守上层关键位，高估值与现金流风险未解除。",
    },
    "688012": {
        "bull": "11月6日低238.09后收回254，周五收盘持平且显著强于科创50；4亿至5亿元回购方案、Q3扣非增长与国产替代平台逻辑提供承接。",
        "bear": "盘中高263后回落，3日累计仍涨23.42%、接近高位红色阈值；Q3归母受约8.08亿元非经常收益放大、经营现金流为负，回购方案尚未披露实际实施。",
        "message_level": "逆势收平 + 3日涨23.42% + 回购待实施",
        "judgement": "中性",
        "action": "橙色相对强观察；看250/242/238，失242转红；263/265附近不追，回购实施与守265后再上调。",
        "risk_level": "橙色",
        "risk_note": "相对强度和回购方案提供承接，但短期涨幅接近阈值且现金流/非经常收益限制追高。",
    },
    "002837": {
        "bull": "外汇套保最高合约价值增至17亿元，有助匹配海外业务汇率敞口；Q3收入增长与订单逻辑未变。",
        "bear": "11月6日跌5.69%至37.33并失38.8/37.8；Q3增收不增利、前三季度归母下降、毛利率下滑与存货较年初+154.95%继续压制。",
        "message_level": "失37.8 + 经营质量偏弱",
        "judgement": "利空",
        "action": "红色强防守；看37.3/36.2/36/34，失36减风险；收37.8/38.8只算止跌，40.6并守位才修复。",
        "risk_level": "红色",
        "risk_note": "风险管理改善不能替代利润质量和库存验证，价格重新失守。",
    },
    "03750.HK": {
        "bull": "11月6日低368.20后收380，仍守370；周五美股NVDA+2.82%、SOXX+3.46%对风险偏好提供部分缓冲，回购注销和储能催化延续。",
        "bear": "跌3.70%，高397.80后回落并失382；Q3不及LSEG预期和现金流下降未变，美股反弹远未收复周四跌幅。",
        "message_level": "守370但失382 + 美股仅部分修复",
        "judgement": "中性",
        "action": "橙色守位观察；看377/370/368.2，失370降风险；收382/395只算修复，400附近不追。",
        "risk_level": "橙色",
        "risk_note": "中期相对强仍在，但冲高回落和基本面预期差要求保持橙色。",
    },
    "09988.HK": {
        "bull": "11月6日低103.90后收104.90、仍守103.3；Apple智能接入千问的官方催化延续，BABA ADR周五再涨1.29%。",
        "bear": "H股跌3.85%并失105，周四放量上涨后出现兑现；千问调用量、收费与利润贡献未披露。",
        "message_level": "守103.3 + ADR逆市延续",
        "judgement": "中性",
        "action": "橙色相对强观察；看103.3/100/98.9，失103.3降风险；收105/109.1后仍需守112，禁止追催化。",
        "risk_level": "橙色",
        "risk_note": "跨市场相对强度仍好，但H股兑现且利润验证缺失。",
    },
    "002409": {
        "bull": "11月6日低83.66后收85.67，仍守82.7；华飞电子增资与半导体材料长期逻辑未变。",
        "bear": "跌4.49%并失86，Q3仍略低于申万宏源预期，半导体/CPO板块周五大跌。",
        "message_level": "守82.7但失86 + Q3略低预期",
        "judgement": "利空",
        "action": "红色观察；看83.7/82.7/80，失82.7减风险；收86/90只算止跌，92并守位才修复。",
        "risk_level": "红色",
        "risk_note": "价格修复退回下层，Q3预期差和板块退潮共振。",
    },
    "688300": {
        "bull": "Q3超预期、高端粉体放量逻辑未变；11月6日低76.22后回收至79.90，未收在日内低位。",
        "bear": "跌5.24%并失83/80，盘中再失77.8；可转债筹码、10亿元扩产融资与半导体退潮风险共振。",
        "message_level": "失80 + 盘中失77.8",
        "judgement": "利空",
        "action": "红色观察；看79.9/77.8/76.2/75，失76.2减风险；收80/83只算止跌，84.3并守位才修复。",
        "risk_level": "红色",
        "risk_note": "业绩层强但交易层二日修复失败，筹码与融资风险重新主导。",
    },
    "001270": {
        "bull": "11月6日低82.94后收84.75，仍守82.5；商业航天长期产业逻辑未变。",
        "bear": "跌3.05%并失86，Q3归母同比-44.43%、减值、可交换债筹码与股数/成本缺失未消。",
        "message_level": "守82.5但失86 + Q3利润下降",
        "judgement": "利空",
        "action": "红色高波动观察；看82.9/82.5/79.5，失82.5减风险；收86/87.4只算止跌，90并守位才修复。",
        "risk_level": "红色",
        "risk_note": "题材强度退回下层支撑，业绩与筹码弱项继续限制。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌7.28%至172.10、盘中低161.16", "S0与185/180失位减风险约束完全有效。"),
    "688008": ("完全有效", "跌8.36%至150.10、盘中失145", "海外半导体压力与失位约束完全验证。"),
    "688017": ("完全有效", "跌2.88%至285.05、失286", "红色高估值风险与不追约束有效。"),
    "688012": ("完全有效", "收254.00持平、低238.09后修复", "红色总阀门有效，回购承接使个股相对强。"),
    "002837": ("完全有效", "跌5.69%至37.33、失37.8", "经营质量与外部风险约束完全有效。"),
    "03750.HK": ("完全有效", "跌3.70%至380、守370", "橙色不追与守位观察有效。"),
    "09988.HK": ("完全有效", "跌3.85%至104.90、守103.3", "相对强仍在但催化兑现，橙色约束有效。"),
    "002409": ("完全有效", "跌4.49%至85.67、失86", "Q3预期差与板块压力约束有效。"),
    "688300": ("完全有效", "跌5.24%至79.90、失80", "筹码/融资与板块压力约束有效。"),
    "001270": ("完全有效", "跌3.05%至84.75、失86", "题材高波动与业绩约束有效。"),
}


MACRO_RADAR = {
    "date": "2026-11-09",
    "window": "06:00盘前 / 周末后",
    "warning": "红色",
    "warning_points": 8,
    "triggers": [
        "11月6日A股全面退潮：沪指-1.10%、深成指-2.57%、创业板-3.96%、科创50-2.60%，约758股上涨、4741股下跌，成交缩至约1.67万亿元。",
        "短线生态恶化：涨停32、跌停15、晋级率约13.1%、1进2仅6.35%；CPO-5.26%、PCB-4.82%、光芯片-4.41%，科技修复次日再次失败。",
        "美股周五仅部分反弹：SPY+0.35%、QQQ+1.40%、SOXX+3.46%、NVDA+2.82%，远未收复周四跌幅；UUP+0.76%显示美元反弹，周一仍需A股独立确认。",
    ],
    "opening_scenario": "美股半导体反弹可能带来A股科技高开，但在4741股下跌、CPO重挫和量能收缩背景下，只按超跌反抽观察；若上涨家数不能重回2500，反抽优先降风险。",
    "state": "S0 绝对防守",
    "radar_score": 18.8,
    "MSS": 38,
    "MBS": 8,
    "FRS": 12,
    "TES": 12,
    "ET": 4,
    "position_ceiling": "S0标准总仓0%-20%；组合科技同变量暴露仍高，组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只处理风险；中微/阿里作为相对强温度计，弱反抽降低新易盛、澜起、联瑞等暴露。",
    "blocked": "禁止因美股单日反弹抄底CPO/半导体，禁止用8亿元回购、订单表态或公司回购方案替代价格确认。",
    "focus": "09:45观察上涨家数能否回到2500、CPO/半导体承接及新易盛171.6/165、澜起150/145、中微250/242。",
    "downgrade": "若上涨家数低于1200、科技核心继续创新低或新易盛失161/澜起失143，则继续压缩；升级需A股完整收盘守位且外围科技至少再确认一日。",
    "v231_link": "公司层评分不因周五下跌而改写；交易时点、相对强弱与组合暴露折价继续主导。中微回购、新易盛8亿元回购只作承接证据，不授予加仓权限。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-06"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-06":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-06")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-06", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-06完整A股与港股收盘验证上一版06:00判断；周五美股反弹仅进入周一新预警，不倒灌已完成A/H复盘。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 10, "useful_but_conservative": 0,
            "repair_upgrade": 0, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 0,
            "main_read": "隔夜AI硬风险完整传导至A/H：新易盛、澜起、英维克、雅克、联瑞等失位，中微凭回购方案相对抗跌，宁德与阿里守住下层线。10只约束均为完全有效，S0总阀门作为仓位/加仓纪律得到验证。",
        },
        "items": items,
        "logic_corrections": [
            "A股4741股下跌、涨停缩至32、CPO跌5.26%，国内两日修复正式失败，MBS/FRS/TES同步下调。",
            "新易盛累计回购约8亿元仍盘中低161.16，回购只能提供边际承接，不能替代趋势确认。",
            "中微低238.09后收平、阿里守103.3，说明公司催化可影响相对强弱，但不能解除组合S0。",
            "美股周五反弹仅收回周四部分跌幅，周一不得据此把S0直接升级为S2。",
            "经营层与交易层继续分离：财报预期差结论不因单日涨跌改变。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-06完整A/H收盘，澜起继续使用未复权day序列；周末无A/H交易。",
        "A股：沪指-1.10%、深成指-2.57%、创业板-3.96%、科创50-2.60%；约758股上涨、4741股下跌，沪深北成交约1.67万亿元；涨停32、跌停15、晋级率约13.1%。",
        "板块：CPO-5.26%、PCB-4.82%、光芯片-4.41%、NPU-4.33%、英伟达概念-4.15%，海外AI冲击在周五A股完成传导。",
        "港股：恒指-1.27%至24481.86、恒生科技-1.83%至4078.23；宁德-H -3.70%至380.00，阿里-W -3.85%至104.90。",
        "外围：美东11月6日SPY +0.35%、QQQ +1.40%、SOXX +3.46%、NVDA +2.82%、BABA ADR +1.29%；DIA -0.39%、IEF -0.13%、UUP +0.76%。科技反弹只收回周四部分跌幅。",
        "新易盛：截至11月5日累计回购421.6253万股、占总股本0.3023%，耗资799,863,809.47元，成交区间172.05至213.27元；公司称在手订单充足、交付与扩产正常，但11月6日仍跌7.28%。",
        "政策：人民银行自11月4日起将股票回购增持再贷款利率下调至1%，再贷款额度申请超过2000亿元；属于市场流动性支持，不能替代个股价格确认。",
        "中微公司：4亿至5亿元回购方案仍是公司层利多，但截至本窗口未见实际实施公告。澜起11月7日仅新增H股翌日披露报表。其余持仓周末未见改变经营事实的重大新增公告。",
        "高位筛查：全部10只持仓3日涨幅未超过25%、5日涨幅未超过35%；中微3日涨23.42%接近阈值且高265回落，标橙不追。新易盛、澜起、绿的、英维克、雅克、联瑞、铖昌维持红色；宁德/阿里橙色相对强观察。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://www.dabanke.com/ ; https://www1.cfi.net.cn/p20261106000254.html ; https://fund.eastmoney.com/a/202611063924832341.html ; https://apnews.com/article/bba6f0bf9035a6e6b1c4fef3e8230b89 ; https://static.cninfo.com.cn/finalpage/2026-11-06/1225660606.PDF ; https://www3.xinhuanet.com/fortune/20261104/8e18ecc73f2941ffbd5be19db122b24f/c.html",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-09 06:00；使用11月6日A股/港股完整收盘、周末公告与美东11月6日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色、S0绝对防守。11月6日约4741股下跌、创业板跌3.96%、CPO跌5.26%，国内两日修复失败；美股周五SOXX反弹3.46%仅收回周四跌幅的一小部分。组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；高开反抽优先降低科技同变量暴露。",
        "top_attention": [
            {"name": "新易盛", "reason": "累计回购约8亿元且公司称订单充足，但周五仍跌7.28%、盘中低161.16，组合集中度最高；公司层与交易层背离最严重。"},
            {"name": "澜起科技", "reason": "Q3/Q4订单与回购逻辑均强，但周五跌8.36%、盘中低143.10；经营强与价格弱背离继续扩大。"},
            {"name": "中微公司", "reason": "周五低238.09后收平254、显著强于科创50，4亿至5亿元回购提供承接；但3日涨23.42%接近阈值，263/265附近禁止追高。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-09", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>A股周五确认退潮，总阀门继续S0绝对防守。</b>约4741股下跌、创业板-3.96%、CPO-5.26%，涨停缩至32、跌停增至15；美股科技周五反弹仅收回前一日部分跌幅。新易盛累计回购约8亿元仍盘中低161.16，澜起低143.10，回购和订单利多均未转化为趋势承接。新易盛、澜起、绿的、英维克、雅克、联瑞、铖昌按<b>红色</b>处理；中微、宁德、阿里仅作<b>橙色相对强观察</b>。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限维持10%，新增仓位、题材交易和摊低均为0；周一高开反抽优先降风险。</li><li>新易盛看171.6/165/161.2，澜起看150/145/143.1；失下层关键位继续降集中度。</li><li>绿的看278/275，中微看250/242，英维克看37.3/36，雅克看83.7/82.7，联瑞看79.9/77.8，铖昌看82.9/82.5。</li><li>宁德看377/370，阿里看103.3/100；中微263/265、宁德400、阿里109/112附近均禁止追高。</li><li>09:45若上涨家数低于1200或科技核心继续创新低，维持S0；只有A股完整收盘守位且外围科技再确认一日，下一版才讨论升级。</li></ul></section>',
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
