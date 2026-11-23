from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261123 as prev


base = prev.base
raw = prev.raw
B = Path(r"D:\Evan\html\automation-2-holdings")
A = B / "archive"
LJ = B / "latest.json"
LH = B / "latest.html"
RJ = B / "review_latest.json"
MJ = B / "market_tencent_20261124.json"
MP = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MJ


UPDATES = {
    "300502": {
        "bull": "11月23日涨9.92%至181.36，收回158/165/180；订单充足、1.6T放量和全球扩产逻辑未变，隔夜NVDA与SOXX强反弹提供外部缓冲。",
        "bear": "仅是首日收回180，仍未站稳185且组合集中度最高；隔夜美元ETF UUP上涨0.54%，外部波动仍极端。",
        "message_level": "首日收回180 + 外部急反弹",
        "judgement": "中性偏利多",
        "action": "橙色修复观察；看180/176/165，必须再守一整日才降低风险；185前不追。",
        "risk_level": "橙色",
        "risk_note": "关键位首日收回，只从纯防守升级为修复观察；集中度与外部高波动仍压制仓位。",
    },
    "688008": {
        "bull": "低开探123后收132.20，涨2.95%并首日收回127.4/130；5亿元回购完成和Q3订单逻辑未变。",
        "bear": "盘中失125且5日仍跌5.43%，减持窗口与半导体高波动尚未消失。",
        "message_level": "探123后收回130",
        "judgement": "中性",
        "action": "橙色修复观察；看130/127.4/123，下一日守130才确认，失127.4恢复红色。",
        "risk_level": "橙色",
        "risk_note": "回购与经营提供支撑，但盘中破位后的单日收回不等于趋势确认。",
    },
    "688017": {
        "bull": "机器人主线66股涨停，公司涨12.77%至260.28，收回230/245/250；Q3经营证据未变。",
        "bear": "盘中低222、日内振幅大，主题由冰点直接升至高潮；现金流弱和高估值风险未消。",
        "message_level": "单日+12.77% + 机器人高潮",
        "judgement": "中性偏利多",
        "action": "橙色拥挤修复；看250/245/230，禁止追涨；失245恢复红色，冲266附近只看承接。",
        "risk_level": "橙色",
        "risk_note": "未触发3日/5日硬涨幅阈值，但机器人主线单日66股涨停，题材拥挤与振幅风险高。",
    },
    "688012": {
        "bull": "收258.34，继续守250且5日涨10.78%；重复订单、薄膜设备出货与4亿至5亿元回购方案继续支撑。",
        "bear": "盘中一度跌至236.32，收盘仍跌1.21%，明显弱于芯片板块和隔夜SOXX反弹；经营现金流与非经常收益风险未消。",
        "message_level": "守250但盘中急挫",
        "judgement": "中性",
        "action": "橙色相对强势观察；看250/245/236，组合红门下禁止加仓，失245转红。",
        "risk_level": "橙色",
        "risk_note": "收盘关键位有效，但盘中流动性冲击显示承接仍不稳定。",
    },
    "002837": {
        "bull": "收32.76、首日收回32；马来西亚全资下属公司652.53万元预付款保函支持海外经营，担保余额仅占最近一期经审计净资产1.22%，无逾期担保。",
        "bear": "仍未收回33.5，5日跌5.97%；利润、毛利率和高存货风险未改善，马来西亚子公司前三季度收入较低。",
        "message_level": "收回32 + 小额海外担保",
        "judgement": "中性偏利空",
        "action": "红色防守；看32/31.05/30，收回33.5并次日守住才转修复观察，禁止摊低。",
        "risk_level": "红色",
        "risk_note": "只收回最低观察位，经营质量和趋势关键位尚未修复。",
    },
    "03750.HK": {
        "bull": "低见325.4后收331.4，守住331；A股回购注销与产业协同提供长期支撑。",
        "bear": "收盘仍跌1.07%、未收回340，3日跌10.43%；Q3不及预期和现金流下降仍限制估值修复。",
        "message_level": "守331但未收340",
        "judgement": "利空",
        "action": "红色防守；看331/325.4/320，收回340并再守一日才进入修复观察，失320继续减风险。",
        "risk_level": "红色",
        "risk_note": "仅守最低支撑，业绩预期差与交易弱势尚未修复。",
    },
    "09988.HK": {
        "bull": "H股探79.5后收83.05，守80.95；隔夜ADR涨6.15%至86.04。AI云收入+53%、收入略超LSEG的经营证据未变。",
        "bear": "H股当日仍跌0.36%，非GAAP EPS低于FactSet、FCF流出扩大和中国电商-5%的压力未消。",
        "message_level": "H股守80.95 + ADR反弹",
        "judgement": "中性",
        "action": "橙色修复观察；看82/80.95/79.5，ADR反弹不作为追涨理由；失79.5恢复红色。",
        "risk_level": "橙色",
        "risk_note": "跨市场相对强度修复，但业绩结构分化与现金流压力仍需消化。",
    },
    "002409": {
        "bull": "探71.84后收77，涨2.28%并首日收回75/72；半导体材料长期逻辑未变。",
        "bear": "仍未收回78.8/82，3日跌6.87%；Q3不及预期和半导体高波动仍压制交易时点。",
        "message_level": "探72后收回75",
        "judgement": "中性偏利空",
        "action": "橙色修复观察；看75/72/71.84，收回78.8并守一日才升级，失72转红。",
        "risk_level": "橙色",
        "risk_note": "关键位首日修复，但财报预期差和上方压力尚未消化。",
    },
    "688300": {
        "bull": "低见66.1后收71.78，涨5.73%并首日收回67.9/70；半导体粉体项目长期期权未变。",
        "bear": "仍未收回72.8，转债赎回预期、项目融资与筹码扰动未消。",
        "message_level": "首日收回70 + 转债筹码",
        "judgement": "中性",
        "action": "橙色修复观察；看70/67.9/66.1，72.8前不追，失67.9恢复红色。",
        "risk_level": "橙色",
        "risk_note": "收回关键位但筹码与融资约束仍在，至少等待下一交易日确认。",
    },
    "001270": {
        "bull": "低见63.22后收69.14，涨5.69%并首日收回65.4/66；机器人主线提供交易催化。",
        "bear": "5日仍跌9.82%，Q3利润下滑、减值和可交换债压力未消；机器人热度不等于基本面改善。",
        "message_level": "首日收回66 + 机器人催化",
        "judgement": "中性",
        "action": "橙色修复观察；看66/65.4/63.22，70前不追；失65.4恢复红色。",
        "risk_level": "橙色",
        "risk_note": "行业催化仅改善交易层，不上调基本面与财务评分。",
    },
}


REVIEW_META = {
    "300502": ("修复有效需上调观察", "涨9.92%并首日收回180", "由纯防守升为修复观察，下一日守位前不降低总风险"),
    "688008": ("修复有效需上调观察", "盘中失125后收回130", "保留盘中破位警示，收盘转修复观察"),
    "688017": ("修复有效需上调观察", "低222后涨12.77%收260.28", "上调交易观察但增加题材拥挤权重"),
    "688012": ("完全有效", "盘中低236.32且收盘仍守250", "禁止逆势加仓约束有效，维持关键位纪律"),
    "002837": ("修复有效需上调观察", "低31.05后首日收回32", "仅上调到修复观察，33.5未收回"),
    "03750.HK": ("完全有效", "低325.4、收331.4且未收340", "最低支撑有效但趋势未修复"),
    "09988.HK": ("修复有效需上调观察", "H股探79.5后收83.05，ADR反弹6.15%", "跨市场修复观察，业绩结构风险不变"),
    "002409": ("修复有效需上调观察", "低71.84后收回75", "首日关键位修复，等待78.8确认"),
    "688300": ("修复有效需上调观察", "低66.1后收回70", "转债筹码风险不变，等待72.8确认"),
    "001270": ("修复有效需上调观察", "低63.22后收回66", "题材催化不改财务弱点，等待下一日守位"),
}


RADAR = {
    "date": "2026-11-24",
    "window": "06:00盘前",
    "warning": "橙色",
    "warning_points": 9,
    "triggers": [
        "11月23日A股约4562股上涨、700股下跌，成交约1.55万亿元；涨停146、跌停3、封板率约85.9%，完成首日广度修复。",
        "机器人概念66股涨停、昨日涨停股平均+7.69%，情绪由极端冰点快速升温，追后排与高潮一致性风险同步上升。",
        "隔夜SPY+4.70%、QQQ+7.01%、SOXX+13.60%、NVDA+31.56%，缓解外部硬风险；但UUP+0.54%，波动仍极端。",
    ],
    "opening_scenario": "强修复次日容易分化；先看机器人前排封单、后排回落和科技核心能否守住首日收复位。",
    "state": "S4 结构进攻信号（首日未确认）",
    "radar_score": 60.8,
    "MSS": 28,
    "MBS": 80,
    "FRS": 52,
    "TES": 88,
    "ET": 90,
    "position_ceiling": "宏观信号改善，但组合仍执行红色总阀门：风险预算上限5%，新增仓位、题材交易和摊低均为0。",
    "allowed": "只验证收复位和处理既有风险；强势股等待下一完整交易日守位。",
    "blocked": "禁止把单日V形修复视为趋势反转，禁止追机器人后排，禁止因隔夜美股暴涨扩大同变量暴露。",
    "focus": "09:45观察涨停溢价、机器人后排、上涨家数及新易盛180/185、绿的250/266、中微250。",
    "downgrade": "若上涨家数重新低于2000、炸板显著上升，或核心股失去首日收复位，宏观信号退回S1/S0，组合继续红色。",
    "v231_link": "经营评分不因单日反弹上调；只上调交易时机与相对强弱观察，组合科技同变量折扣继续生效。",
}


def main() -> None:
    previous = json.loads(LJ.read_text(encoding="utf-8-sig"))
    market = base.fetch_market()
    raw.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-23"]
        assert market["quotes"][code][-1]["date"] == "2026-11-23", code
    base.atomic_write(MJ, json.dumps(market, ensure_ascii=False, indent=2))

    holdings = []
    review_items = []
    for old in previous["holdings"]:
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note"}}
        update = UPDATES[item["code"]]
        item.update(update)
        rows = market["quotes"][item["code"]]
        closes = [row["close"] for row in rows]
        last = rows[-1]
        item.update(
            last_trade_date=last["date"],
            last_close=last["close"],
            one_day_pct=base.pct(closes[-2], closes[-1]),
            three_day_pct=base.pct(closes[-4], closes[-1]),
            five_day_pct=base.pct(closes[-6], closes[-1]),
            turnover_volume=int(last["volume"]),
            day_high=last["high"],
            day_low=last["low"],
        )
        holdings.append(item)
        verification, trigger, adjustment = REVIEW_META[item["code"]]
        review_items.append(
            {
                "name": item["name"],
                "code": item["code"],
                "morning_risk": old["risk_level"],
                "morning_judgement": old["judgement"],
                "morning_close": old["last_close"],
                "review_price_date": "2026-11-23",
                "review_close": last["close"],
                "review_move_pct": base.pct(old["last_close"], last["close"]),
                "verification": verification,
                "trigger_check": trigger,
                "logic_adjustment": adjustment,
            }
        )

    now = datetime.now(TZ).replace(microsecond=0)
    review = {
        "generated_at": now.isoformat(),
        "review_window": "使用2026-11-23完整A/H收盘验证上一版06:00判断；隔夜美股用于11月24日新预警，不倒灌到已完成交易日。",
        "summary": {
            "reviewed_count": 10,
            "exact_effective": 2,
            "useful_but_conservative": 0,
            "repair_upgrade": 8,
            "underestimated_risk": 0,
            "effective_or_useful": 10,
            "needs_calibration": 8,
            "main_read": "红色加仓纪律有效；八只股票完成首日关键位修复，只能升级为修复观察，至少等待下一完整交易日守位。",
        },
        "items": review_items,
        "logic_corrections": [
            "单日4562股上涨只能把纯防守升级为修复观察，不直接降低组合总风险。",
            "绿的谐波和铖昌科技的机器人涨幅归因于行业催化与情绪，不上调基本面评分。",
            "隔夜美股急涨缓解外部硬风险，但极端波动和美元上行要求继续保留组合暴露折扣。",
        ],
    }

    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive_html = A / f"automation_2_holdings_{stamp}.html"
    archive_review = A / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG日K，使用2026-11-23完整A/H收盘。",
        "A股复盘：上涨4562、下跌700，成交15526.63亿元，涨停146、跌停3、封板率85.88%，机器人概念66只涨停；https://agu-app.com/daily/2026-11-23",
        "指数：上证+0.15%、深证+1.93%、创业板+3.08%、科创综指+2.62%；https://www.dabanke.com/index-20261123.html",
        "港股：恒指-0.12%、恒生科技-0.09%；https://qt.gtimg.cn/q=r_hkHSI,r_hkHSTECH",
        "美股：SPY+4.70%、QQQ+7.01%、SOXX+13.60%、NVDA+31.56%、BABA ADR+6.15%，IEF-0.01%、UUP+0.54%；https://finance.yahoo.com/quote/SOXX/",
        "英维克公告：为马来西亚全资下属公司开立652.53万元预付款保函；担保余额4220.16万元、占净资产1.22%，无逾期或合并范围外担保；https://pdf.dfcfw.com/pdf/H2_AN202611231831958781_1.pdf",
        "其余A股持仓截至06:00未见改变经营事实的重大新增公告；宁德新增H股翌日披露报表不改变判断。",
        "财报预期差沿用已核验正式披露：阿里符合预期（收入超、EPS不及）；其余持仓沿用既有半年报/三季报口径，不把单日价格变化写成业绩预期差。",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-24 06:00；使用11月23日A/H完整收盘、盘后公告与隔夜美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色组合约束。宏观出现S4结构进攻信号但仅完成首日修复；按规则至少等待下一完整交易日守位。组合风险预算上限5%，新增仓位、题材交易和摊低均为0。",
        "top_attention": [
            {"name": "绿的谐波", "reason": "单日+12.77%，机器人66股涨停使题材从冰点快速进入拥挤区；禁止追涨，先看250/245。"},
            {"name": "新易盛", "reason": "首日收回180且隔夜NVDA急涨，但集中度最高、185未收回；必须再守一日。"},
            {"name": "宁德时代-H", "reason": "仅守331、仍未收回340且3日跌10.43%；公司长期逻辑未变但交易层尚未修复。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MP),
        "accuracy_review": review,
        "macro_radar": RADAR,
    }

    latest_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-24", 1)
    trigger_list = "".join(f"<li>{x}</li>" for x in RADAR["triggers"])
    macro_card = (
        '<section class="panel alert"><h2>宏观环境与A股情绪雷达</h2>'
        '<p><span class="pill orange">橙色</span> <b>S4 结构进攻信号（首日未确认）</b> · RadarScore 60.8 · ET 90</p>'
        f"<ul>{trigger_list}</ul><p><b>组合覆盖：</b>{RADAR['position_ceiling']}</p></section>"
    )
    page = re.sub(
        r'<section class="panel alert">.*?</section>',
        '<section class="panel alert"><h2>今日高危预警</h2><p><b>组合仍为红色：</b>强修复只有一日，绿的谐波与机器人主线快速拥挤；宁德时代-H、英维克仍未完成关键位修复。风险预算上限5%，新增、题材和摊低均为0。</p></section>',
        page,
        flags=re.S,
    )
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', macro_card + '\n    <h2>需要重点注意的3只股票</h2>', 1)

    for path, text in (
        (LJ, latest_json),
        (RJ, review_json),
        (archive_review, review_json),
        (LH, page),
        (archive_html, page),
    ):
        base.atomic_write(path, text)
    print(
        json.dumps(
            {
                "latest": str(LH),
                "archive": str(archive_html),
                "review_archive": str(archive_review),
                "generated_at": now.isoformat(),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
