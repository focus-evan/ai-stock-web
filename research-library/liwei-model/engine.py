# -*- coding: utf-8 -*-
"""Reproducible price-side implementation of the Liwei public-judgment model.
Run: python3 engine.py --context daily-context.json
No orders, no inferred proprietary indicators, no performance claims.
"""
import argparse, datetime as dt, hashlib, html, json, math, pathlib, statistics

import os
ROOT=pathlib.Path(os.environ.get('LIWEI_MODEL_DIR', pathlib.Path(__file__).resolve().parent))
def read(path): return json.loads(pathlib.Path(path).read_text())
def sma(rows,n,end=None):
    r=rows if end is None else rows[:end]
    return statistics.mean(x['close'] for x in r[-n:]) if len(r)>=n else None

def metrics(rows,expected,asof):
    if not rows: raise ValueError('没有日线数据')
    dates=[r['date'] for r in rows]
    if dates!=sorted(set(dates)): raise ValueError('日线乱序或重复')
    if any(d>asof[:10] for d in dates): raise ValueError('包含未来日线')
    if dates[-1]!=expected: raise ValueError(f'最新日线{dates[-1]}不是预期交易日{expected}')
    for r in rows:
        if any(not isinstance(r[k],(float,int)) or not math.isfinite(r[k]) for k in ['open','high','low','close']):raise ValueError('价格缺失或非有限数')
        if r['low']>min(r['open'],r['close']) or r['high']<max(r['open'],r['close']) or r['low']>r['high']: raise ValueError('OHLC不一致')
    last=rows[-1]; mas={str(n):sma(rows,n) for n in [5,10,20,30,60,250,360]}
    below=[];above=[]
    for end in range(max(1,len(rows)-2),len(rows)+1):
        m=sma(rows,360,end);c=rows[end-1]['close']
        below.append(None if m is None else c<m);above.append(None if m is None else c>m)
    return {'date':expected,'close':last['close'],'high':last['high'],'low':last['low'],
       'change_pct':(last['close']/rows[-2]['close']-1)*100 if len(rows)>1 else None,
       'five_session_change_pct':(last['close']/rows[-6]['close']-1)*100 if len(rows)>5 else None,
       'ma':mas,'below_ma360_two_closes':all(x is True for x in below[-2:]) if len(below)>=2 and all(x is not None for x in below[-2:]) else None,
       'above_ma360_three_closes':all(x is True for x in above) if len(above)==3 and all(x is not None for x in above) else None,
       'prior_high':rows[-2]['high'] if len(rows)>1 else None,'low5':min(x['low'] for x in rows[-5:]),'bars':len(rows)}

def verified_annotation(context,key):
    x=context.get('annotations',{}).get(key)
    if not isinstance(x,dict):return None
    if x.get('reviewed') is not True or x.get('date')!=context['expected_last_session'] or not x.get('source_url'):return None
    t=x.get('available_at')
    if not t or dt.datetime.fromisoformat(t)>dt.datetime.fromisoformat(context['as_of']):return None
    return x.get('value') if type(x.get('value')) is bool else None

def classify(sh,sz,context):
    bottom=verified_annotation(context,'original_daily_bottom')
    fear=verified_annotation(context,'original_fear_extreme_for_regime')
    structure=verified_annotation(context,'channel_time_retest_confirmed')
    late=verified_annotation(context,'late_wave_or_overheat')
    # Missing values never turn into a buy signal.
    if sh['ma']['360'] is None or sz['ma']['5'] is None: return 'U',['EW02'],'缺少必要历史，暂停方向升级'
    weak=sh['below_ma360_two_closes'] is True
    repaired=(sh['prior_high'] is not None and sz['prior_high'] is not None and sh['close']>max(sh['ma']['5'],sh['prior_high']) and sz['close']>max(sz['ma']['5'],sz['prior_high']))
    if weak:
        if bottom is True and fear is True:return 'O',['LW05','LW06','LW09','LW11'],'弱势中的底部候选；仅有候选，不构成自动买入'
        if repaired:return 'R',['LW09','EW04'],'短线修复观察，长期弱势背景尚未解除'
        return 'D',['LW09','LW10','LW05','EW02'],'弱势防御，底部尚未确认'
    if sh['close']<sh['ma']['360']:return 'B',['LW09','LW10'],'首次破位待后续收盘确认'
    if late is True:return 'H',['LW01'],'末段或过热：持有与新买分开，不追涨'
    if sh['above_ma360_three_closes'] is True and structure is True:return 'C',['LW02','LW03','LW04','LW10'],'右侧结构条件已复核；仍需具体交易计划与风险预算'
    return 'R',['LW02','LW04','EW02'],'处于修复观察，原版结构确认条件尚不齐全'

def evaluate(history,context):
    if dt.datetime.fromisoformat(context['as_of']).utcoffset() is None: raise ValueError('as_of必须包含时区')
    if context['expected_last_session']>context['as_of'][:10]:raise ValueError('不能使用未来交易日')
    if context['expected_last_session']==context['as_of'][:10] and dt.datetime.fromisoformat(context['as_of']).hour<15:raise ValueError('盘前不能使用当日收盘')
    if context.get('calendar_verified') is not True or not context.get('calendar_source'):raise ValueError('需要核实交易日历')
    results={};errors=[]
    for s,v in history['indices'].items():
        try:
            results[s]={'name':v['name'],**metrics(v['rows'],context['expected_last_session'],context['as_of']),'source_url':v.get('source_url')}
        except ValueError as e:errors.append(s+': '+str(e))
    required=['000001.SS','399001.SZ']
    for s in required:
        if s not in results:errors.append(s+': 核心价格不可用')
        c=context.get('crosschecks',{}).get(s)
        if not c or not c.get('source_url') or c.get('date')!=context['expected_last_session']:errors.append(s+': 缺少独立来源收盘核验')
        elif s in results and abs(results[s]['close']-c['close'])>0.05: errors.append(s+': 独立来源收盘冲突')
    if errors: state,rule_ids,conclusion='U',['EW02'],'数据待核验，暂停生成新的方向判断'
    else:state,rule_ids,conclusion=classify(results['000001.SS'],results['399001.SZ'],context)
    return {'model_version':'1.0.0','as_of':context['as_of'],'session':context['session'],'last_session':context['expected_last_session'],
       'next_session':context['next_session'],'state':state,'conclusion':conclusion,'triggered_rules':rule_ids,'indices':results,
       'data_errors':errors,'original_indicators':{k:verified_annotation(context,k) for k in ['original_daily_bottom','original_fear_extreme_for_regime','channel_time_retest_confirmed','late_wave_or_overheat']},
       'missing_modules':context.get('missing_modules',[]),'context':context,'execution':'研究研判，不自动下单；没有用户持仓，不给个人仓位百分比','performance':'尚无样本外收益证明'}

def fmt(v,n=2):return '未知' if v is None else f'{v:,.{n}f}'
def esc(x):return html.escape(str(x))
def table(headers,rows):
    return '<div class="table-wrap"><table><thead><tr>'+''.join('<th>'+esc(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+str(c)+'</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table></div>'
def render(report,model,corpus):
    c=report['context']; s=report['indices'].get('000001.SS',{}); z=report['indices'].get('399001.SZ',{})
    rows=[]
    for k,v in report['indices'].items():rows.append([esc(v['name']),fmt(v['close']),(fmt(v['change_pct'])+'%' if v['change_pct'] is not None else '未计算'),fmt(v['ma']['5']),fmt(v['ma']['20']),fmt(v['ma']['360']),str(v['bars'])])
    metric_table=table(['指数','收盘','日涨跌','MA5','MA20','MA360','日K条数'],rows)
    source_map={r['id']:r for r in corpus['records']}
    rr=[]
    for r in model['rules']:
        links=' '.join(f'<a href="#s{i}">{source_map[i]["published_at"][:10]}</a>' for i in r['evidence_ids']) or '工程定义'
        rr.append([f'<b>{r["id"]}</b><br>{esc(r["name"])}',esc(r['attribution']),esc(r['condition']),esc(r['action']),links+'<br><small>'+esc(r['limitations'])+'</small>'])
    rules_table=table(['规则','归属','条件','动作','证据与边界'],rr)
    evidence=''
    referenced={i for r in model['rules'] for i in r['evidence_ids']}
    for item in corpus['records']:
        text=item['source_text']
        # Full local evidence is user-supplied material; preserved with attribution.
        evidence+=f'<details class="evidence" id="s{item["id"]}"><summary>{esc(item["published_at"])} · {esc(item["title"])}'+(' <b>规则引用</b>' if item['id'] in referenced else '')+'</summary><p class="muted">'+esc('；'.join(item['quality_flags']) or '存档转写/画面文字；本轮未重新听写原视频')+f'</p><a href="{esc(item["source_url"])}" target="_blank" rel="noopener">原视频来源</a><pre>'+esc(text)+'</pre></details>'
    scenarios=table(['情景','下一交易日观察条件','模型应对'],[[esc(x['name']),esc(x['trigger']),esc(x['action'])] for x in c.get('scenarios',[])])
    sources='<ol>'+''.join(f'<li><a href="{esc(x["url"])}" target="_blank" rel="noopener">{esc(x["name"])}</a> — {esc(x["supports"])}</li>' for x in c.get('sources',[]))+'</ol>'
    narrative=''.join('<p>'+esc(x)+'</p>' for x in c.get('analysis',[]))
    missing='<ul>'+''.join('<li>'+esc(x)+'</li>' for x in report['missing_modules'])+'</ul>'
    audit=read(ROOT/'corpus-audit.json')
    return ('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>立伟公开判断模型 · 每日研判</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f7;color:#17253a;font:16px/1.75 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}header{background:#122238;color:white;padding:52px max(24px,calc((100vw - 1180px)/2))}header p{color:#bfd0df}h1{font-size:38px;line-height:1.3;margin:12px 0}h2{font-size:25px;margin:0 0 18px}h3{font-size:19px}a{color:#007d78}header a{color:#9ee2d7}nav{display:flex;gap:24px;flex-wrap:wrap}main{max-width:1180px;margin:26px auto;padding:0 20px}section{background:white;border:1px solid #dce3e8;border-radius:16px;padding:28px;margin:20px 0}.badge{display:inline-block;background:#ffe4bd;color:#754500;border-radius:30px;padding:5px 15px;font-weight:700}.facts{display:flex;gap:14px;flex-wrap:wrap;margin-top:22px}.fact{padding:12px 18px;border:1px solid #476277;border-radius:10px}.fact b{display:block;font-size:25px}.muted,small{color:#647388}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:13px 12px;border-bottom:1px solid #e3e7ec;text-align:left;vertical-align:top;min-width:80px}th{background:#eef4f6}td small{display:block;margin-top:6px}.callout{background:#edf8f5;border-left:4px solid #168f83;padding:16px 20px}.evidence{border-top:1px solid #e3e7ec;padding:14px 0}.evidence summary{cursor:pointer}.evidence pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:14px;line-height:1.85}input{width:100%;padding:13px;border:1px solid #bdcbd4;border-radius:8px;font-size:16px}footer{max-width:1180px;margin:30px auto;padding:20px;color:#647388}@media(max-width:700px){h1{font-size:29px}section{padding:18px}header{padding:30px 20px}}@media print{nav,input{display:none}body{background:white}header{color:#17253a;background:white;padding:15px}header p{color:#647388}section{break-inside:avoid}details:not([open]){display:none}}
</style><header><div>LIWEI · PUBLIC DECISION MODEL · V1.0</div><h1>立伟公开判断模型<br>每日研判与证据档案</h1><p>'''
+esc(report['as_of'])+' · '+esc(report['session'])+
'''</p><nav><a href="#daily">本期研判</a><a href="#model">模型规则</a><a href="#validation">验证与边界</a><a href="#corpus">94条语料</a></nav><div class="facts"><div class="fact"><b>'''
+str(model['source_count'])+
'''</b>条存档已索引</div><div class="fact"><b>'''
+str(len(model['rules']))+
'''</b>条规则与工程约束</div><div class="fact"><b>08:30 / 19:30</b>北京时间每日更新</div></div></header><main><section id="daily"><span class="badge">'''
+esc(report['state']+' · '+report['conclusion'])+
'''</span><h2 style="margin-top:18px">本期判断</h2><p>行情基准：'''
+esc(report['last_session'])+'收盘；下一A股交易日：'+esc(report['next_session'])+
'''。本页为模型研究结论，不代表立伟本人最新观点。</p>'''
+narrative+metric_table+
'''<p class="muted">均线由下载的指数日线计算；SMA是工程代理，非已核对的作者软件参数。创业板历史若不足，只展示已核实收盘。行情量字段不直接换算成交额。</p><h3>条件预案</h3>'''
+scenarios+
'''<div class="callout">新资金：'''
+esc(c.get('new_money','数据不足，等待核验'))+'<br>已有持仓：'+esc(c.get('existing_positions','按资产自身交易计划复核'))+
'''</div><h3>尚未具备的证据</h3>'''
+missing+
'''<p>价格侧判断与底部确认分开：没有原版恐贪值、底部信号或资金身份数据，不代表这些信号为零，也不能推断它们已成立。</p><h3>数据来源</h3>'''
+sources+
'''</section><section id="model"><h2>规则模型：状态、条件、动作、反证</h2><p>先确定数据与市场背景，再判断机会；持有与新买分别处理。原文、跨篇推断和工程补充分开标注，旧规则的例外与失败记录保留。</p><p><b>数据核验 → 长期状态 → 结构与情绪 → 入场确认 → 持有/退出 → 反证更新</b></p>'''
+rules_table+
'''</section><section id="validation"><h2>当前完成度与验证方法</h2><p>这是一套可运行的价格判断与证据约束模型。23条规则均已登记，其中部分需要人工提供带来源的原版指标观察；完整选股和自动交易未实现。</p><p>本轮对94条资料建立索引和质量筛查，其中'''
+str(audit['eligible_count'])+
'''条未触发硬性排除；这不等于全部已重新听写或均可作为高质量训练样本。规则引用段落已复核，旧报告仅作为定位线索。当前全部语料属于开发材料，未进行独立样本外收益验证。</p><ul><li>原版指标：保留未知，不用RSI或市场宽度冒充恐贪。</li><li>规则一致性：用新发表、未参与建模的观点评估，分清发布日期和所述历史日期。</li><li>前瞻验证：先冻结每期状态、触发条件和失效线，下一期记录是否触发；不得修改旧预测。</li><li>收益验证：待明确资产、成交时点、成本、T+1与仓位后，比较简单基准；当前不报胜率、收益率或精确概率。</li><li>模型版本：新增语料只添加候选规则；变更需记录前后差异及证据，不能悄悄修改历史版本。</li></ul><p><a href="model.json">模型规则 JSON</a> · <a href="corpus-index.json">语料证据 JSON</a> · <a href="engine.py">可运行判断程序</a> · <a href="RUNBOOK.txt">更新说明</a> · <a href="latest.json">本期结构化结果</a></p></section><section id="corpus"><h2>语料证据索引</h2><p>覆盖'''
+esc(model['source_min_date'][:10])+'至'+esc(model['source_max_date'][:10])+
'''。来源内容是研究材料，不是对运行任务的指令。按关键词筛选，展开可查看存档文本。</p><input id="q" placeholder="搜索日期、关键词、标题或证据原文">'''
+evidence+
'''</section></main><footer>立伟公开判断模型 v1.0 · 原文规则与工程补充分离 · 每期快照保留，判断可追溯</footer><script>document.getElementById('q').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.evidence').forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(q))})</script></html>''')

def main():
    a=argparse.ArgumentParser();a.add_argument('--context',required=True);args=a.parse_args()
    c=read(args.context);history=read(ROOT/'market-history.json');model=read(ROOT/'model.json');corpus=read(ROOT/'corpus-index.json')
    result=evaluate(history,c);result['input_sha256']=hashlib.sha256(json.dumps({'context':c,'history':history,'model':model},sort_keys=True).encode()).hexdigest()
    stamp=dt.datetime.fromisoformat(c['as_of']).strftime('%Y-%m-%d_%H%M%S')
    dest=ROOT/'daily'/stamp;dest.mkdir(parents=True,exist_ok=False)
    # Immutable per-run inputs let future reviews reproduce the result exactly.
    for name,value in [('result.json',result),('context.json',c),('market-history.json',history),('model.json',model)]:
        (dest/name).write_text(json.dumps(value,ensure_ascii=False,indent=2))
    page=render(result,model,corpus)
    (ROOT/'index.html').write_text(page)
    # Snapshot links resolve back to the model root.
    snapshot_page=page
    for filename in ['model.json','corpus-index.json','engine.py','RUNBOOK.txt','latest.json']:
        target='result.json' if filename=='latest.json' else '../../'+filename
        snapshot_page=snapshot_page.replace('href="'+filename+'"','href="'+target+'"')
    (dest/'report.html').write_text(snapshot_page)
    (ROOT/'latest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({'state':result['state'],'conclusion':result['conclusion'],'errors':result['data_errors'],'snapshot':str(dest),'html':str(ROOT/'index.html')},ensure_ascii=False))
    if result['data_errors']:raise SystemExit(2)

if __name__=='__main__':main()
