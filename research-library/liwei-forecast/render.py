"""Static, source-linked dashboard: forecast first, methodology one click away."""
import datetime as dt
import html
import json
from market import TZ

def esc(value): return html.escape(str(value),quote=True)
def pct(value): return '—' if value is None else f'{value*100:.1f}%'
def point(value): return '—' if value is None else f'{value:,.2f}'
LABELS={'up':'收涨','flat':'平收','down':'收跌','abstain':'观望'}
CONF={'low':'低','medium':'中','high':'高'}

def badge(label):
    return f'<span class="direction {label}">{LABELS[label]}</span>'

def render_page(data,calendar,now):
    contract,stats,status=data['contract'],data['stats'],data['status']
    history=sorted(data['history'],key=lambda r:r['forecast']['target_date'])
    upcoming=[r for r in history if r['forecast']['target_date']>calendar.last_completed(now)]
    latest=upcoming[-1] if upcoming else None
    reviews=[r for r in history if r['evaluation']]
    last_review=reviews[-1] if reviews else None
    checks=[]
    for offset in range(15):
        day=now.date()+dt.timedelta(days=offset)
        if calendar.is_open(day):
            for t in (dt.time(15,50),dt.time(19,50),dt.time(20,50)):
                stamp=dt.datetime.combine(day,t,TZ)
                if stamp>now:checks.append(stamp)
        if checks:break
    next_check=checks[0].isoformat() if checks else ''
    if latest:
        f=latest['forecast']
        forecast_title=f'{f["target_date"]} · 下一交易日预判'
        forecast_head=esc(f['headline'])
        forecast_rows=''.join(f'<div class="prediction"><div><b>{esc(name)}</b><small>置信度自评：{CONF[f["predictions"][s]["confidence"]]}</small></div>{badge(f["predictions"][s]["direction"])}</div>' for s,name in contract['symbols'].items())
        forecast_detail=f'<p class="tiny">冻结于 {esc(f["created_at"])} · 行情截至 {f["base_date"]}收盘</p><a class="button secondary" href="#day-{f["target_date"]}">查看依据与反证条件 →</a>'
    else:
        forecast_title='等待下一版正式预判'
        forecast_head='收盘后给出一个主判断，下一交易日验证。'
        forecast_rows='<p class="empty">首版计划：<b>2026-10-27 19:50</b><br>预测目标：<b>2026-10-28</b><br>首次结果核验：<b>10月28日收盘后</b></p>' if not history else '<p class="empty">上一版已到核验窗口。今日19:50生成下一交易日预判，20:50补跑。</p>'
        forecast_detail='<p class="tiny">尚未生成时不填方向；行情不足时明确显示缺口。</p>'
    if last_review:
        f,r=last_review['forecast'],last_review['evaluation']
        outcome_title=f'{f["target_date"]} · 最新核验'
        outcome_head='沪深两项均正确' if r['eligible'] and r['joint_correct'] else '未全部判断正确' if r['eligible'] else esc(r['exclusion_reason'])
        outcome_rows=''.join(f'<div class="prediction"><div><b>{esc(v["name"])}</b><small>原判断 {LABELS[v["predicted"]]} → 实际 {LABELS[v["actual"]]}</small></div><strong>{v["change_pct"]:+.2f}%</strong></div>' for v in r['indices'].values())
        outcome_detail=f'<p class="tiny">核验于 {esc(r["evaluated_at"])} · 两来源OHLC核对一致</p>'
    else:
        outcome_title='上一版结果核验'
        outcome_head='尚无到期、可评分的正式预测'
        outcome_rows='<p class="empty">目标日收盘后拉取真实日线，逐项对照原判断。<br>数据尚未齐备时保留“待验证”，不提前计分。</p>'
        outcome_detail='<p class="tiny">旧方法报告和历史状态不补算成预测样本。</p>'
    errors=status.get('review_errors',[])+status.get('errors',[])
    alerts=''
    if errors:alerts='<div class="notice warning"><b>有数据待核验：</b>'+esc('；'.join(errors))+'</div>'
    ci='暂无可评分样本' if stats['wilson_95'] is None else '95% Wilson区间：'+pct(stats['wilson_95'][0])+'～'+pct(stats['wilson_95'][1])
    index_cards=''
    matrices=''
    for symbol,name in contract['symbols'].items():
        v=stats['per_index'][symbol]
        index_cards+=f'<article class="small-card"><h3>{esc(name)}</h3><b class="number small">{pct(v["accuracy"])}</b><p>{v["correct"]} 次正确 / {v["count"]} 次明确方向</p></article>'
        rows=''.join('<tr><th>'+LABELS[a]+'</th>'+''.join('<td>'+str(v['confusion'][a][b])+'</td>' for b in ('up','flat','down'))+'</tr>' for a in ('up','flat','down'))
        failures='、'.join(k+' '+str(n)+' 次' for k,n in v['failure_types'].items()) or '暂无已判错样本'
        confidence='；'.join(CONF[k]+'：'+str(x['correct'])+'/'+str(x['count']) for k,x in v['confidence'].items())
        matrices+=f'<div class="small-card"><h3>{esc(name)} · 错在什么方向</h3><p class="tiny">行是预测，列是实际。分母只含及时发布且已核验的明确方向。</p><table><thead><tr><th>预测／实际</th><th>收涨</th><th>平收</th><th>收跌</th></tr></thead><tbody>{rows}</tbody></table><p>{esc(failures)}</p><p class="tiny">置信度自评分组（正确/样本）：{esc(confidence)}</p></div>'
    table_rows,details='', ''
    for row in reversed(history):
        f,r=row['forecast'],row['evaluation'];date=f['target_date']
        label='待验证' if not r else '正确' if r['eligible'] and r['joint_correct'] else '未全部正确' if r['eligible'] else '不计主分：'+r['exclusion_reason']
        predictions=' / '.join(LABELS[f['predictions'][s]['direction']] for s in contract['symbols'])
        actual='待收盘数据' if not r else ' / '.join(f'{r["indices"][s]["change_pct"]:+.2f}%' for s in contract['symbols'])
        table_rows+=f'<tr data-date="{date}"><td><a href="#day-{date}">{date}</a></td><td>{esc(predictions)}</td><td>{esc(actual)}</td><td>{esc(label)}</td></tr>'
        parts=''
        for symbol,name in contract['symbols'].items():
            p=f['predictions'][symbol]
            facts=''.join('<li>'+esc(x)+'</li>' for x in p['observed_facts'])
            assumptions='；'.join(p.get('assumptions',[])) or '未另列假设'
            verification=''
            if r:
                o=r['indices'][symbol]
                links=' · '.join(f'<a href="{esc(x["url"])}">{esc(x["provider"])}</a>' for x in o['sources'])
                verification=f'<p class="verification"><b>实际：</b>{o["base_close"]:.2f} → {o["ohlc"]["close"]:.2f}，{o["change_pct"]:+.2f}%，归类为{LABELS[o["actual"]]}。{esc(o["failure_type"] or ("该项正确" if o["correct"] else "观望不评分"))}<br>{links}</p>'
            parts+=f'<div class="small-card"><h3>{esc(name)} {badge(p["direction"])}</h3><p>{esc(p["reason"])}</p><b>冻结时的事实</b><ul>{facts}</ul><p><b>假设：</b>{esc(assumptions)}</p><p><b>反证条件：</b>{esc(p["invalidation"])}</p><p class="tiny">规则 {esc("、".join(p["rule_ids"]))} · 置信度自评{CONF[p["confidence"]]}</p>{verification}</div>'
        details+=f'<details id="day-{date}" data-history-detail><summary>{date} · {esc(f["headline"])} <span>{esc(label)}</span></summary><div class="details-inner"><p>基准日 {f["base_date"]} · 冻结时间 {esc(f["created_at"])} · 版本 {esc(f["contract"]["version"])}</p><div class="two">{parts}</div><p><b>共同风险：</b>{esc("；".join(f["shared_risks"]))}</p><p><b>未取得的数据：</b>{esc("；".join(f["missing_inputs"]))}</p><p class="tiny">反证触发只用于解释，不撤销原方向或豁免计分。</p><p><a href="daily/{date}/forecast.json">原始预判</a> · <a href="daily/{date}/inputs.json">冻结输入</a>'+ (f' · <a href="daily/{date}/evaluation.json">核验记录</a>' if r else '')+'</p></div></details>'
    if not table_rows:table_rows='<tr><td colspan="4" class="empty">正式样本从首版预判开始累计。当前没有可展示的历史胜率。</td></tr>'
    facts=''
    for symbol,f in data['latest_features'].items():
        facts+=f'<tr><td>{esc(f["name"])}</td><td>{f["date"]}</td><td>{point(f["close"])}</td><td>{f["change_pct"]:+.2f}%</td><td>{point(f["ma"]["5"])}</td><td>{point(f["ma"]["360"])}</td></tr>'
    if not facts:facts='<tr><td colspan="6">等待完整且一致的日线数据</td></tr>'
    baseline_names={'always_up_correct':'每天都判断收涨','persistence_correct':'延续基准日方向'}
    baseline_rows=''.join(f'<tr><td>{name}</td><td>{stats["baseline_correct"][key]} / {stats["count"]}</td><td>{pct(stats["baseline_accuracy"][key])}</td></tr>' for key,name in baseline_names.items())
    return f'''<!doctype html><html lang="zh-CN" data-liwei-forecast-dashboard><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>立伟每日预判与验证｜下一交易日判断、真实行情复核与正确率</title><meta name="description" content="依据立伟公开语料框架，每个交易日冻结沪深次日收盘方向，下一交易日拉取双来源数据核验，并统计整体正确率、观望覆盖率与简单基准。"><style>
:root{{--ink:#14263c;--muted:#60738a;--line:#dce6ef;--paper:#f3f7fb;--teal:#007b78;--blue:#1662ca}}*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}}a{{color:var(--blue);text-underline-offset:4px}}main{{max-width:1300px;margin:auto;padding:26px}}header{{padding:30px 34px;background:linear-gradient(120deg,#0d1f36,#17445b);border-radius:16px;color:#fff}}header p{{margin:8px 0;color:#c5d9e9;max-width:950px}}h1{{font-size:34px;line-height:1.3;margin:6px 0 12px}}h2{{font-size:23px;line-height:1.45;margin:8px 0 16px}}h3{{font-size:17px;line-height:1.5;margin:0 0 10px}}.eyebrow{{color:#60d9d0;font-size:12px;letter-spacing:1.5px}}.topnav{{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}}.topnav a{{font-size:14px;text-decoration:none}}.two{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}.card,.section,.small-card{{background:#fff;border:1px solid var(--line);border-radius:13px;padding:24px}}.card.featured{{border-top:4px solid var(--teal)}}.card.review{{border-top:4px solid #618bb8}}.card .kicker{{font-size:13px;color:var(--teal);font-weight:700}}.prediction{{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--line)}}.prediction small{{display:block;color:var(--muted);font-size:12px}}.direction{{display:inline-block;padding:4px 13px;border-radius:6px;font-size:15px;font-weight:700;white-space:nowrap}}.direction.up{{color:#a32f2f;background:#fff0ee}}.direction.down{{color:#087348;background:#e9f6ef}}.direction.flat{{color:#536b82;background:#edf2f8}}.direction.abstain{{color:#805800;background:#fff4d9}}.empty{{color:var(--muted);line-height:2;font-size:15px}}.tiny{{font-size:12px;color:var(--muted)}}.button{{display:inline-block;border:1px solid #c9d9e6;border-radius:7px;padding:7px 12px;text-decoration:none;font-size:13px}}.stats{{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:14px;margin:20px 0}}.number{{display:block;font-size:38px;line-height:1.2;margin:10px 0;font-weight:700;letter-spacing:-1.5px}}.number.small{{font-size:29px}}.stat-main{{background:#0e3048;color:#fff}}.stat-main .tiny{{color:#bcd2e3}}.stat-main h3{{color:#fff}}.section{{margin:20px 0}}.small-card{{padding:20px}}.small-card p{{font-size:14px;margin:10px 0}}.notice{{border-left:4px solid var(--teal);background:#e9f5f4;padding:12px 16px;margin:16px 0;border-radius:0 7px 7px 0;font-size:14px}}.warning{{border-color:#bb8131;background:#fff5e2;color:#755020}}.table-wrap{{overflow:auto}}table{{width:100%;border-collapse:collapse;font-size:14px}}th,td{{padding:12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}}th{{font-size:12px;color:var(--muted);background:#f6f9fc}}details{{border:1px solid var(--line);border-radius:10px;margin:13px 0;background:#fff}}summary{{cursor:pointer;padding:17px;font-weight:600}}summary span{{font-weight:400;font-size:12px;color:var(--muted);margin-left:8px}}.details-inner{{padding:0 20px 20px}}.verification{{padding:12px;background:#eef5fb;border-radius:7px}}.section p.lead{{color:var(--muted);font-size:14px}}.schedule{{display:flex;gap:12px;flex-wrap:wrap}}.schedule span{{padding:9px 14px;background:#f0f6fa;border-radius:7px;font-size:13px}}input{{border:1px solid #bdcddd;border-radius:7px;padding:10px 13px;font:inherit;width:100%;margin-bottom:14px}}footer{{font-size:12px;color:var(--muted);padding:15px 0 35px}}html{{scroll-behavior:smooth;scroll-padding-top:75px}}a:focus-visible,input:focus-visible,summary:focus-visible{{outline:3px solid #209eae;outline-offset:4px}}@media(max-width:900px){{.stats{{grid-template-columns:1fr 1fr}}.two{{grid-template-columns:1fr}}}}@media(max-width:560px){{main{{padding:14px}}header{{padding:24px 20px}}h1{{font-size:28px}}.card,.section{{padding:19px 16px}}.stats{{gap:10px}}.stats .small-card{{padding:16px}}.number{{font-size:30px}}.table-wrap table{{min-width:600px}}.details-inner{{padding:0 12px 16px}}.topnav{{gap:12px}}}}
</style></head><body><main><header><div class="eyebrow">LIWEI · FORECAST → VERIFY → MEASURE</div><h1>立伟 · 每日预判与验证</h1><p>每天先给下一交易日一个主判断，收盘后用真实行情检验，再看累计表现。依据公开语料重建框架，属于AI研究预判。</p></header><nav class="topnav"><a href="#today">最新判断</a><a href="#statistics">累计正确率</a><a href="#history">逐日记录</a><a href="methodology.html">模型依据与原文证据 ↗</a><a href="http://121.196.147.222:3667/research-library/content/douyin/liwei-model/index.html">既有立伟日更报告 ↗</a></nav>{alerts}
<div class="two" id="today"><section class="card featured"><div class="kicker">{forecast_title}</div><h2>{forecast_head}</h2>{forecast_rows}{forecast_detail}</section><section class="card review"><div class="kicker">{outcome_title}</div><h2>{outcome_head}</h2>{outcome_rows}{outcome_detail}</section></div>
<div class="stats" id="statistics"><article class="small-card stat-main"><h3>整体方向正确率</h3><b class="number">{pct(stats['accuracy'])}</b><p>{stats['correct']} 天正确 / {stats['count']} 天可评分</p><p class="tiny">沪深两项都对才算当天正确<br>{ci}</p></article><article class="small-card"><h3>明确方向覆盖率</h3><b class="number">{pct(stats['coverage'])}</b><p>{stats['explicit_direction_days']} / {stats['expected_completed_days']} 个已到期目标交易日</p><p class="tiny">观望 {stats['abstention_days']} 天；缺失或迟到 {len(stats['missing_or_late_days'])} 天</p></article>{index_cards}</div>
<div class="notice"><b>{esc(stats['sample_note'])}。</b>方向按次日收盘涨跌划分：超过 +0.3% 为收涨，低于 −0.3% 为收跌，区间内为平收。平收不代表盘中没有波动；观望不当命中。</div>
<section class="section"><h2>与简单判断比较，避免只看一个百分比</h2><p class="lead">基准使用完全相同的已评分日期，同样要求沪深两项都对。正确率衡量方向判断，不代表交易收益。</p><div class="table-wrap"><table><thead><tr><th>方法</th><th>正确 / 同期样本</th><th>正确率</th></tr></thead><tbody><tr><td>立伟框架AI预判</td><td>{stats['correct']} / {stats['count']}</td><td>{pct(stats['accuracy'])}</td></tr>{baseline_rows}</tbody></table></div><p class="tiny">最近20个已评分日：{stats['last20']['correct']} / {stats['last20']['count']}。评分口径与模型版本单独记录，不跨版本混算。</p><details><summary>查看方向混淆与失误分布</summary><div class="details-inner"><div class="two">{matrices}</div></div></details></section>
<section class="section" id="history"><h2>逐日预判与实际结果</h2><p class="lead">每个目标交易日只保留一版正式预判。点击日期查看当时依据、反证条件与真实收盘；旧判断不会被新判断覆盖。</p><label for="date-filter" class="tiny">按目标日期查找</label><input id="date-filter" type="search" placeholder="例如：2026-10-28"><div class="table-wrap"><table><thead><tr><th>目标交易日</th><th>原判断：上证 / 深成指</th><th>实际涨跌：上证 / 深成指</th><th>结果</th></tr></thead><tbody id="history-rows">{table_rows}</tbody></table></div>{details}</section>
<section class="section"><h2>当前数据与执行安排</h2><div class="schedule"><span>15:50 · 验证到期预测</span><span>19:50 · 形成下一交易日预判</span><span>20:50 · 幂等补跑</span></div><p class="lead">北京时间，交易日执行正式生成；休市日不增加预测样本。本机 Codex 需运行且联网。原版恐贪、底部信号及席位真实属性缺失时，明确列为未知。</p><div class="table-wrap"><table><thead><tr><th>指数</th><th>完整行情日</th><th>收盘</th><th>当日涨跌</th><th>SMA5</th><th>SMA360</th></tr></thead><tbody>{facts}</tbody></table></div><p class="tiny">均线仅为可复算工程参照。价格核验来源：腾讯／新浪，必要时使用Yahoo独立补验；来源冲突时保留待验证。</p><p class="tiny" id="freshness" data-next-check="{esc(next_check)}">页面更新：{esc(data['generated_at'])}；最近行情检查：{esc(status.get('last_check_at','尚未完成'))}</p><details><summary>查看统计规则和可下载记录</summary><div class="details-inner"><ul>{''.join('<li>'+esc(x)+'</li>' for x in contract['rules'])}</ul><p>版本：{esc(contract['version'])}。±0.3%是本次预先约定的评分口径，不是作者原版参数。公开发布时间必须早于目标日09:15，迟到的记录保留但不进入正式正确率。</p><p><a href="forecast-latest.json">最新结果JSON</a> · <a href="forecast-history.json">完整历史JSON</a> · <a href="forecast-statistics.json">统计JSON</a> · <a href="contract.json">评分契约</a> · <a href="rubric.json">研判依据</a> · <a href="{esc(calendar.spec['source_url'])}">交易所休市日历</a></p></div></details></section><footer>归档：方法与创作 · 立伟公开决策模型的前瞻验证。新预测从2026-10-27开始；以前的语料分析、条件预案和事后复述均不补计为新实验的预测成绩。</footer></main><script>
document.getElementById('date-filter').addEventListener('input',e=>{{const q=e.target.value.trim();document.querySelectorAll('[data-date]').forEach(x=>x.hidden=!x.dataset.date.includes(q));document.querySelectorAll('[data-history-detail]').forEach(x=>x.hidden=!x.id.includes(q));}});document.querySelectorAll('a[href^="#day-"]').forEach(a=>a.addEventListener('click',()=>{{const d=document.querySelector(a.hash);if(d)d.open=true;}}));const f=document.getElementById('freshness');if(f.dataset.nextCheck&&Date.now()>Date.parse(f.dataset.nextCheck)+90*60000){{f.className='notice warning';f.textContent+='。已超过下一检查时段，请核对自动任务、本机在线状态和数据源。';}}
</script></body></html>'''
