from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261016 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261019.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "10月16日止跌0.29%至306.91，董事长8亿至10亿元回购提议仍构成公司层支撑。",
        "bear": "仍未收回315/320，组合集中度最高；回购尚待董事会方案与实际实施，周五美股SOXX跌4.15%、QQQ跌2.47%。",
        "message_level": "306附近止跌 + 外部芯片再挫", "judgement": "利空",
        "action": "看303.4/299/295，失295继续降集中度；收315/320只算止跌，330并守位才转修复。",
        "risk_level": "红色", "risk_note": "公司层回购支撑未落地，海外芯片急跌提高周一低开与补跌风险。",
    },
    "688008": {
        "bull": "独立董事提议以3亿至5亿元自有资金回购A股，拟用于员工持股或股权激励；公司计划10月29日董事会审议。10月22日股权登记、10月23日每股派0.20元。",
        "bear": "回购目前仍是提议、具体方案和实施存在不确定性；10月16日收169.20未站170，股东减持计划和SOXX大跌仍构成压力。",
        "message_level": "3-5亿元回购提议 + 170未复", "judgement": "中性",
        "action": "看165.7/163/157.7；收170只算首日修复，173.4/180并守位才降低个股风险。回购消息不追高。",
        "risk_level": "红色", "risk_note": "新利多需要董事会通过和价格确认，外部芯片环境仍弱。",
    },
    "688017": {
        "bull": "10月16日反弹1.18%至236.75，正式半年报利润增长事实未变；周末未见重大新增经营公告。",
        "bear": "仍未收回240，经营现金流偏弱与机器人高波动风险未消；周五美股高估值科技急跌。",
        "message_level": "236.75弱修复 + 240未复", "judgement": "利空",
        "action": "看233.9/232.4/230，失230继续减风险；收240只算止跌，245/252并守位才转修复。",
        "risk_level": "红色", "risk_note": "反弹幅度小且无公司新催化，仍处弱势区。",
    },
    "688012": {
        "bull": "国产替代和先进封装战略投资逻辑不变，10月16日盘中高304.68一度收回300。",
        "bear": "收盘回落至295.22、未守300；青禾晶元仍亏损且投资协议未签，SOXX周五跌4.15%。",
        "message_level": "300冲高回落 + SOXX急跌", "judgement": "利空",
        "action": "看290.4/280/275，失280继续减风险；收300只算止跌，304.7/307并守位才转修复。",
        "risk_level": "红色", "risk_note": "公司基本面未新增恶化，但交易确认失败且外部同类资产承压。",
    },
    "002837": {
        "bull": "2200万份股票期权登记与2026-2028年利润考核目标继续提供团队约束；10月16日低位基本持平。",
        "bear": "收44.70仍低于46.73元行权价，半年报利润同比下滑与潜在稀释尚待消化。",
        "message_level": "44.7横盘 + 行权价上方未复", "judgement": "利空",
        "action": "看44.25/42，失42继续减风险；收46.5/46.73只算止跌，48.8/50并守位才转修复。",
        "risk_level": "红色", "risk_note": "激励目标不是当前盈利确认，弱势价格结构未改。",
    },
    "03750.HK": {
        "bull": "回购、员工持股与产业基金布局仍为中期支撑；10月20日将审议三季度业绩。",
        "bear": "10月16日再跌1.74%至440.80、盘中低434，连续失守450；三季报临近但不可押注预期差，交易风险高于催化。",
        "message_level": "440.8续跌 + 明日三季报窗口", "judgement": "利空",
        "action": "红色强防守；看434/431/425，失425继续减风险；收450只算止跌，458/475并守位才转修复。禁止赌业绩。",
        "risk_level": "红色", "risk_note": "业绩窗口前继续破位，不能用未披露结果替代价格确认。",
    },
    "09988.HK": {
        "bull": "10月16日反弹2.26%至108.80并首次收回108；全栈AI与云基础设施中期逻辑未变。",
        "bear": "仅完成首日修复，尚未收112；周五QQQ跌2.47%，潜在激励股份供给继续构成筹码观察。",
        "message_level": "首次重收108 + QQQ急跌", "judgement": "中性",
        "action": "红色修复观察；今日必须守108，收110.9/112后才考虑橙色；失105恢复纯防守。",
        "risk_level": "红色", "risk_note": "单日收回关键位不能视为趋势反转，外盘科技风险上升。",
    },
    "002409": {
        "bull": "江苏雅睿融资为金属前驱体和光刻胶研发验证提供中长期资金，半导体材料国产替代逻辑未变。",
        "bear": "10月16日再跌1.00%至98.01、未收100；子公司仍处研发验证且上半年亏损，SOXX大跌形成外部压力。",
        "message_level": "100未复 + 战略业务未盈利", "judgement": "利空",
        "action": "看97.2/95，失95继续减风险；收100只算止跌，101.9/105并守位才转修复。",
        "risk_level": "红色", "risk_note": "新业务只计战略期权，不计入当前利润锚。",
    },
    "688300": {
        "bull": "10转3已完成，原200股按权益调整预计260股、参考成本约190.00元；10月16日盘中低101.45仍守100。",
        "bear": "除权后收102.70，较理论参考104.623约跌1.84%；6.94694亿元转债绝大部分未转，外部芯片资产周五急跌。",
        "message_level": "除权后102.70 + 转债筹码压力", "judgement": "利空",
        "action": "按新基准看101.45/100，失100继续减风险；收104.6只回到理论基准，107.7/109.2并守位才转修复。",
        "risk_level": "红色", "risk_note": "高位踩踏风险未解除；已按除权调整收益，禁止把机械除权当暴跌。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月16日反弹5.12%至81.15并收回80.8，半年报利润增长事实未变。",
        "bear": "仍未收83/85，股数和成本缺失；控股股东可交换债形成潜在供给，单日反弹缺少次日确认。",
        "message_level": "收回80.8首日 + 参数缺失", "judgement": "中性",
        "action": "看80.8/77.8/75；今日守80.8并收83/85才转修复，失77.8恢复纯防守。",
        "risk_level": "红色", "risk_note": "首日反弹不降低风险，仓位参数缺失继续限制操作。",
    },
}


REVIEW_META = {
    "300502": ("方向偏保守但操作有效", "涨0.29%至306.91，未收315/320", "红色不加仓约束有效；反弹不足以转修复。"),
    "688008": ("方向偏保守但操作有效", "涨3.80%至169.20，仍未收170", "反弹只算止跌；新回购提议需等待董事会和价格确认。"),
    "688017": ("方向偏保守但操作有效", "涨1.18%至236.75，未收240", "弱反弹未改变红色结构。"),
    "688012": ("完全有效", "跌0.82%至295.22，盘中冲300后回落", "红色防守有效，300仍是第一确认位。"),
    "002837": ("方向偏保守但操作有效", "涨0.07%至44.70，仍低于46.73", "横盘未触发修复，操作约束有效。"),
    "03750.HK": ("完全有效", "跌1.74%至440.80、低434", "红色防守有效，业绩前不押注。"),
    "09988.HK": ("修复有效需上调观察", "涨2.26%至108.80、首次收回108", "只从纯防守转修复观察，今日守108并收112后再降个股风险。"),
    "002409": ("完全有效", "跌1.00%至98.01、未收100", "红色防守有效，看97.2/95。"),
    "688300": ("完全有效", "除权调整后跌约1.84%至102.70，守100但未收104.6", "高位踩踏约束有效，继续按新价格基准。"),
    "001270": ("方向偏保守但操作有效", "涨5.12%至81.15、收80.8但未收83/85", "只算止跌，等待次日守位。"),
}


def enrich(item: dict, market: dict) -> dict:
    rows = [x for x in market["quotes"][item["code"]] if x["date"] <= "2026-10-16"]
    if len(rows) < 6 or rows[-1]["date"] != "2026-10-16":
        raise RuntimeError(f"bad quote cutoff for {item['code']}")
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
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == "2026-10-16")
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        comparison_base = old["last_close"]
        if old["code"] == "688300":
            comparison_base = old.get("ex_rights_reference", 104.623)
        entry = {
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": "2026-10-16", "review_close": row["close"],
            "review_move_pct": base.pct(comparison_base, row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        }
        if old["code"] == "688300":
            entry["morning_adjusted_reference"] = comparison_base
        items.append(entry)
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "使用2026-10-16完整A股与港股收盘验证上一版06:00判断；联瑞用104.623除权参考计算约-1.84%，不把10转3机械除权当跌幅。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 4, "useful_but_conservative": 5,
            "repair_upgrade": 1, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 6,
            "main_read": "红色总阀门的操作约束继续有效，但周五A股广度修复、部分持仓反弹，方向判断偏保守。4只防守条件完全有效，5只方向偏保守但操作有效；阿里首次收回108，仅升级修复观察。周五美股科技再跌，组合总风险不降。",
        },
        "items": items,
        "logic_corrections": [
            "周五A股3061股上涨，需承认市场广度从极弱修复；但标普跌约1.09%、QQQ跌2.47%、SOXX跌4.15%，周一不能直接延续修复假设。",
            "澜起3亿至5亿元回购目前由独立董事提议，计划10月29日董事会审议；未通过、未实施前只计催化期权。",
            "阿里首次收回108，只能从纯防守升级修复观察；至少等待今日守108并确认110.9/112。",
            "联瑞10月16日实际收102.70，复盘必须用104.623理论除权参考，不使用136.01直接计算假跌幅。",
            "宁德10月20日业绩尚未披露，禁止提前判定超预期或不及预期，也禁止以事件窗口取消红色仓位门。",
        ],
    }


def main() -> None:
    prior = json.loads(LATEST_JSON.read_text(encoding="utf-8-sig"))
    market = base.fetch_market()
    holdings = []
    for old in prior["holdings"]:
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low"}}
        item.update(UPDATES[item["code"]])
        holdings.append(enrich(item, market))
    review = build_review(prior, market)
    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive = ARCHIVE / f"automation_2_holdings_{stamp}.html"
    review_archive = ARCHIVE / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG前复权日K；全部10只持仓使用2026-10-16完整收盘。联瑞新材10月16日已除权，前一日比较基准为104.623元。",
        "A股：沪指+0.24%、深成指-0.12%、创业板-0.39%、科创50-0.06%，两市成交约1.555万亿元；Eastmoney全A快照统计3061股上涨、2023股下跌、133股平盘，中位数约+0.45%。",
        "港股：恒指+0.52%、恒生科技+1.16%、国企指数+0.31%；阿里涨2.26%至108.80，宁德-H跌1.74%至440.80。",
        "澜起公告：独立董事提议3亿至5亿元自有资金回购A股，用于员工持股或股权激励；计划10月29日董事会审议，当前仍有不确定性。",
        "澜起权益分派：每股派0.20元，A股股权登记日10月22日、除息及发放日10月23日；现金分红不等于额外经营利润。",
        "宁德：10月16日H股翌日披露报表为股本变动例行披露；10月20日董事会审议三季度业绩，结果尚未披露，预期差暂无法判断。",
        "周末公告复核：除澜起回购提议与权益分派外，其余持仓未见改变经营事实的重大新增公司公告。",
        "外围：10月16日标普500约-1.09%、道指约-0.34%、QQQ -2.47%、SOXX -4.15%；IEF和TLT约+0.08%、美元多头ETF UUP -0.21%，说明科技卖压并非由利率或美元单一上行解释。",
        "高位筛查：无持仓触发3日+25%或5日+35%涨幅阈值；联瑞仍满足可转债筹码压力、前期板块踩踏与外部芯片急跌多项，维持高位踩踏风险。",
        "财报源：A股持仓使用正式2026半年报，宁德使用A/H中报，阿里使用截至2026-06-30季度业绩；未取得可验证一致预期，不把同比增长硬判超预期。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=688008&id=12647482 ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=688008&id=12646852 ; https://qt.gtimg.cn/ ; https://push2.eastmoney.com/ ; https://finance.yahoo.com/quote/QQQ/ ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-19 06:00；行情使用10月16日A股/港股完整收盘，周末公告与周五美股收盘截至本窗口。",
        "risk_level": "红色",
        "gate": "总阀门：红色防守、周末海外科技风险重新压过周五A股修复。10月16日A股广度改善，澜起与铖昌反弹、阿里首次收回108；但标普约跌1.09%、QQQ跌2.47%、SOXX跌4.15%，高估值科技周一面临外部补跌压力。澜起回购尚待10月29日董事会，宁德10月20日业绩未披露；今日禁止追反弹、禁止摊低，只有关键位次日守住后才从纯防守升级为修复观察。",
        "top_attention": [
            {"name": "新易盛", "reason": "组合集中度最高，周五仅止跌至306.91且未收315/320；SOXX周五跌4.15%，回购提议尚未落地。"},
            {"name": "宁德时代-H", "reason": "收440.80并继续失450，10月20日审议三季报；禁止把尚未披露的结果当作利多或赌预期差。"},
            {"name": "澜起科技", "reason": "独立董事新提议3亿至5亿元回购、10月23日每股派0.20元；但169.20仍未站170且回购要到10月29日董事会审议。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-19", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>组合红色防守，海外科技周末再度急跌。</b>周五A股广度修复，但QQQ跌2.47%、SOXX跌4.15%，高估值科技面临周一补跌压力。联瑞新材可转债筹码、前期板块踩踏与外部芯片急跌多项并存，继续标记<b>高位踩踏风险</b>；宁德明日业绩不得提前押注。</p></section>',
        page, flags=re.S,
    )
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>新易盛看303.4/299/295；宁德看434/431/425；跌破继续减风险。</li><li>澜起回购消息不追高，收170仅首日修复，173.4/180并守位才降低个股风险。</li><li>阿里今日必须守108并收110.9/112；铖昌守80.8并收83/85，才允许从纯防守转修复观察。</li><li>联瑞按新基准看101.45/100，收104.6只回到理论除权参考；机械除权不得误判为暴跌。</li><li>禁止押注宁德10月20日业绩；未经披露的一致预期差一律标为无法可靠判断。</li></ul></section>',
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
