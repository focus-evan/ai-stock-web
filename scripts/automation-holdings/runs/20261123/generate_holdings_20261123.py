from __future__ import annotations
import json,re
from datetime import datetime,timedelta,timezone
from pathlib import Path
import generate_holdings_20261120 as prev
import generate_holdings_20261023 as raw
base=prev.base; B=Path(r"D:\Evan\html\automation-2-holdings"); A=B/'archive'; LJ=B/'latest.json'; LH=B/'latest.html'; RJ=B/'review_latest.json'; MJ=B/'market_tencent_20261123.json'; MP=Path(r"C:\Users\Evan\.codex\automations\automation-6\memory.md"); TZ=timezone(timedelta(hours=8)); base.MARKET_JSON=MJ
U={
"300502":("经营公告确认订单充足、无砍单，1.6T放量和全球扩产逻辑未变。","11月20日收165、守住165但高170.96回落；周五SOXX-10.54%、NVDA-13.80%，外部AI硬风险压倒公司利多。","守165 + 外部AI黑天鹅","利空","红色高位踩踏风险；看158/155/150，失155继续减风险；外盘未稳定前不加仓。"),
"688008":("5亿元回购完成、Q3经营与订单逻辑未变。","跌6.68%至128.41，失135/130；减持窗口与全球半导体暴跌叠加。","失130 + SOXX -10.54%","利空","红色高位踩踏风险；看127.4/125/120，失125继续减风险。"),
"688017":("Q3超预期经营证据未变。","跌6.10%至230.80，失245/238；现金流弱、高估值、机器人退潮和外部风险叠加。","失238 + 高估值踩踏","利空","红色高位踩踏风险；看230/220/210，失220继续减风险。"),
"688012":("逆势涨1.95%至261.50，连续守250；重复订单、出货与回购逻辑继续支撑。","全球半导体暴跌形成硬覆盖，盘中高262.83后未突破，组合同变量风险过高。","相对强势 + 外部硬覆盖","中性","红色系统门控下相对强势观察；看250/245/238，禁止逆势加仓。"),
"002837":("液冷与算力长期需求未变。","跌7.45%至32.04，失34.3/33.5；利润、毛利率和高存货风险未改善，外部AI暴跌。","失33.5 + 经营弱 + 外部暴跌","利空","红色高位踩踏风险；看32/30/28，失30继续减风险。"),
"03750.HK":("A股回购注销与产业协同提供长期支撑。","跌4.23%至335并失343.6/340；Q3不及预期、现金流下降，恒生科技-3.78%。","失340 + 港科指-3.78%","利空","红色防守；看331/320/300，失320继续减风险。"),
"09988.HK":("业绩后H股涨3.48%至83.35，显著强于恒生科技；AI云+53%、收入略超LSEG。","非GAAP EPS低于FactSet、FCF流出扩大，中国电商-5%；周五ADR又跌2.66%至81.08。","业绩后相对强 + ADR再跌","中性","红色相对强度观察；看80.95/78/75，失78继续减风险；不追业绩反弹。"),
"002409":("半导体材料长期逻辑未变。","跌8.91%至75.28并失82/78.8/76；Q3不及预期与全球半导体踩踏叠加。","失全部支撑 + SOXX -10.54%","利空","红色高位踩踏风险；看75/72/68，失72继续减风险。"),
"688300":("半导体粉体项目长期期权未变。","跌7.68%至67.89，失72.8/70/68；转债赎回预期、项目融资与外部半导体踩踏叠加。","失68 + 转债筹码 + 外部暴跌","利空","红色高位踩踏风险；看67.9/65/63.05，失65继续减风险。"),
"001270":("商业航天与机器人长期映射未变。","跌7.46%至65.42，失70/66；Q3利润下滑、减值和可交换债压力未消。","失66 + 经营/筹码弱","利空","红色高位踩踏风险；看65.4/63/60，失63继续减风险。")}
REV={c:("完全有效","关键位与红色纪律有效","维持防守") for c in U}; REV["09988.HK"]=("方向偏保守但操作有效","H股业绩后+3.48%、强于港科指","红色不追与事件纪律仍有效")
RAD={"date":"2026-11-23","window":"06:00盘前（周一）","warning":"红色","warning_points":14,"triggers":["11月20日A股仅约282股上涨、5083股下跌，成交约1.42万亿元；涨停28、跌停65，昨日涨停平均-3.40%。","恒指-1.89%、恒生科技-3.78%；科技持仓继续破位。","美股周五SPY-3.50%、QQQ-5.38%、SOXX-10.54%、NVDA-13.80%，触发外部黑天鹅与同变量反转硬覆盖。"],"opening_scenario":"科技链可能大幅低开或流动性踩踏，任何高开反抽只用于降风险。","state":"S0 绝对防守","radar_score":3.5,"MSS":10,"MBS":0,"FRS":0,"TES":2,"ET":0,"position_ceiling":"组合风险预算0%-5%，新增仓位、题材交易和摊低均为0。","allowed":"只处理风险，保留现金和极高确定性观察。","blocked":"禁止抄底AI/半导体/CPO/机器人，禁止抢低开反弹。","focus":"09:45观察跌停、上涨家数及新易盛155、中微250、阿里80.95。","downgrade":"已处S0；外盘和本地宽度未连续修复前不升级。","v231_link":"经营分不因价格崩跌改写，但交易时机、相对强弱和组合暴露全部从严。"}
def main():
 p=json.loads(LJ.read_text(encoding='utf-8-sig'));m=base.fetch_market();raw.fetch_raw_montage(m)
 for c,r in m['quotes'].items():m['quotes'][c]=[x for x in r if x['date']<='2026-11-20']
 base.atomic_write(MJ,json.dumps(m,ensure_ascii=False,indent=2));hs=[];items=[]
 for o in p['holdings']:
  i={k:v for k,v in o.items() if k not in {'day_high','day_low','session_note'}}; bull,bear,lev,jdg,act=U[i['code']];i.update(bull=bull,bear=bear,message_level=lev,judgement=jdg,action=act,risk_level='红色',risk_note='S0硬风险覆盖；基本面与交易层分开。');r=m['quotes'][i['code']];cs=[x['close'] for x in r];x=r[-1];i.update(last_trade_date=x['date'],last_close=x['close'],one_day_pct=base.pct(cs[-2],cs[-1]),three_day_pct=base.pct(cs[-4],cs[-1]),five_day_pct=base.pct(cs[-6],cs[-1]),turnover_volume=int(x['volume']),day_high=x['high'],day_low=x['low']);hs.append(i);v,t,a=REV[i['code']];items.append({'name':i['name'],'code':i['code'],'morning_risk':o['risk_level'],'morning_judgement':o['judgement'],'morning_close':o['last_close'],'review_price_date':'2026-11-20','review_close':x['close'],'review_move_pct':base.pct(o['last_close'],x['close']),'verification':v,'trigger_check':t,'logic_adjustment':a})
 rv={'generated_at':datetime.now(TZ).replace(microsecond=0).isoformat(),'review_window':'使用2026-11-20完整A/H收盘验证上一版06:00判断；周五美股用于周一新预警。','summary':{'reviewed_count':10,'exact_effective':9,'useful_but_conservative':1,'repair_upgrade':0,'underestimated_risk':0,'effective_or_useful':10,'needs_calibration':1,'main_read':'红色S7纪律继续有效；阿里业绩后相对强但操作约束仍有效。'},'items':items,'logic_corrections':['A股5083股下跌与海外科技暴跌触发S0。','阿里业绩与价格分开评估。','风险预算降至0%-5%。']}
 now=datetime.now(TZ).replace(microsecond=0);st=now.strftime('%Y%m%d_%H%M%S');ah=A/f'automation_2_holdings_{st}.html';ar=A/f'automation_2_holdings_review_{st}.json';src=['行情：腾讯/GTIMG日K，使用11月20日完整A/H收盘。','A股：282涨/5083跌，成交1.42万亿元，涨停28、跌停65。','港股：恒指-1.89%、恒生科技-3.78%。','美股：SPY-3.50%、QQQ-5.38%、SOXX-10.54%、NVDA-13.80%、BABA ADR-2.66%。','周末未见改变持仓经营事实的重大新增公告；澜起股东会资料和英维克接待日公告不改变判断。','财报预期差沿用：阿里符合预期（收入超、EPS不及），其余按既有口径。','主要链接：https://agu-app.com/daily/2026-11-20']
 rep={'generated_at':now.isoformat(),'window':'截至北京时间2026-11-23 06:00；使用11月20日A/H收盘、周末公告与美股周五收盘。','risk_level':'红色','gate':'总阀门：红色组合约束、宏观S0绝对防守。A股5083股下跌，周五QQQ跌5.38%、SOXX跌10.54%、NVDA跌13.80%。组合风险预算0%-5%，新增仓位、题材交易和摊低均为0。','top_attention':[{'name':'新易盛','reason':'外部NVDA/SOXX暴跌直接映射，155为关键风险位。'},{'name':'中微公司','reason':'A股逆势强，但外部半导体黑天鹅覆盖，禁止逆势加仓。'},{'name':'阿里巴巴-W','reason':'业绩后H股相对强但ADR周五续跌，80.95/78为风险位。'}],'holdings':hs,'sources_or_notes':src,'memory_path':str(MP),'accuracy_review':rv,'macro_radar':RAD}
 js=json.dumps(rep,ensure_ascii=False,indent=2);rjs=json.dumps(rv,ensure_ascii=False,indent=2);page=base.render(rep).replace('2026-09-25','2026-11-23',1);li=''.join(f'<li>{x}</li>' for x in RAD['triggers']);mac=f'<section class="panel alert"><h2>宏观环境与A股情绪雷达</h2><p><span class="pill red">红色</span> <b>S0 绝对防守</b> · RadarScore 3.5</p><ul>{li}</ul><p><b>仓位上限：</b>{RAD["position_ceiling"]}</p></section>';page=re.sub(r'<section class="panel alert">.*?</section>','<section class="panel alert"><h2>今日高危预警</h2><p><b>S0绝对防守：</b>A股5083股下跌，海外SOXX跌10.54%、NVDA跌13.80%。风险预算0%-5%，只处理风险。</p></section>',page,flags=re.S);page=page.replace('    <h2>需要重点注意的3只股票</h2>',mac+'\n    <h2>需要重点注意的3只股票</h2>',1)
 for path,text in ((LJ,js),(RJ,rjs),(ar,rjs),(LH,page),(ah,page)):base.atomic_write(path,text)
 print(json.dumps({'latest':str(LH),'archive':str(ah),'review_archive':str(ar),'generated_at':now.isoformat()},ensure_ascii=False))
if __name__=='__main__':main()
