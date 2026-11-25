from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import generate_holdings_20261125 as prev

base, raw = prev.base, prev.raw
B = Path(r"D:\Evan\html\automation-2-holdings")
A, LJ, LH, RJ = B / "archive", B / "latest.json", B / "latest.html", B / "review_latest.json"
MJ = B / "market_tencent_20261126.json"
MP = Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md")
TZ = timezone(timedelta(hours=8))
base.MARKET_JSON = MJ

U = {
"300502":("逆势涨0.72%至181.30，连续守180；订单、1.6T放量与全球扩产逻辑未变。","冲188.56后未站稳185，组合集中度最高；隔夜NVDA再跌3.86%，外部CPO映射仍弱。","逆势守180 + 外部科技续弱","中性","红色系统门控下相对强势观察；看180/176/165，失176继续减风险；185前不加仓。"),
"688008":("5亿元回购与Q3经营订单逻辑未变。","跌5.08%至126.40，失133/130/127.4；减持窗口、A股科技踩踏与港股科技-2.56%叠加。","失127.4 + 科技踩踏","利空","红色高位踩踏风险；看126.2/125/123，失125继续减风险。"),
"688017":("Q3经营证据与机器人长期产业逻辑未变。","跌5.33%至241.40，失250/245；机器人后排大面积跌停，现金流弱与高估值风险重新主导交易层。","失245 + 机器人退潮扩散","利空","红色高位踩踏风险；看241/230/222，失230继续减风险。"),
"688012":("重复订单、薄膜设备出货和4亿至5亿元回购方案提供中期支撑。","跌7.46%至239.90，失258/250/245；科创综指-5.93%，隔夜NVDA再跌3.86%，外部与本地半导体共振转弱。","失245 + 半导体共振下跌","利空","红色防守；看239/236/230，失236继续减风险；禁止因回购逆势加仓。"),
"002837":("工商变更完成，注册资本由9.7744亿元增至12.7960亿元，系既有章程/股本登记落地，不构成新增融资利多或利空。","跌5.65%至30.70并失32；利润、毛利率和存货风险未改善，算力与机器人退潮。","工商登记中性 + 失32","利空","红色高位踩踏风险；看30.6/30/28，失30继续减风险。"),
"03750.HK":("A股回购注销与产业协同提供长期支撑。","暴跌12.23%至295.60，失331/325.4/320，盘中低292.2；Q3不及预期和现金流下降在风险偏好恶化时被放大。","失320 + 单日-12.23%","利空","红色极端防守；看292.2/280/270，反抽300/320只处理风险，禁止摊低。"),
"09988.HK":("H股低见80.95后收81.20，隔夜ADR逆市涨1.70%至86.26；AI云+53%与收入略超LSEG证据未变。","H股再跌1.22%、失82，恒生科技跌2.56%；EPS不及FactSet和FCF流出压力仍在。","守80.95但失82 + ADR相对强","中性偏利空","红色组合门控下相对强观察；看80.95/79.5/78，失79.5继续减风险。"),
"002409":("半导体材料长期逻辑未变。","跌9.92%至71.68，失78.8/75/72；Q3不及预期、科创踩踏和海外半导体弱势共振。","失72 + 单日-9.92%","利空","红色高位踩踏风险；看71.67/68/65，失68继续减风险。"),
"688300":("未来3个月不提前赎回联瑞转债，短期强赎倒计时解除；长期粉体项目期权未变。","跌5.96%至69.23，失72.8/70；转股稀释、历史转债卖出及项目融资压力仍在。","不强赎缓冲 + 失70","利空","红色防守；看69/67.9/66.1，失67.9继续减风险。"),
"001270":("商业航天与机器人长期映射未变。","跌7.08%至65.53，失70/66并收日低；Q3利润下滑、减值、可交换债与机器人退潮叠加。","失66 + 机器人退潮","利空","红色高位踩踏风险；看65.4/63.22/60，失63.22继续减风险。")}

REVIEW={c:("完全有效","红色纪律与关键位失守约束有效","维持或强化红色防守") for c in U}
REVIEW["03750.HK"]=("低估风险需上调","单日-12.23%、直接跌破320至295.60","下调交易时机和风险预算，新增292.2/280压力测试")

RADAR={"date":"2026-11-26","window":"06:00盘前","warning":"红色","warning_points":10,"triggers":["11月25日A股约586股上涨、4926股下跌；上证-2.03%、创业板-4.19%、科创综指-5.93%，跌停约49。","机器人与高位科技后排大面积跌停，成交缩至约1.39万亿元，流动性承接明显不足。","恒生科技-2.56%；隔夜QQQ-0.65%、SOXX-0.52%、NVDA-3.86%，外部科技仅有弱缓冲。"],"opening_scenario":"科技链可能延续低开与反抽兑现，医药/消费避险分流；所有科技反抽只用于降低风险。","state":"S7 退潮确认（极端宽度恶化）","radar_score":6.5,"MSS":12,"MBS":2,"FRS":2,"TES":8,"ET":5,"position_ceiling":"组合风险预算0%-5%，新增仓位、题材交易和摊低均为0。","allowed":"只处理风险、保留现金；极高确定性相对强品种只观察不加。","blocked":"禁止抄底半导体/CPO/机器人，禁止抢跌停反抽，禁止因公司公告逆总阀门开仓。","focus":"09:45观察跌停数、上涨家数及新易盛180/176、宁德292.2、中微236、雅克68。","downgrade":"已处S7；若跌停继续扩散或新易盛失176，继续压缩风险。升级至少需一整日宽度、核心科技与海外半导体共同修复。","v231_link":"经营分不因市场踩踏改写，但交易时机、相对强弱和组合暴露折扣全面下调；宁德交易风险校准上调。"}

def main():
 p=json.loads(LJ.read_text(encoding="utf-8-sig"));m=base.fetch_market();raw.fetch_raw_montage(m)
 for c,rows in m["quotes"].items():
  m["quotes"][c]=[x for x in rows if x["date"]<="2026-11-25"];assert m["quotes"][c][-1]["date"]=="2026-11-25",c
 base.atomic_write(MJ,json.dumps(m,ensure_ascii=False,indent=2));hs=[];items=[]
 for old in p["holdings"]:
  i={k:v for k,v in old.items() if k not in {"day_high","day_low","session_note"}};bull,bear,lev,jdg,act=U[i["code"]]
  i.update(bull=bull,bear=bear,message_level=lev,judgement=jdg,action=act,risk_level="红色",risk_note="S7极端宽度恶化与组合科技同变量暴露触发红色门控；基本面与交易层分开。")
  rows=m["quotes"][i["code"]];cs=[x["close"] for x in rows];x=rows[-1];i.update(last_trade_date=x["date"],last_close=x["close"],one_day_pct=base.pct(cs[-2],cs[-1]),three_day_pct=base.pct(cs[-4],cs[-1]),five_day_pct=base.pct(cs[-6],cs[-1]),turnover_volume=int(x["volume"]),day_high=x["high"],day_low=x["low"]);hs.append(i)
  v,t,a=REVIEW[i["code"]];items.append({"name":i["name"],"code":i["code"],"morning_risk":old["risk_level"],"morning_judgement":old["judgement"],"morning_close":old["last_close"],"review_price_date":"2026-11-25","review_close":x["close"],"review_move_pct":base.pct(old["last_close"],x["close"]),"verification":v,"trigger_check":t,"logic_adjustment":a})
 now=datetime.now(TZ).replace(microsecond=0);rv={"generated_at":now.isoformat(),"review_window":"使用2026-11-25完整A/H收盘验证上一版06:00判断；隔夜美股用于11月26日新预警。","summary":{"reviewed_count":10,"exact_effective":9,"useful_but_conservative":0,"repair_upgrade":0,"underestimated_risk":1,"effective_or_useful":9,"needs_calibration":1,"main_read":"红色门控有效；九只关键位纪律完全有效。宁德时代-H单日跌12.23%并直接失320，风险幅度低估，需要上调压力测试。"},"items":items,"logic_corrections":["4926股下跌与科创综指-5.93%确认S7极端退潮。","宁德跌破320后新增292.2/280压力位，业绩分不因价格下跌改写。","工商注册资本变更仅作行政登记，不误判为新融资或基本面催化。"]}
 st=now.strftime("%Y%m%d_%H%M%S");ah=A/f"automation_2_holdings_{st}.html";ar=A/f"automation_2_holdings_review_{st}.json"
 src=["行情：腾讯/GTIMG日K，使用2026-11-25完整A/H收盘。","A股：上证-2.03%、深证-3.24%、创业板-4.19%、科创综指-5.93%；约586涨/4926跌、成交约1.39万亿元、涨停约58、跌停约49；https://www.dabanke.com/index-20261125.html","港股：恒指-1.14%、恒生科技-2.56%；https://qt.gtimg.cn/q=r_hkHSI,r_hkHSTECH","美股：SPY-0.28%、QQQ-0.65%、SOXX-0.52%、NVDA-3.86%、BABA ADR+1.70%，IEF+0.45%、UUP-0.10%；https://finance.yahoo.com/quote/SOXX/","英维克完成工商变更：注册资本由9.7744亿元变更为12.7960亿元，为既有章程/股本登记落地，不构成新增融资；https://pdf.dfcfw.com/pdf/H2_AN202611251832034221_1.pdf","联瑞三个月不强赎与转股风险沿用前一日已核验口径；其余持仓截至06:00未见改变经营事实的重大新增公告。","财报预期差沿用正式披露：阿里符合预期（收入超、EPS不及）；其余沿用既有半年报/三季报口径，价格下跌不等于业绩不及预期。"]
 rep={"generated_at":now.isoformat(),"window":"截至北京时间2026-11-26 06:00；使用11月25日A/H完整收盘、盘后公告与隔夜美股收盘。","risk_level":"红色","gate":"总阀门：红色，S7退潮确认。A股约4926股下跌、科创综指跌5.93%，宁德时代-H跌12.23%。组合风险预算0%-5%，新增仓位、题材交易和摊低均为0。","top_attention":[{"name":"宁德时代-H","reason":"单日-12.23%并失320，风险幅度低估；新增292.2/280压力测试，禁止摊低。"},{"name":"中微公司","reason":"跌7.46%失245，强基本面未能抵消科创与半导体共振踩踏，回购不构成逆势加仓权。"},{"name":"新易盛","reason":"逆势守180但集中度最高、未站稳185；外部NVDA续跌，失176即继续减风险。"}],"holdings":hs,"sources_or_notes":src,"memory_path":str(MP),"accuracy_review":rv,"macro_radar":RADAR}
 js=json.dumps(rep,ensure_ascii=False,indent=2);rjs=json.dumps(rv,ensure_ascii=False,indent=2);page=base.render(rep).replace("2026-09-25","2026-11-26",1)
 li="".join(f"<li>{x}</li>" for x in RADAR["triggers"]);mac='<section class="panel alert"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill red">红色</span> <b>S7 退潮确认（极端宽度恶化）</b> · RadarScore 6.5 · ET 5</p>'+f"<ul>{li}</ul><p><b>仓位上限：</b>{RADAR['position_ceiling']}</p></section>"
 page=re.sub(r'<section class="panel alert">.*?</section>','<section class="panel alert"><h2>今日高危预警</h2><p><b>红色极端退潮：</b>A股约4926股下跌、科创综指跌5.93%，科技/机器人踩踏扩散。风险预算0%-5%，新增、题材和摊低均为0。</p></section>',page,flags=re.S);page=page.replace('    <h2>需要重点注意的3只股票</h2>',mac+'\n    <h2>需要重点注意的3只股票</h2>',1)
 for path,text in ((LJ,js),(RJ,rjs),(ar,rjs),(LH,page),(ah,page)):base.atomic_write(path,text)
 print(json.dumps({"latest":str(LH),"archive":str(ah),"review_archive":str(ar),"generated_at":now.isoformat()},ensure_ascii=False))

if __name__=="__main__":main()
