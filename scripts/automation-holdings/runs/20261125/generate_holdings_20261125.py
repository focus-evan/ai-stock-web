from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261124 as prev


base = prev.base
raw = prev.raw
B = Path(r"D:\Evan\html\automation-2-holdings")
A = B / "archive"
LJ = B / "latest.json"
LH = B / "latest.html"
RJ = B / "review_latest.json"
MJ = B / "market_tencent_20261125.json"
MP = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MJ


U = {
    "300502": ("收180.01，连续第二日守住180；订单充足、1.6T放量与全球扩产逻辑未变。", "高开197、冲201.99后收在日内最低，形成明显高开低走；隔夜SOXX-8.25%、NVDA-5.78%，CPO外部映射再度转弱。", "守180但高开低走 + 外部半导体重挫", "利空", "红色高位踩踏风险；看180/176/165，失176继续减风险；反抽185/197只处理风险，不加仓。", "红色", "组合集中度、高开低走与海外科技反转共同触发红色纪律。"),
    "688008": ("收133.17，连续第二日守130；5亿元回购完成与Q3订单逻辑未变。", "高开143后收133.17、接近日低133；减持窗口与隔夜SOXX-8.25%叠加，修复承接不足。", "守130但高开回落 + SOXX重挫", "利空", "红色防守；看133/130/127.4，失130转弱；143前不追反弹。", "红色", "两日守位只证明支撑，外部半导体反转和高开回落阻止降险。"),
    "688017": ("收255，连续第二日守250；Q3经营证据与机器人长期产业逻辑未变。", "冲272.34后收日低255，机器人涨停由66只降至19只，封板率降至44.72%；高估值与现金流弱点仍在。", "守250 + 机器人退潮分化", "利空", "红色高位踩踏风险；看250/245/230，失245继续减风险；272前不追。", "红色", "基本面未变，但主题扩散骤降、日内兑现和高估值构成多项红色条件。"),
    "688012": ("收259.23、连续守250且5日涨6.17%；重复订单、薄膜设备出货与回购方案继续支撑。", "高开267后回落，隔夜SOXX跌8.25%；经营现金流与非经常收益风险未消。", "守250 + 外部半导体反转", "中性", "橙色相对强势观察；看258/250/245，组合红门下禁止加仓，失250转红。", "橙色", "价格相对强但同变量外部风险上升，基本面分与交易时点继续分开。"),
    "002837": ("收32.54，连续第二日守32；652.53万元海外保函及1.22%担保余额不构成重大财务风险。", "高开35.07、冲35.88后收近低位，未站稳33.5；利润、毛利率与存货风险未改善。", "守32但33.5确认失败", "利空", "红色高位踩踏风险；看32/31.05/30，失32继续减风险；33.5前不加仓。", "红色", "高开兑现、经营弱点与算力高波动叠加，交易层仍未修复。"),
    "03750.HK": ("涨1.63%至336.8，连续守331；A股回购注销与产业协同提供长期支撑。", "高开348.4、冲357后回落，收盘仍未收回340；Q3不及预期和现金流下降继续压制估值。", "守331但340仍未收回", "中性偏利空", "红色防守；看334/331/325.4，收回340并守住才转橙，失331看320。", "红色", "仅完成底部支撑确认，业绩预期差与上方抛压未修复。"),
    "09988.HK": ("收82.2，连续第二日守82/80.95；AI云+53%与收入略超LSEG的证据未变。", "高开86.6后收82.2、接近日低，恒生科技-1.17%，隔夜ADR再跌1.36%；EPS不及FactSet和FCF流出压力仍在。", "守82但跨市场高开回落", "中性偏利空", "橙色防守观察；看82/80.95/79.5，失80.95转红；不追事件反弹。", "橙色", "支撑确认有效，但高开回落与业绩结构分化阻止进一步升级。"),
    "002409": ("涨3.34%至79.57，首次收回78.8并继续守75；半导体材料长期逻辑未变。", "高见83.14后回落，Q3不及预期未改变；隔夜SOXX-8.25%形成外部硬压制。", "首收78.8 + 外部半导体重挫", "中性", "橙色修复观察；看78.8/75/72，至少再守一日才降低个股风险，失75转红。", "橙色", "关键位首次收回，但财报预期差和外部同变量风险仍在。"),
    "688300": ("涨2.56%至73.62，首次收回72.8；公司决定未来3个月内不提前赎回联瑞转债，解除短期强赎倒计时。", "转债仍处转股期且潜在稀释不消失；公告披露过去6个月生益科技及实控人等卖出大量联瑞转债，属转债交易而非新增A股减持计划。", "首收72.8 + 三个月不强赎", "中性偏利多", "橙色修复观察；看72.8/70/67.9，不追高开；失70恢复红色。", "橙色", "不强赎缓解短期事件压力，但转股稀释和历史转债抛售仍需计入筹码风险。"),
    "001270": ("涨2.00%至70.52，首次收在70上方；机器人与商业航天长期映射未变。", "高见74.22后回落，机器人涨停数大幅收缩；Q3利润下滑、减值和可交换债压力未消。", "首收70 + 机器人退潮分化", "中性偏利空", "红色高位踩踏风险；看70/66/65.4，失66继续减风险；74前不追。", "红色", "题材退潮、经营弱点和高开回落共同压制交易时点。"),
}


REVIEW = {
    "300502": ("完全有效", "守180但高开201.99后收日低180.01", "不追185/197的约束有效，继续红色处理"),
    "688008": ("完全有效", "连续守130但高开143后回落", "守位确认与追高禁令同时有效，外部风险上调"),
    "688017": ("完全有效", "守250但冲272.34后收255", "不追与题材拥挤警示有效，风险升红"),
    "688012": ("完全有效", "连续守250、收259.23", "相对强势成立，但系统门控继续禁止加仓"),
    "002837": ("完全有效", "守32但收盘未站稳33.5", "33.5确认条件未满足，维持红色"),
    "03750.HK": ("完全有效", "守331但收盘仍低于340", "底部支撑有效，趋势确认未完成"),
    "09988.HK": ("完全有效", "连续守82但高开86.6后回落", "支撑确认与不追纪律有效，维持橙色"),
    "002409": ("修复有效需上调观察", "首次收回78.8", "只上调修复观察，至少再守一日"),
    "688300": ("修复有效需上调观察", "首次收回72.8且公告三个月不强赎", "事件压力下降但转股筹码风险不消失"),
    "001270": ("修复有效需上调观察", "首次收在70上方", "价格上调观察，基本面评分不变"),
}


RADAR = {
    "date": "2026-11-25",
    "window": "06:00盘前",
    "warning": "红色",
    "warning_points": 9,
    "triggers": [
        "11月24日A股仅约1853股上涨、3420股下跌；封板率由85.88%降至44.72%，涨停由146降至55、炸板增至68。",
        "机器人涨停由66只缩至19只，1进2晋级率仅19.23%，主线扩散和封板质量同步回落。",
        "隔夜QQQ-1.97%、SOXX-8.25%、NVDA-5.78%，高估值科技再度反转；恒生科技此前亦跌1.17%。",
    ],
    "opening_scenario": "科技与机器人可能低开分化；任何因美股前一日暴涨形成的高开已被证实容易兑现，反抽只用于处理风险。",
    "state": "S7 退潮确认（硬风险覆盖）",
    "radar_score": 28.6,
    "MSS": 18,
    "MBS": 35,
    "FRS": 32,
    "TES": 32,
    "ET": 70,
    "position_ceiling": "组合风险预算0%-5%，新增仓位、题材交易和摊低均为0；只保留极高确定性观察。",
    "allowed": "只处理弱势和高开兑现风险，保留现金；相对强个股仅观察关键位。",
    "blocked": "禁止追机器人后排，禁止抄底CPO/半导体，禁止把两日守位解释为系统性趋势反转。",
    "focus": "09:45观察上涨家数、炸板率、机器人后排，以及新易盛180/176、绿的250/245、中微250。",
    "downgrade": "已处S7；若新易盛失176、绿的失245或上涨家数低于1500，继续压缩风险。升级需宽度、封板质量和海外半导体连续修复。",
    "v231_link": "基本面评分不因高开低走改写，但相对强弱、交易时机与组合暴露折扣全面从严。",
}


def main():
    previous = json.loads(LJ.read_text(encoding="utf-8-sig"))
    market = base.fetch_market()
    raw.fetch_raw_montage(market)
    for code, rows in market["quotes"].items():
        market["quotes"][code] = [row for row in rows if row["date"] <= "2026-11-24"]
        assert market["quotes"][code][-1]["date"] == "2026-11-24", code
    base.atomic_write(MJ, json.dumps(market, ensure_ascii=False, indent=2))

    holdings, review_items = [], []
    for old in previous["holdings"]:
        item = {k: v for k, v in old.items() if k not in {"day_high", "day_low", "session_note"}}
        bull, bear, level, judgement, action, risk_level, risk_note = U[item["code"]]
        item.update(bull=bull, bear=bear, message_level=level, judgement=judgement, action=action, risk_level=risk_level, risk_note=risk_note)
        rows = market["quotes"][item["code"]]
        closes = [row["close"] for row in rows]
        last = rows[-1]
        item.update(last_trade_date=last["date"], last_close=last["close"], one_day_pct=base.pct(closes[-2], closes[-1]), three_day_pct=base.pct(closes[-4], closes[-1]), five_day_pct=base.pct(closes[-6], closes[-1]), turnover_volume=int(last["volume"]), day_high=last["high"], day_low=last["low"])
        holdings.append(item)
        verification, trigger, adjustment = REVIEW[item["code"]]
        review_items.append({"name": item["name"], "code": item["code"], "morning_risk": old["risk_level"], "morning_judgement": old["judgement"], "morning_close": old["last_close"], "review_price_date": "2026-11-24", "review_close": last["close"], "review_move_pct": base.pct(old["last_close"], last["close"]), "verification": verification, "trigger_check": trigger, "logic_adjustment": adjustment})

    now = datetime.now(TZ).replace(microsecond=0)
    review = {
        "generated_at": now.isoformat(),
        "review_window": "使用2026-11-24完整A/H收盘验证上一版06:00判断；隔夜美股用于11月25日新预警，不倒灌到已完成交易日。",
        "summary": {"reviewed_count": 10, "exact_effective": 7, "useful_but_conservative": 0, "repair_upgrade": 3, "underestimated_risk": 0, "effective_or_useful": 10, "needs_calibration": 3, "main_read": "守位与不追纪律有效；雅克、联瑞、铖昌首次收回更高关键位，只升级修复观察。市场宽度、封板质量与海外半导体共同转弱，组合总风险不下调。"},
        "items": review_items,
        "logic_corrections": ["第二日守位是个股交易层确认，不覆盖市场封板质量骤降与海外科技反转。", "机器人涨停数和晋级率回落确认题材分化，绿的与铖昌不因价格守位上调基本面。", "联瑞不强赎降低短期事件风险，但转债仍可转股，历史转债卖出不误写成新增A股减持。"],
    }

    stamp = now.strftime("%Y%m%d_%H%M%S")
    archive_html = A / f"automation_2_holdings_{stamp}.html"
    archive_review = A / f"automation_2_holdings_review_{stamp}.json"
    sources = [
        "行情：腾讯/GTIMG日K，使用2026-11-24完整A/H收盘。",
        "A股复盘：上涨1853、下跌3420，成交16548.62亿元，涨停55、炸板68、跌停3，封板率44.72%；https://agu-app.com/daily/2026-11-24",
        "指数：上证+0.27%、深证-0.29%、创业板-0.05%、科创综指+1.16%；https://www.dabanke.com/index-20261124.html",
        "港股：恒指-0.73%、恒生科技-1.17%；https://qt.gtimg.cn/q=r_hkHSI,r_hkHSTECH",
        "美股：SPY-0.47%、QQQ-1.97%、SOXX-8.25%、NVDA-5.78%、BABA ADR-1.36%，IEF持平、UUP-0.50%；https://finance.yahoo.com/quote/SOXX/",
        "联瑞新材公告：已触发强赎条款但决定2026-11-25至2027-02-24不提前赎回；2027-02-25重新计算。公告同时披露过去6个月相关主体转债交易，非新增A股减持计划；https://pdf.dfcfw.com/pdf/H2_AN202611241831995535_1.pdf",
        "其余持仓截至06:00未见改变经营事实的重大新增公告；英维克担保公告沿用前一日已核验口径。",
        "财报预期差沿用已核验正式披露：阿里符合预期（收入超、EPS不及）；其余持仓沿用既有半年报/三季报口径，价格波动不改写业绩结论。",
    ]
    report = {
        "generated_at": now.isoformat(),
        "window": "截至北京时间2026-11-25 06:00；使用11月24日A/H完整收盘、盘后公告与隔夜美股收盘。",
        "risk_level": "红色",
        "gate": "总阀门：红色，S7退潮确认并触发外部硬风险覆盖。A股宽度转弱、封板率降至44.72%，隔夜SOXX跌8.25%。组合风险预算0%-5%，新增仓位、题材交易和摊低均为0。",
        "top_attention": [
            {"name": "新易盛", "reason": "高开197、冲201.99后收日低180.01；集中度最高且隔夜SOXX再跌8.25%，反抽只处理风险。"},
            {"name": "绿的谐波", "reason": "冲272.34后收255，机器人涨停从66只降至19只、封板率骤降，题材退潮风险上升。"},
            {"name": "联瑞新材", "reason": "首次收回72.8且三个月不强赎偏正面，但转股稀释与历史转债卖出仍需区分跟踪。"},
        ],
        "holdings": holdings,
        "sources_or_notes": sources,
        "memory_path": str(MP),
        "accuracy_review": review,
        "macro_radar": RADAR,
    }
    latest_json = json.dumps(report, ensure_ascii=False, indent=2)
    review_json = json.dumps(review, ensure_ascii=False, indent=2)
    page = base.render(report).replace("2026-09-25", "2026-11-25", 1)
    trigger_list = "".join(f"<li>{x}</li>" for x in RADAR["triggers"])
    macro_card = '<section class="panel alert"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill red">红色</span> <b>S7 退潮确认（硬风险覆盖）</b> · RadarScore 28.6 · ET 70</p>' + f"<ul>{trigger_list}</ul><p><b>仓位上限：</b>{RADAR['position_ceiling']}</p></section>"
    page = re.sub(r'<section class="panel alert">.*?</section>', '<section class="panel alert"><h2>今日高危预警</h2><p><b>红色退潮：</b>A股上涨家数降至1853、炸板增至68，机器人扩散骤降；隔夜SOXX再跌8.25%。风险预算0%-5%，新增、题材和摊低均为0。</p></section>', page, flags=re.S)
    page = page.replace('    <h2>需要重点注意的3只股票</h2>', macro_card + '\n    <h2>需要重点注意的3只股票</h2>', 1)
    for path, text in ((LJ, latest_json), (RJ, review_json), (archive_review, review_json), (LH, page), (archive_html, page)):
        base.atomic_write(path, text)
    print(json.dumps({"latest": str(LH), "archive": str(archive_html), "review_archive": str(archive_review), "generated_at": now.isoformat()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
