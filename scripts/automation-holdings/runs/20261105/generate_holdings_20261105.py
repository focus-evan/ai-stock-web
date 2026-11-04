from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261104 as previous
import generate_holdings_20261023 as raw_market


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261105.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "11月4日放量涨13.35%至196.50，收回180/185/190；公司已实施约6亿元回购，CPO板块当日涨7.54%。",
        "bear": "仅是急跌后的首日价格修复，盘中低172.00仍贴近前低；5日累计仍跌23.48%，经营现金流、存货和组合集中度压力未消，隔夜NVDA/SOXX再跌约3%。",
        "message_level": "首日收回190 + 外围半导体反向",
        "judgement": "中性",
        "action": "橙色修复观察；看190/185/180，失185恢复红色；收200/205后还要下一交易日守位，禁止把单日13%反弹当趋势反转。",
        "risk_level": "橙色",
        "risk_note": "回购与板块反弹形成首日价格确认，但尚未通过次日守位，集中度仍是组合第一风险。",
    },
    "688008": {
        "bull": "11月4日涨11.87%至167.82，收回155/159/164.1；Q3经营、Q4订单与新回购继续提供公司层支撑。",
        "bear": "当日低148.55再探前低，收复关键位仅一天；隔夜美股半导体下跌，且9月25日披露的股东减持计划仍是筹码约束。",
        "message_level": "首日收回164.1 + 减持窗口",
        "judgement": "中性",
        "action": "橙色修复观察；看164.1/159/155，失159降回红色；收170/175并守位后再评价修复强度。",
        "risk_level": "橙色",
        "risk_note": "经营与价格重新同向一天，但尚不足以下调组合总风险。",
    },
    "688017": {
        "bull": "11月4日涨10.41%至286.01，收回268/275；Q3超预期获得第二次价格反馈，机器人板块涨4.78%。",
        "bear": "盘中低250.01、振幅大且放量，说明筹码仍不稳定；经营现金流弱、高估值与行业一日反弹后的兑现风险未消。",
        "message_level": "Q3超预期再确认 + 大振幅",
        "judgement": "利多",
        "action": "橙色修复观察；看275/268/259，失268转红；收286/292并守位才进一步上调，禁止追高。",
        "risk_level": "橙色",
        "risk_note": "业绩层利多得到首日强确认，但大振幅与现金流/估值仍限制仓位。",
    },
    "688012": {
        "bull": "11月4日涨16.62%至240.01，收回210/218/222；半导体板块涨10.64%，Q3扣非增长与国产替代平台逻辑获得价格修复。",
        "bear": "属于跌深后的首日放量修复，隔夜SOXX跌3.00%、NVDA跌3.10%；Q3归母受约8.08亿元非经常收益放大、经营现金流为负的风险不变。",
        "message_level": "首日收回222 + 隔夜费半转弱",
        "judgement": "利多",
        "action": "橙色修复观察；看230/222/218，失222转红；收242/250并守位才降低交易风险。",
        "risk_level": "橙色",
        "risk_note": "半导体主线与扣非增长共同驱动反弹，但海外反向与现金流风险要求次日确认。",
    },
    "002837": {
        "bull": "11月4日涨8.86%至38.82，收回36/37.8；算力基础设施普涨提供交易层修复。",
        "bear": "仍未收复40.6，Q3增收不增利、前三季度归母下降、毛利率下滑与存货较年初+154.95%的经营验证偏弱。",
        "message_level": "首日收37.8 + 40.6未复",
        "judgement": "中性",
        "action": "橙色修复观察；看37.8/36/35.3，失36转红；收40.6并守位后再评价趋势。",
        "risk_level": "橙色",
        "risk_note": "价格反弹先于利润质量修复，经营风险不得因板块普涨而下调。",
    },
    "03750.HK": {
        "bull": "11月4日再涨4.43%至377.00，连续第三日守350并首次收上370；公司官宣与章鱼能源、新能安签署欧洲智能家储MOU，回购注销逻辑继续支撑。",
        "bear": "370上方仅首日确认，Q3不及LSEG预期与经营现金流下降未变；MOU未披露订单金额，不能计入当前利润锚。",
        "message_level": "三日守350 + 首收370 + 家储MOU",
        "judgement": "利多",
        "action": "橙色偏强修复；看370/361/357，失361降风险；收380并守位才考虑进一步下调风险。",
        "risk_level": "橙色",
        "risk_note": "交易层持续修复，基本面预期差仍约束风险等级；MOU只作中长期期权。",
    },
    "09988.HK": {
        "bull": "11月4日H股涨1.05%至100.60并首次收上100；Apple官方确认中国区Apple智能自11月4日测试并在Siri、写作工具、视觉智能中接入千问，隔夜BABA ADR涨4.94%。",
        "bear": "尚未收复103.3，千问接入的收费、调用量与利润贡献未披露；隔夜ADR利好需等待H股价格再确认。",
        "message_level": "首收100 + Apple千问正式测试",
        "judgement": "利多",
        "action": "橙色修复观察；看100/98.9/97，失98.9降风险；收103.3并守位后再上调。",
        "risk_level": "橙色",
        "risk_note": "官方产品催化进入测试阶段，但尚未形成可量化利润确认。",
    },
    "002409": {
        "bull": "11月4日涨10.01%至83.66，收回77.1/80/82.7；半导体材料链普涨，华飞电子增资继续提供长期资金条件。",
        "bear": "Q3仍略低于申万宏源预期，单日近涨停尚未完成次日守位，隔夜半导体回落可能压制映射。",
        "message_level": "首日收回82.7 + Q3略低预期",
        "judgement": "中性",
        "action": "橙色修复观察；看82.7/80/77.1，失80转红；收86并守位才进一步上调。",
        "risk_level": "橙色",
        "risk_note": "价格强修复与业绩略低预期并存，交易层不能覆盖经营层缺口。",
    },
    "688300": {
        "bull": "11月4日涨14.41%至83.06，收回75/77.8/80；Q3超预期与高端粉体放量逻辑重新获得价格确认。",
        "bear": "盘中低70.33后大幅拉回、振幅高，仍是首日修复；可转债筹码、10亿元扩产融资和隔夜半导体回落风险未消。",
        "message_level": "Q3超预期再确认 + 大振幅",
        "judgement": "利多",
        "action": "橙色修复观察；看80/77.8/75，失77.8转红；收84.2/87并守位后再降低风险。",
        "risk_level": "橙色",
        "risk_note": "业绩层强、交易层首日转强，但筹码和扩产融资风险仍需次日确认。",
    },
    "001270": {
        "bull": "11月4日涨8.20%至86.05，收回82.5并首次站86，商业航天方向保持相对强势。",
        "bear": "盘中低76.66、振幅仍大；Q3归母同比-44.43%、减值、可交换债筹码压力与持仓参数缺失未消。",
        "message_level": "首日站86 + Q3利润下降",
        "judgement": "中性",
        "action": "橙色修复观察；看82.5/79.5/76.2，失79.5转红；收86并再守一日才完成修复，禁止追涨。",
        "risk_level": "橙色",
        "risk_note": "题材强度重新占优一天，但基本面与筹码压力仍限制为修复观察。",
    },
}


REVIEW_META = {
    "300502": ("修复有效需上调观察", "涨13.35%至196.50、收回190", "红色约束避免了抄底风险；首日强修复只上调为橙色观察。"),
    "688008": ("修复有效需上调观察", "涨11.87%至167.82、收回164.1", "经营与价格重新同向一天，等待守位。"),
    "688017": ("修复有效需上调观察", "涨10.41%至286.01、收回275", "Q3超预期重新获价格确认，但大振幅未消。"),
    "688012": ("修复有效需上调观察", "涨16.62%至240.01、收回222", "半导体主线强修复，仍需海外回落后的次日确认。"),
    "002837": ("修复有效需上调观察", "涨8.86%至38.82、收回37.8", "价格修复但未收40.6，经营约束继续有效。"),
    "03750.HK": ("完全有效", "涨4.43%至377.00、三日守350", "上一版利多/橙色观察得到延续确认。"),
    "09988.HK": ("完全有效", "涨1.05%至100.60、首次收100", "二日守位后的修复继续，官方Apple催化增强。"),
    "002409": ("修复有效需上调观察", "涨10.01%至83.66、收回82.7", "首日强修复，不改变Q3略低预期。"),
    "688300": ("修复有效需上调观察", "涨14.41%至83.06、收回80", "Q3超预期再获确认，筹码风险仍在。"),
    "001270": ("修复有效需上调观察", "涨8.20%至86.05、首次站86", "题材修复但Q3利润与筹码约束未消。"),
}


MACRO_RADAR = {
    "date": "2026-11-05",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 5,
    "triggers": [
        "11月4日沪指+2.16%、深成指+4.22%、创业板+6.40%、科创50+9.92%；约4667股上涨、779股下跌，成交约2.05万亿元，属于放量普涨的首日强修复。",
        "涨停约118、封板率76.1%、连板晋级率25%；但半导体+10.64%、存储+9.24%、CPO+7.54%，增量资金高度集中在科技链，单日修复仍需防次日兑现。",
        "港股恒指+1.67%、恒科+1.77%；隔夜SPY约+1.63%、QQQ约+0.96%，但SOXX-3.00%、NVDA-3.10%，海外指数与AI硬件明显背离。",
    ],
    "opening_scenario": "A股科技可能因昨日大涨与隔夜费半转弱而低开分化；若上涨家数仍高于3000且CPO/半导体核心守住昨日半分位，可延续修复观察，否则按一日反抽兑现处理。",
    "state": "S2 冰点转折",
    "radar_score": 54.4,
    "MSS": 40,
    "MBS": 68,
    "FRS": 52,
    "TES": 60,
    "ET": 28,
    "position_ceiling": "S2标准总仓30%-45%；但组合高度集中于科技同变量且绝大多数持仓只完成首日修复，组合覆盖上限继续15%，新增仓位与题材交易均为0。",
    "allowed": "持仓只做修复观察；已有弱项在失守昨日关键位时降风险，宁德/阿里观察持续性。",
    "blocked": "禁止追昨日大涨、摊低、因指数大阳线恢复仓位，禁止忽略隔夜SOXX/NVDA回落。",
    "focus": "09:45观察上涨家数能否高于3000、半导体/CPO承接及新易盛190、澜起164.1、绿的275、中微222。",
    "downgrade": "若上涨家数低于1800、科技核心集体失昨日关键位，或SOXX弱势传导为高开低走，则退回S1/S0；升级需下一完整A股交易日守位。",
    "v231_link": "经营分与交易时点分离：绿的/联瑞Q3超预期和中微扣非改善获得价格反馈，但一日价格修复不增加基本面分，也不授予加仓权限。",
}


def trim_market(market: dict) -> None:
    raw_market.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-04"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-11-04":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-11-04")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-11-04", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-11-04完整A股与港股收盘验证上一版06:00判断；方向准确性与红色仓位约束分开评价。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 2, "useful_but_conservative": 0,
            "repair_upgrade": 8, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 8,
            "main_read": "11月4日A股放量普涨，八只A股持仓完成首日强修复，统一分类为修复有效需上调观察；宁德与阿里延续前一版修复方向，分类为完全有效。红色总阀门成功约束抄底与加仓，不等于预测全部持仓下跌。",
        },
        "items": items,
        "logic_corrections": [
            "上涨家数约4667、成交重返2万亿元、封板率和晋级率改善，宏观由S1上调至S2冰点转折。",
            "八只A股收回关键位只能从纯防守升级为修复观察；至少等待11月5日完整收盘守位后再降低组合总风险。",
            "半导体/CPO单日涨幅过大且隔夜SOXX/NVDA约跌3%，对高开兑现风险提高权重。",
            "宁德三日守350且首收370、阿里首收100，交易层继续改善；但基本面预期差和利润兑现边界不变。",
            "财报超预期或同比高增只校准经营层，不能用单日涨幅反向证明基本面分数。",
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
        "行情：腾讯/GTIMG日K；全部10只持仓使用2026-11-04完整A/H收盘，澜起继续使用未复权day序列。",
        "A股：沪指+2.16%、深成指+4.22%、创业板+6.40%、科创50+9.92%；约4667股上涨、779股下跌，沪深北成交约2.05万亿元；涨停约118、封板率76.1%、连板晋级率25%。",
        "板块：半导体+10.64%、存储芯片+9.24%、CPO+7.54%、PCB+6.41%、机器人+4.78%；半导体、通信设备、元件主力资金分别净流入约195.89亿、76.94亿、49.86亿元。",
        "港股：恒指+1.67%至23919.50、恒生科技+1.77%至3936.02；宁德-H +4.43%至377.00，阿里-W +1.05%至100.60。",
        "外围：美东11月4日SPY约+1.63%、QQQ约+0.96%、DIA约+3.09%、IWM约+1.49%；但SOXX约-3.00%、NVDA约-3.10%，指数与AI硬件背离。IEF约+0.52%、UUP约-0.34%提供利率/美元缓冲，BABA ADR约+4.94%。",
        "阿里催化：Apple中国官网确认Apple智能自11月4日起随开发者Beta测试，并在Siri、写作工具和视觉智能中接入千问，12月随iOS 27.3正式推出；收费与利润贡献未披露，按产品验证阶段处理。",
        "宁德催化：公司官网11月4日披露章鱼能源、新能安与宁德时代签署欧洲智能家储MOU；未披露订单金额，按中长期产业催化、不计入当前利润锚。",
        "澜起公告：11月4日仅新增H股翌日披露报表，未见改变经营事实的重大新增事项；此前Q3、Q4订单与回购逻辑延续。",
        "英维克：11月3日担保进展公告不改变Q3增收不增利、存货上升与现金流改善的经营判断。其余A股持仓截至06:00未见改变经营事实的重大新增公告。",
        "高位筛查：全部10只持仓3日涨幅均未超过25%、5日涨幅均未超过35%，无新触发红色涨幅阈值；A股八只均只完成首日修复，统一按橙色修复观察，不等同趋势反转。",
        "财报预期差沿用已核验口径：绿的谐波、联瑞新材为超预期；雅克科技为不及预期；新易盛、澜起、中微、英维克、铖昌为无可靠预期；宁德Q3不及LSEG预期；阿里按截至2026-06-30季度业绩口径。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://finance.eastmoney.com/a/202611043921930919.html ; https://www.dabanke.com/ ; https://www.xinhuanet.com/20261104/576ece77f5ae4c8ea03e20a7b5323dec/c.html ; https://www.apple.com.cn/newsroom/2026/10/apple-intelligence-features-are-coming-to-users-in-china/ ; https://www.catl.com/news/ ; https://www.sse.com.cn/assortment/stock/list/info/announcement/index.shtml?productId=688008",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-05 06:00；使用11月4日A股/港股完整收盘、收盘后公告与美东11月4日收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束、宏观S2冰点转折。11月4日约4667股上涨、成交约2.05万亿元，八只A股持仓完成首日强修复；但科技资金集中、隔夜SOXX/NVDA约跌3%，按规则至少等待下一完整交易日守位。组合覆盖上限15%、新增仓位与题材交易为0；失守昨日关键位优先降风险。",
        "top_attention": [
            {"name": "新易盛", "reason": "首日涨13.35%并收回190，但5日仍跌23.48%、集中度最高；隔夜NVDA/SOXX转弱，190/185守位决定修复是否有效。"},
            {"name": "中微公司", "reason": "涨16.62%并收回222，Q3扣非改善获价格反馈；但非经常收益放大、经营现金流为负且隔夜费半跌3%，禁止追高。"},
            {"name": "阿里巴巴-W", "reason": "H股首收100，Apple官方确认千问进入中国区Apple智能测试、ADR涨4.94%；需观察H股能否收103.3并守位，利润贡献尚未披露。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-05", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>没有个股新触发3日+25%或5日+35%的红色涨幅阈值，但组合总阀门仍为红色。</b>11月4日八只A股持仓仅完成首日强修复，半导体/CPO资金高度集中，隔夜SOXX与NVDA约跌3%；按“收回关键位后至少等待下一交易日守位”规则，今日禁止追高和恢复仓位。所有持仓个股先统一进入<b>橙色修复观察</b>，失守昨日关键位立即恢复红色处理。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>组合覆盖上限15%、新增仓位与题材交易为0；大阳线后只验证，不追高。</li><li>新易盛看190/185，澜起看164.1/159，绿的看275/268，中微看230/222；失下层关键位恢复红色。</li><li>英维克看37.8/36，雅克看82.7/80，联瑞看80/77.8，铖昌看82.5/79.5；单日修复不替代经营验证。</li><li>宁德看370/361，阿里看100/98.9；官方催化只按产品/合作阶段计，不提前计入利润。</li><li>09:45若上涨家数低于1800且科技核心高开低走，按S1/S0执行；若全天守位，下一版才考虑降低组合风险。</li></ul></section>',
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
