from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261019 as previous


base = previous.base
BASE = Path(r"D:\Evan\html\automation-2-holdings")
ARCHIVE = BASE / "archive"
MEMORY_PATH = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
LATEST_JSON = BASE / "latest.json"
LATEST_HTML = BASE / "latest.html"
REVIEW_JSON = BASE / "review_latest.json"
MARKET_JSON = BASE / "market_tencent_20261020.json"
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MARKET_JSON


UPDATES = {
    "300502": {
        "bull": "10月19日盘中低297.49后回收至308.00、收涨0.36%；8亿至10亿元回购提议仍构成公司层支撑。",
        "bear": "仍未收回315/320且组合集中度最高；盘中失299说明筹码仍不稳定，回购方案与实施仍未落地。",
        "message_level": "盘中失299后回收 + 315未复", "judgement": "中性",
        "action": "看297.5/295，失295继续降集中度；收315/320只算止跌，330并守位才转修复。",
        "risk_level": "红色", "risk_note": "尾盘回收不能覆盖盘中破位，集中度约束不放松。",
    },
    "688008": {
        "bull": "独立董事3亿至5亿元回购提议与10月23日每股0.20元分红构成事件支撑；正式半年报高增长逻辑不变。",
        "bear": "10月19日冲高170.49后回落2.33%至165.25，失165.7；回购要到10月29日董事会审议，减持计划仍在。",
        "message_level": "回购利多冲高回落 + 165.7失守", "judgement": "利空",
        "action": "看164.6/163/157.7，失163继续减风险；收170只算止跌，173.4/180并守位才转修复。",
        "risk_level": "红色", "risk_note": "事件催化未转化为收盘强势，禁止追回购消息。",
    },
    "688017": {
        "bull": "机器人板块成为10月19日主线，绿的谐波涨5.81%至250.50、盘中高254.99，收回240/245。",
        "bear": "反弹主要来自行业与市场风格，周末未见公司经营层新增公告；仍未稳住252/255，现金流偏弱问题未变。",
        "message_level": "机器人主线修复 + 252待确认", "judgement": "中性",
        "action": "升级为红色修复观察；看245/240，今日守245并收252/255才考虑橙色，失240恢复纯防守。",
        "risk_level": "红色", "risk_note": "首日强反弹只升级观察，不把题材上涨误写成基本面改善。",
    },
    "688012": {
        "bull": "国产替代与先进封装布局逻辑未变；未见新的公司级重大利空公告。",
        "bear": "10月19日大跌6.08%至277.27、低276，失280；科创50跌2.17%，公司基本面未变但交易风险显著上升。",
        "message_level": "280失守 + 科创50领跌", "judgement": "利空",
        "action": "看276/275/268，失275继续减风险；收280/290只算止跌，300并守位才转修复。",
        "risk_level": "红色", "risk_note": "交易层破位明确；不把市场风格下跌误写成新基本面利空。",
    },
    "002837": {
        "bull": "股票期权长期考核与液冷需求逻辑未变，10月19日未见重大新增公司公告。",
        "bear": "10月19日再跌0.54%至44.46、盘中低43.04，仍低于46.73元行权价；半年报利润同比下滑尚未修复。",
        "message_level": "43.04新低 + 行权价未复", "judgement": "利空",
        "action": "看43/42，失42继续减风险；收46.5/46.73只算止跌，48.8/50并守位才转修复。",
        "risk_level": "红色", "risk_note": "激励目标不等于当前盈利兑现，弱势趋势延续。",
    },
    "03750.HK": {
        "bull": "10月19日香港重阳节翌日休市，未出现新的完整价格信号；回购、员工持股与产业基金仍为中期支撑。",
        "bear": "最新完整收盘仍为10月16日440.80并失450；10月20日审议三季度业绩，结果在06:00截止时尚未披露，禁止押注预期差。",
        "message_level": "港股休市 + 今日业绩窗口", "judgement": "利空",
        "action": "红色强防守；复市看434/431/425，失425继续减风险；收450只算止跌，458/475并守位才转修复。",
        "risk_level": "红色", "risk_note": "休市不构成修复确认，业绩未披露前不提前下注。",
    },
    "09988.HK": {
        "bull": "速卖通提出未来三年品牌业务规模与百万美元品牌数年复合增长各50%，并拟扶持100多个AI硬件品牌；达摩院发布车规增强RISC-V处理器IP玄铁E908A。",
        "bear": "10月19日港股休市，108修复尚未获得下一交易日确认；上述战略目标与产品路线不等同当前利润，潜在激励股份供给仍需观察。",
        "message_level": "跨境双50%目标 + 港股休市", "judgement": "中性",
        "action": "红色修复观察；复市必须守108，收110.9/112后才考虑橙色；失105恢复纯防守。",
        "risk_level": "红色", "risk_note": "新战略只计成长选项，休市期间不降低交易风险。",
    },
    "002409": {
        "bull": "半导体材料国产替代与江苏雅睿中长期研发融资逻辑未变，未见重大新增公司公告。",
        "bear": "10月19日再跌1.94%至96.11、盘中低92.70并失95；新业务仍处研发验证且尚未形成利润。",
        "message_level": "盘中失95 + 新业务未盈利", "judgement": "利空",
        "action": "看92.7/90，失90继续减风险；收97.9/100只算止跌，101.9/105并守位才转修复。",
        "risk_level": "红色", "risk_note": "价格继续下移，战略投入不能替代利润与交易确认。",
    },
    "688300": {
        "bull": "10转3已完成并按260股、参考成本约190元跟踪；10月19日盘中低94后回收至100.43。",
        "bear": "收盘仍跌2.21%，盘中明显失100；6.94694亿元转债绝大部分未转，筹码压力与前期板块踩踏未解除。",
        "message_level": "盘中失100后回收 + 转债压力", "judgement": "利空",
        "action": "看94/92/90，失90继续减风险；收103.8/104.6只算止跌，107.7并守位才转修复。",
        "risk_level": "红色", "risk_note": "维持高位踩踏风险；所有价格均按除权后新基准。",
        "position": "260股（由原200股按10转3机械调整）",
        "cost": "247（除权参考约190.00）",
    },
    "001270": {
        "bull": "10月19日再涨1.58%至82.43，连续第二日守住80.8；半年报利润增长事实未变。",
        "bear": "收盘仍未站83/85，控股股东可交换债构成潜在供给，股数与成本继续缺失。",
        "message_level": "连续守80.8 + 83未复", "judgement": "中性",
        "action": "看80.8/78.8/77.8；收83/85并次日守位才转修复，失80.8恢复纯防守。",
        "risk_level": "红色", "risk_note": "止跌延续但尚未触发修复确认，参数缺失限制操作。",
    },
}


REVIEW_META = {
    "300502": ("方向偏保守但操作有效", "涨0.36%至308.00，盘中低297.49失299但守295", "尾盘回收未触发315/320修复；集中度防守仍有效。"),
    "688008": ("完全有效", "跌2.33%至165.25、失165.7", "回购消息冲高回落，不追利多约束有效。"),
    "688017": ("修复有效需上调观察", "涨5.81%至250.50、收回240/245但未稳252", "从纯防守升级修复观察，至少今日守245后再降个股风险。"),
    "688012": ("完全有效", "跌6.08%至277.27、失280", "红色防守强验证，下移看276/275/268。"),
    "002837": ("完全有效", "跌0.54%至44.46、低43.04", "红色防守有效，仍低于46.73行权价。"),
    "03750.HK": ("方向偏保守但操作有效", "10月19日港股休市，最新完整收盘仍为440.80", "方向未获新交易日验证；休市不押业绩纪律有效。"),
    "09988.HK": ("方向偏保守但操作有效", "10月19日港股休市，最新完整收盘仍为108.80", "方向未获新交易日验证；108修复继续等待复市确认。"),
    "002409": ("完全有效", "跌1.94%至96.11、盘中失95", "红色防守有效，下移看92.7/90。"),
    "688300": ("完全有效", "跌2.21%至100.43、盘中低94失100", "高位踩踏红色约束有效，继续按除权后新基准。"),
    "001270": ("方向偏保守但操作有效", "涨1.58%至82.43、守80.8但未收83", "止跌延续但未触发83/85修复条件。"),
}


def trim_market(market: dict) -> None:
    for code, rows in market["quotes"].items():
        cutoff = "2026-10-16" if code.endswith(".HK") else "2026-10-19"
        market["quotes"][code] = [row for row in rows if row["date"] <= cutoff]
    base.atomic_write(MARKET_JSON, json.dumps(market, ensure_ascii=False, indent=2))


def enrich(item: dict, market: dict) -> dict:
    expected = "2026-10-16" if item["code"].endswith(".HK") else "2026-10-19"
    rows = market["quotes"][item["code"]]
    if len(rows) < 6 or rows[-1]["date"] != expected:
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
    if item["code"].endswith(".HK"):
        item["session_note"] = "2026-10-19香港重阳节翌日休市，最新完整收盘为2026-10-16。"
    return item


def build_review(prior: dict, market: dict) -> dict:
    items = []
    for old in prior["holdings"]:
        review_date = "2026-10-16" if old["code"].endswith(".HK") else "2026-10-19"
        row = next(x for x in market["quotes"][old["code"]] if x["date"] == review_date)
        verdict, trigger, adjustment = REVIEW_META[old["code"]]
        items.append({
            "name": old["name"], "code": old["code"], "morning_risk": old["risk_level"],
            "morning_judgement": old["judgement"], "morning_close": old["last_close"],
            "review_price_date": review_date, "review_close": row["close"],
            "review_move_pct": base.pct(old["last_close"], row["close"]),
            "verification": verdict, "trigger_check": trigger, "logic_adjustment": adjustment,
        })
    return {
        "generated_at": datetime.now(TZ).replace(microsecond=0).isoformat(),
        "review_window": "A股使用2026-10-19完整收盘验证上一版06:00判断；港股10月19日因重阳节翌日休市，宁德与阿里只验证休市操作纪律，最新完整收盘仍为10月16日。",
        "summary": {
            "reviewed_count": 10, "exact_effective": 5, "useful_but_conservative": 4,
            "repair_upgrade": 1, "underestimated_risk": 0, "effective_or_useful": 10,
            "needs_calibration": 5,
            "main_read": "红色总阀门继续有效：8只A股中5只收跌，中微失280、雅克盘中失95、联瑞盘中失100；新易盛与铖昌方向偏保守但操作约束有效。绿的随机器人主线强修复，只升级修复观察。港股休市，不伪造收盘验证。",
        },
        "items": items,
        "logic_corrections": [
            "沪指与深成指收红，但科创50跌2.17%、下跌3129家多于上涨2275家，必须将权重托底与成长弱势分开。",
            "绿的上涨来自机器人板块主线与交易风格，未见公司经营层新增披露；只调整交易观察，不上调基本面。",
            "中微、雅克、联瑞关键位继续下移，说明美股科技反弹不能自动修复A股高估值成长。",
            "宁德与阿里10月19日港股休市，不能把无交易误写成守位；宁德三季报在06:00截止时尚未披露。",
            "阿里速卖通双50%目标与玄铁E908A属于战略与产品催化，未有收入利润量化前不计入业绩锚。",
        ],
    }


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
        "行情：腾讯/GTIMG前复权日K；8只A股使用2026-10-19完整收盘。10月19日香港为重阳节翌日公众假期，宁德-H与阿里使用10月16日最新完整收盘；严格排除10月20日盘中数据。",
        "A股：沪指+0.39%、深成指+0.13%、创业板-0.94%、科创50-2.17%，两市成交约1.4375万亿元；2275股上涨、3129股下跌，指数权重托底但成长与个股宽度偏弱。",
        "港股休市：香港政府2026年公众假期表列明10月19日为重阳节翌日，故无10月19日完整港股收盘。",
        "外围：10月19日SPY +0.43%、QQQ +1.19%、SOXX +1.75%、DIA -0.05%；IEF -0.38%、UUP +0.24%，美股科技反弹但利率与美元代理略偏紧。",
        "宏观：国家统计局披露前三季度GDP同比增长4.6%，三季度同比4.5%、较二季度4.3%回升；数据支持经济韧性，但未直接改变高估值成长交易结构。",
        "澜起：3亿至5亿元回购仍是独立董事提议，10月29日董事会审议；10月19日冲高170.49后收165.25，事件利多与交易层弱势分开处理。",
        "宁德：10月19日新增H股翌日披露报表属例行股本披露；10月20日审议三季度业绩，06:00截止时结果尚未披露，预期差暂无法可靠判断。",
        "阿里：速卖通提出未来三年品牌业务规模及百万美元品牌数年复合增长各50%，拟扶持100多个AI硬件品牌；达摩院发布玄铁E908A车规RISC-V处理器IP。均属战略/产品催化，不计入当前利润。",
        "公司公告复核：除宁德例行H股报表外，其余A股持仓10月19日晚至06:00未见改变经营事实的重大新增公告。",
        "高位筛查：无持仓触发3日+25%或5日+35%涨幅阈值；联瑞仍满足可转债筹码压力与前期板块踩踏/放量弱势两项，维持高位踩踏风险。",
        "财报源：A股持仓使用正式2026半年报，宁德使用A/H中报，阿里使用截至2026-06-30季度业绩；未取得可验证一致预期，不把同比增长硬判超预期。",
        "持仓范围：仅跟踪新易盛、澜起科技、绿的谐波、中微公司、英维克、宁德时代-H、阿里巴巴-W、雅克科技、联瑞新材、铖昌科技；清仓名单继续排除。",
        "主要链接：https://www.stats.gov.cn/sj/zxfbhjd/202610/t20261019_1965618.html ; https://www.info.gov.hk/gia/general/202505/16/P2025051300353p.htm ; https://finance.ifeng.com/c/8xM2R11HeJM ; https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?stockid=688008&id=12647482 ; https://finance.eastmoney.com/a/202610193899890694.html ; https://finance.yahoo.com/quote/QQQ/ ; https://finance.yahoo.com/quote/SOXX/",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-10-20 06:00；本轮为09:48后补跑但严格排除10月20日盘中行情。A股使用10月19日完整收盘，港股因假期使用10月16日收盘，隔夜美股使用10月19日完整收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色防守、权重托底不等于科技成长修复。10月19日沪指与深成指收红，但科创50跌2.17%、下跌3129家多于上涨2275家；8只A股持仓中5只下跌，中微失280、雅克盘中失95、联瑞盘中失100。隔夜QQQ与SOXX反弹只提供外部缓冲；港股昨日休市，宁德今日业绩仍未披露。今日禁止追反弹和摊低，绿的、铖昌等只有下一交易日守住关键位后才允许降低个股风险。",
        "top_attention": [
            {"name": "中微公司", "reason": "10月19日跌6.08%至277.27并失280，科创50领跌；基本面未新增恶化，但交易风险显著上升。"},
            {"name": "宁德时代-H", "reason": "10月19日港股休市，最新收440.80且失450；10月20日审议三季报，06:00截止时结果未披露，禁止押注。"},
            {"name": "新易盛", "reason": "组合集中度最高，盘中低297.49失299后才回收308；未收315/320前仍是红色防守。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MEMORY_PATH),
        "accuracy_review": review,
    }
    text_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-10-20", 1)
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>组合红色防守，权重托底不等于科技成长修复。</b>科创50跌2.17%，中微失280、雅克盘中失95、联瑞盘中失100。联瑞可转债筹码压力与前期板块踩踏/放量弱势并存，继续标记<b>高位踩踏风险</b>；宁德今日业绩不得提前押注。港股10月19日休市，不伪造收盘验证。</p></section>',
        page, flags=re.S,
    )
    page = re.sub(
        r'<section class="panel plan">.*?</section>',
        '<section class="panel plan"><h2>风险预案</h2><ul><li>中微看276/275/268，新易盛看297.5/295；跌破继续减风险。</li><li>绿的只升级红色修复观察，今日守245并收252/255才考虑橙色；题材上涨不等同基本面改善。</li><li>联瑞看94/92/90，收103.8/104.6只算止跌；所有价格均按除权后新基准。</li><li>港股复市后：宁德看434/431/425，阿里必须守108并收110.9/112；10月19日休市不算守位。</li><li>禁止押注宁德三季报；未经正式披露与可靠一致预期验证，一律不判超预期或不及预期。</li></ul></section>',
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
