from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261021 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261022.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "董事长8亿至10亿元回购提议和CPO长期需求逻辑未见新增否定。",
        "bear": "10月21日再跌1.36%至294.12、盘中低289.44并失290；组合集中度最高，回购尚未形成正式方案与实施。",
        "message_level": "290风险线失守 + 集中度最高", "judgement": "利空",
        "action": "看289.4/285，失285继续降集中度；收298/303只算止跌，308/315并守位才转修复。",
        "risk_level": "红色", "risk_note": "风险线继续下移，公司层提议不能覆盖交易破位。",
    },
    "688008": {
        "bull": "Q3预增获价格正反馈：10月21日涨5.36%至178.34，高181.19并站173.4；DDR5高代际RCD与互连芯片放量逻辑得到经营数据支持。",
        "bear": "业绩预告未经审计且无可靠Q3单季一致预期；公告后已明显上涨，180/181.2附近存在事件兑现与追高风险。",
        "message_level": "Q3预增获价格确认 + 180压力", "judgement": "利多",
        "action": "维持橙色事件观察，利多后不追；看173.8/171/169，守173.8并收180/181.2后观察185，失171降风险。",
        "risk_level": "橙色", "risk_note": "经营与价格出现共振，但尚未完成180上方次日守位。",
    },
    "688017": {
        "bull": "10月21日回落3.94%至257.68但低256.18、仍守255/252，第二日修复确认尚未失效。",
        "bear": "机器人主线封板由前一日约19家缩至约7家，板块进入分化；连续上涨后高275.33形成压力，未见公司基本面新增披露。",
        "message_level": "守255但机器人分化", "judgement": "中性",
        "action": "维持橙色、不追高；看256/252/245，失252减风险；收264/268只转强，275并守位才恢复进攻观察。",
        "risk_level": "橙色", "risk_note": "支撑仍在但题材扩散收缩，黄色高位关注延续。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变，未见新的公司级基本面利空。",
        "bear": "10月21日再跌1.62%至274.00、低272.09，仍未收280；前日探底回收未获次日确认。",
        "message_level": "272临界 + 280未复", "judgement": "利空",
        "action": "看272/268/265，失268继续减风险；收278.5/282只算止跌，290并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层弱势延续，不下调公司长期基本面但禁止摊低。",
    },
    "002837": {
        "bull": "10月21日小涨0.69%至45.15，液冷需求与长期激励逻辑未变。",
        "bear": "高46.18后回落，仍未收46.5/46.73；半年报利润同比下滑尚未修复，未见重大新增公司公告。",
        "message_level": "45.15弱修复 + 行权价未复", "judgement": "中性",
        "action": "看44.9/43.8/43，失43减风险；收46.5/46.73只算止跌，48.8并守位才转修复。",
        "risk_level": "红色", "risk_note": "连续小反弹仍未触发关键位确认。",
    },
    "03750.HK": {
        "bull": "业绩说明会称Q3单位盈利受产品结构、消费税和出口退税影响，公司正与客户沟通分担；管理层认为全球动力与储能需求并未像市场预期般悲观。",
        "bear": "财报后H股10月21日再跌11.41%至364.80、低361，正式Q3归母增速14.54%明显低于LSEG约41.2%预期；两日累计跌约17.2%，交易与预期差继续共振。",
        "message_level": "财报后再跌11.41% + 361防线", "judgement": "利空",
        "action": "红色极强防守；看361/350/340，失350继续减风险；收380/400只算止跌，411.8并守位才转修复。禁止抄底。",
        "risk_level": "红色", "risk_note": "管理层解释不改变已确认的预期落空与价格踩踏。",
    },
    "09988.HK": {
        "bull": "速卖通品牌增长、AI硬件扶持与玄铁E908A战略催化延续；未见新的正式财务披露。",
        "bear": "H股10月21日再跌1.14%至103.70、低103.30；隔夜BABA ADR再跌3.86%，失108/105后的弱势可能向港股继续传导。",
        "message_level": "H股103.7 + ADR跌3.86%", "judgement": "利空",
        "action": "红色纯防守；看103.3/102.6/100，失100继续减风险；收105/108只算止跌，112并守位才转修复。",
        "risk_level": "红色", "risk_note": "公司战略未转化为价格承接，跨市场交易压力延续。",
    },
    "002409": {
        "bull": "半导体材料国产替代与江苏雅睿中长期研发融资逻辑未变。",
        "bear": "10月21日跌0.46%至96.80，高99.77后回落且仍未收100；新业务尚处研发验证，未见重大新增公司公告。",
        "message_level": "100冲高失败 + 新业务未盈利", "judgement": "中性",
        "action": "看96/95/92.7，失95减风险；收100只算止跌，101.9/105并守位才转修复。",
        "risk_level": "红色", "risk_note": "冲高继续失败，战略期权不能替代当前利润与交易确认。",
    },
    "688300": {
        "bull": "10月21日盘中高106.79一度越过104.623理论除权参考；募集资金专户销户完成属于资金管理程序性收尾。",
        "bear": "冲高后收102.20、跌0.99%，104.6修复失败；6.94694亿元转债绝大部分未转，销户公告不改变转债筹码压力。",
        "message_level": "104.6冲高失败 + 程序性销户", "judgement": "利空",
        "action": "看101.8/97.4/94，失97.4减风险；收104.6只算止跌，107.7并次日守位才转修复。",
        "risk_level": "红色", "risk_note": "高位踩踏标签继续保留，不把程序性公告误写为经营利好。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月21日涨1.09%至85.47，守住83并首次收上85，连续修复条件进一步完成。",
        "bear": "盘中高88.75后回落，控股股东可交换债构成潜在供给，股数和成本仍缺失。",
        "message_level": "守83并收85 + 88.75压力", "judgement": "中性",
        "action": "个股降至橙色；看85/83/81，失83恢复红色；收87/88.8并守位才延续修复，参数补齐前不放大仓位。",
        "risk_level": "橙色", "risk_note": "次日守位允许降为橙色，但冲高回落与仓位参数缺失仍限制操作。",
    },
}


REVIEW_META = {
    "300502": ("完全有效", "跌1.36%至294.12、低289.44并失290", "集中度防守强验证，下移看289.4/285。"),
    "688008": ("修复有效需上调观察", "涨5.36%至178.34，收173.4上方并高181.19", "经营与价格共振，维持橙色；等待180上方次日守位。"),
    "688017": ("完全有效", "跌3.94%至257.68但低256.18、守255/252", "不追高与支撑观察均有效，橙色风险不变。"),
    "688012": ("完全有效", "跌1.62%至274.00、低272.09且未收280", "前日止跌未确认，红色约束有效。"),
    "002837": ("方向偏保守但操作有效", "涨0.69%至45.15，高46.18但未收46.5", "弱修复未触发关键位，操作约束有效。"),
    "03750.HK": ("完全有效", "财报后再跌11.41%至364.80、低361", "红色极强防守完全有效，管理层解释不取消预期差。"),
    "09988.HK": ("完全有效", "跌1.14%至103.70、低103.30", "红色纯防守有效，关注ADR继续下跌的传导。"),
    "002409": ("完全有效", "跌0.46%至96.80，高99.77但未收100", "100确认位继续有效。"),
    "688300": ("完全有效", "高106.79后收102.20，104.6修复失败", "高位踩踏红色约束有效，程序性公告不改变筹码风险。"),
    "001270": ("修复有效需上调观察", "涨1.09%至85.47，守83并首次收85", "完成次日守位，个股风险由红降橙；继续看87/88.8。"),
}


MACRO_RADAR = {
    "date": "2026-10-22",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 5,
    "triggers": [
        "A股宽度从前日3734家上涨反转为1981家上涨、3364家下跌，主要指数普跌且成交缩至约1.429万亿元。",
        "机器人封板数量由约19家缩至约7家，绿的冲高后回落，主线从扩散进入分化；涨停50/跌停5说明尚非全面退潮。",
        "恒生科技再跌1.26%，宁德-H财报后跌11.41%、阿里隔夜ADR跌3.86%；虽美股SOXX涨2.07%，中港持仓压力仍强。",
    ],
    "opening_scenario": "美股科技反弹可能托住A股半导体情绪，但宁德与阿里公司层压力、机器人主线分化会压制组合；优先看宽度能否回到1:1以上。",
    "state": "S3 震荡精选",
    "radar_score": 51.4,
    "MSS": 55,
    "MBS": 49,
    "FRS": 43,
    "TES": 56,
    "ET": 57,
    "position_ceiling": "S3标准总仓40%-60%；因组合科技同变量暴露、宁德财报踩踏及新易盛集中度，组合覆盖上限压至30%，新增仓位为0。",
    "allowed": "持有已确认的澜起/铖昌修复观察；对新易盛、宁德、阿里弱反抽降低集中度与同变量暴露。",
    "blocked": "禁止抄底宁德、禁止追机器人后排、禁止在新易盛失290后摊低、禁止把程序性公告当经营利好。",
    "focus": "09:45观察上涨家数能否高于下跌家数、SOXX反弹能否传导至A股半导体、绿的255/252、澜起173.8/180与宁德361/350。",
    "downgrade": "若上涨家数低于1500、机器人继续缩容、宁德失350或阿里失100，则降至S1/S0防守；若宽度回到3000家以上且主线封板质量改善，才解除橙色。",
    "v231_link": "澜起经营与价格共振可保留观察；宁德利润预期差与价格破位使估值/交易时点继续下调；高分基本面也不越过组合红色阀门。",
}


def trim_market(market: dict) -> None:
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-10-21"]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-21":
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-21")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-21", "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-21完整A股与港股收盘验证上一版06:00判断；宁德业绩后的第二个H股交易日完整收盘用于验证，不使用盘中片段。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 7, "useful_but_conservative": 1,
            "repair_upgrade": 2, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 3,
            "main_read": "组合红色阀门继续被验证：新易盛失290，宁德-H财报后再跌11.41%，阿里继续走弱；七只约束完全有效。澜起经营与价格共振升级修复观察，铖昌完成次日守83并收85、可降为橙色。",
        },
        "items": items,
        "logic_corrections": [
            "A股上涨家数降至1981、下跌3364，MBS与RadarScore应回落；跌停仅5只说明不是流动性踩踏，维持S3而非直接S0。",
            "机器人封板收缩、绿的回落但守255/252，个股橙色仍有效；若失252才恢复红色。",
            "宁德业绩说明会解释产品结构、消费税与出口退税影响，但价格继续暴跌，不能用管理层表述覆盖已确认的不及预期与交易风险。",
            "澜起公告后收178.34，完成173.4修复触发；仍需180上方次日守位，避免把单日跳涨当趋势。",
            "铖昌完成次日守83并收85，按规则由红降橙；仓位参数缺失仍禁止放大风险。",
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
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note"}}
        item.update(UPDATES[item["code"]])
        holdings.append(enrich(item, market))
    review = build_review(prior, market)
    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive = ARCHIVE / f"automation_2_holdings_{stamp}.html"
    review_archive = ARCHIVE / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG前复权日K；全部10只持仓使用2026-10-21完整收盘，联瑞继续使用除权后序列。",
        "A股：沪指-0.60%、深成指-0.82%、创业板-1.62%、科创50+0.06%，成交约1.4294万亿元；1981股上涨、3364股下跌、50股涨停、5股跌停，封板率约68.5%、连板晋级率约29.6%。",
        "港股：恒指-0.90%、恒生科技-1.26%、国企指数-1.08%；宁德-H跌11.41%至364.80，阿里跌1.14%至103.70。",
        "外围：10月21日SPY +0.53%、DIA +0.64%、QQQ +1.06%、SOXX +2.07%；IEF -0.03%、TLT +0.14%、UUP +0.03%，美股科技反弹且利率/美元代理总体平稳。",
        "宁德业绩说明会：管理层称Q3单位盈利受产品结构、消费税和出口退税影响，正与客户沟通分担；认为全球动力与储能需求仍有增长潜力。该解释不改变正式Q3不及LSEG预期的结论。",
        "澜起：Q3预增公告后上涨5.36%至178.34，高181.19，经营与价格首次共振；仍无可靠Q3单季一致预期，不把高同比硬判超预期。",
        "联瑞：部分可转债募集资金专户销户完成属于募集资金管理程序性收尾，不影响6.94694亿元未转债券的筹码判断。",
        "公告复核：除宁德业绩说明会/H股翌日披露与联瑞募集资金专户销户外，其余持仓未见改变经营事实的重大新增公告。",
        "宏观雷达：MSS55、MBS49、FRS43、TES56、ET57，RadarScore51.4，对应S3震荡精选；因宽度回落、机器人分化和港股科技弱势，06:00预警维持橙色。",
        "高位筛查：无持仓触发3日+25%或5日+35%；绿的前两日涨约13.7%后回落且机器人缩容，维持黄色关注；联瑞仍满足转债筹码与前期板块踩踏/放量弱势两项，维持高位踩踏风险。",
        "财报源：宁德正式Q3报告及LSEG SmartEstimate、澜起Q3预告、A股正式半年报、阿里截至2026-06-30季度业绩。没有可靠一致预期时不把同比高增硬判超预期。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=300750&id=12651293 ; https://static.cninfo.com.cn/finalpage/2026-10-21/1225613175.PDF ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=688008&id=12650706 ; https://news.10jqka.com.cn/20261021/c680925690.shtml ; https://finance.yahoo.com/quote/SOXX/ ; https://finance.yahoo.com/quote/BABA/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-22 06:00；使用10月21日A股/港股完整收盘、收盘后公告与隔夜美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：宏观雷达橙色、S3震荡精选，但本组合继续红色防守。A股宽度明显回落、机器人主线分化，港股科技连续走弱；宁德财报后再跌11.41%，新易盛失290，阿里H股与ADR同步承压。隔夜SOXX上涨2.07%只能提供外部缓冲。组合新增仓位为0、覆盖上限压至30%；允许观察澜起与铖昌修复，不允许抄底宁德、追机器人后排或摊低集中持仓。",
        "top_attention": [
            {"name": "宁德时代-H", "reason": "财报后第二个交易日再跌11.41%至364.80、低361；管理层解释单位盈利影响，但不改变不及LSEG预期与踩踏风险。"},
            {"name": "新易盛", "reason": "组合集中度最高，10月21日盘中低289.44并失290；回购尚未落地，转看285防线。"},
            {"name": "澜起科技", "reason": "Q3预增获价格确认、收178.34并高181.19；经营与价格共振，但无可靠单季一致预期且180附近不追。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
        "macro_radar": MACRO_RADAR,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-22", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>组合红色防守，宁德财报踩踏继续扩大。</b>宁德-H财报后再跌11.41%、两日累计约-17.2%，新易盛失290，阿里H股与ADR同步弱。联瑞转债筹码与前期板块踩踏/放量弱势仍满足两项，继续标记<b>高位踩踏风险</b>。绿的前两日快速上涨后回落、机器人主线缩容，维持黄色关注。</p></section>',
        page, flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', render_macro() + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>宁德看361/350/340，财报踩踏阶段禁止抄底；收380/400只算止跌。</li><li>新易盛看289.4/285，失285继续降集中度；回购提议不能替代价格确认。</li><li>澜起维持橙色，守173.8并收180/181.2后观察185，公告后不追高。</li><li>绿的看256/252/245，失252减风险；机器人封板缩容，不追后排。</li><li>阿里看103.3/102.6/100；联瑞冲高104.6失败维持红色；铖昌守85/83后才延续橙色修复。</li></ul></section>',
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
