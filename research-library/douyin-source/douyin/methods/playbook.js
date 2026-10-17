const state={data:null,category:'全部',query:''};
const byId=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>String(value??'').toLowerCase().replace(/\s+/g,'');

function methodCard(method){
  const searchable=normalize([method.name,method.plain,method.category,method.best_for,...method.signals,...method.steps,method.exit,method.misuse].join(' '));
  const hidden=state.category!=='全部'&&method.category!==state.category||state.query&&!searchable.includes(normalize(state.query));
  return `<details class="method-card" id="${escapeHtml(method.id)}" data-category="${escapeHtml(method.category)}" ${hidden?'hidden':''}>
    <summary class="method-summary"><span class="method-icon">${escapeHtml(method.icon)}</span><span class="method-title"><small>${escapeHtml(method.number)} · ${escapeHtml(method.category)}</small><h3>${escapeHtml(method.name)}</h3><p>${escapeHtml(method.plain)}</p></span><span class="method-toggle" aria-hidden="true">＋</span></summary>
    <div class="method-body"><h4>适用场景</h4><p>${escapeHtml(method.best_for)}</p><h4>判断信号</h4><ul>${method.signals.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul><h4>操作步骤</h4><ol>${method.steps.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ol><div class="exit"><b>退出 / 失效：</b>${escapeHtml(method.exit)}</div><div class="misuse"><b>最常见误用：</b>${escapeHtml(method.misuse)}</div><div class="source-links">${method.sources.map(source=>`<a href="${escapeHtml(source.href)}">原视频：${escapeHtml(source.title)} ↗</a>`).join('')}</div></div>
  </details>`;
}

function renderMethods(){
  const methods=state.data.methods;
  byId('method-grid').innerHTML=methods.map(methodCard).join('');
  const shown=[...byId('method-grid').children].filter(card=>!card.hidden).length;
  byId('method-count').textContent=`显示 ${shown} / ${methods.length} 种方法`;
  byId('empty-state').hidden=shown>0;
}

function renderFilters(){
  const values=['全部',...state.data.categories];
  byId('method-filters').innerHTML=values.map(value=>`<button type="button" data-category="${escapeHtml(value)}" aria-pressed="${value===state.category}">${escapeHtml(value)}</button>`).join('');
  byId('method-filters').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;state.category=button.dataset.category;renderFilters();renderMethods();});
}

const recommendations={
  shrink:{title:'先降低对大票趋势的预期',items:['检查量能决定打法','只在看得懂的题材里轻仓试错','没有明确周期和主线时，空仓也是动作'],ids:['liquidity-regime','emotion-cycle']},
  flat:{title:'震荡环境先等市场给出强弱答案',items:['检查主线六个信号','候选池先分散试错','用竞价和承接去弱留强'],ids:['mainline-six-signals','keep-strong']},
  expand:{title:'放量后仍要确认板块和中军',items:['板块指数是否同步带量','容量中军是否参与','次日是否仍有溢价'],ids:['liquidity-regime','mainline-six-signals']}
};
const cycles={
  ebb:{line:'退潮期的第一动作是停止新开仓。',items:['高标和中位股是否继续负反馈','已有仓位先处理风险','不要把反抽当新周期'],ids:['emotion-cycle','error-correction'],stop:true},
  pressure:{line:'高度压制期只观察节点，不急着确认新周期。',items:['寻找首板阶段的新题材','单笔只用可承受的小试错仓','等待节点龙带出联动'],ids:['emotion-cycle','position-ladder']},
  trial:{line:'试错期可以小仓证明判断。',items:['优先做主线验证','前一天充分换手后看次日弱转强','不符合预期立即撤回试错'],ids:['auction-weak-strong','position-ladder']},
  rise:{line:'主升阶段重在核心与持仓纪律。',items:['确认龙头、梯队、中军仍完整','去弱留强，不追后排','逻辑未坏时减少无意义做T'],ids:['keep-strong','leader-discipline']},
  split:{line:'高潮分歧先看承接，不预设一定回流。',items:['核心分歧是否被承接','中位和补涨是否先掉队','仓位从进攻切回可纠错状态'],ids:['first-mover','error-correction']}
};
const positions={cash:'空仓或轻仓：保留选择权，只在条件成立时试错。',light:'已有试错仓：次日符合预期才加仓，不符合就处理。',heavy:'仓位偏重：先恢复纠错能力，避免再用补仓掩盖错误。',trapped:'持仓被套：先判断逻辑是否失效；“扶老太太”只是高风险的降成本方法，不是必选项。'};

function runDecision(event){
  event.preventDefault();const volume=recommendations[byId('volume').value],cycle=cycles[byId('cycle').value],position=positions[byId('position').value];
  const ids=[...new Set([...volume.ids,...cycle.ids,...(byId('position').value==='trapped'?['stair-exit']:[])])];
  const links=ids.map(id=>state.data.methods.find(method=>method.id===id)).filter(Boolean).map(method=>`<a href="#${escapeHtml(method.id)}">${escapeHtml(method.name)}</a>`).join('');
  byId('decision-output').innerHTML=`<p class="output-label">框架输出</p><h3>${escapeHtml(volume.title)}</h3><p class="${cycle.stop?'stop':''}">${escapeHtml(cycle.line)}</p><ul>${[...volume.items,...cycle.items].map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul><p><b>仓位处理：</b>${escapeHtml(position)}</p><div class="next-links">${links}</div>`;
}

function setupChecklist(){
  const key='ye-ren-playbook-checklist-v1',inputs=[...document.querySelectorAll('#checklist-items input')],saved=JSON.parse(localStorage.getItem(key)||'[]');
  inputs.forEach((input,index)=>{input.checked=Boolean(saved[index]);input.addEventListener('change',()=>localStorage.setItem(key,JSON.stringify(inputs.map(item=>item.checked))));});
  byId('reset-checklist').addEventListener('click',()=>{inputs.forEach(input=>input.checked=false);localStorage.removeItem(key);});
}

let currentQuote=null;
const round=(value,digits=2)=>Number(value).toFixed(digits);
const priceValue=(value,scale)=>typeof value==='number'&&value>0?value/scale:null;
const secidFor=code=>/^(?:5|6|9)/.test(code)?`1.${code}`:`0.${code}`;
const formatQuoteTime=seconds=>seconds?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(seconds*1000)):'未知';

async function fetchQuote(){
  const button=byId('fetch-quote'),code=byId('stock-code').value.trim();
  if(!/^\d{6}$/.test(code)){showRescueError('请输入6位A股代码。');return;}
  button.classList.add('loading');button.textContent='读取中…';
  try{
    const fields='f43,f44,f45,f46,f47,f48,f51,f52,f57,f58,f59,f60,f71,f86,f116,f117,f162,f168,f169,f170';
    const url=`https://push2.eastmoney.com/api/qt/stock/get?secid=${encodeURIComponent(secidFor(code))}&fields=${fields}`;
    const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`行情接口 HTTP ${response.status}`);
    const payload=await response.json(),data=payload?.data;if(!data||!data.f58)throw new Error('没有找到该股票，请检查代码。');
    const scale=10**(Number(data.f59)||2);
    currentQuote={code:String(data.f57),name:String(data.f58),current:priceValue(data.f43,scale),high:priceValue(data.f44,scale),low:priceValue(data.f45,scale),open:priceValue(data.f46,scale),limitUp:priceValue(data.f51,scale),limitDown:priceValue(data.f52,scale),previous:priceValue(data.f60,scale),average:priceValue(data.f71,scale),volume:Number(data.f47)||0,amount:Number(data.f48)||0,turnover:(Number(data.f168)||0)/100,change:(Number(data.f170)||0)/100,timestamp:Number(data.f86)||0,source:url};
    if(!currentQuote.current||!currentQuote.previous)throw new Error('行情价格不完整。');
    renderQuote(currentQuote);byId('cninfo-link').href=`https://www.cninfo.com.cn/new/fulltextSearch?keyWord=${encodeURIComponent(code)}`;
    if(/(?:\*?ST|退市)/i.test(currentQuote.name))showRescueError(`${currentQuote.name} 含交易风险标识，风险门不通过，不生成低位接回计划。`);
    else byId('rescue-result').innerHTML=`<div class="result-placeholder"><span>行情已读取</span><h3>填写持仓并确认四道风险门</h3><p>提交后系统会计算今日是否有足够日内空间、建议操作数量、条件价差和预计成本变化。</p></div>`;
  }catch(error){currentQuote=null;showRescueError(`行情读取失败：${error.message}`);}
  finally{button.classList.remove('loading');button.textContent='读取最新行情';}
}

function renderQuote(quote){
  byId('quote-name').textContent=quote.name;byId('quote-code').textContent=quote.code;byId('quote-current').textContent=round(quote.current);byId('quote-change').textContent=`${quote.change>=0?'+':''}${round(quote.change)}%`;
  byId('quote-change').className=quote.change>=0?'positive':'negative';byId('quote-open').textContent=round(quote.open);byId('quote-average').textContent=`均价 ${round(quote.average||quote.open)}`;byId('quote-high').textContent=round(quote.high);byId('quote-low').textContent=`最低 ${round(quote.low)}`;byId('quote-time').textContent=`行情时间 ${formatQuoteTime(quote.timestamp)} ｜ 换手 ${round(quote.turnover)}% ｜ 数据源：东方财富公开行情`;
}

function showRescueError(message){
  byId('rescue-result').innerHTML=`<p class="result-kicker">无法生成计划</p><div class="verdict red"><b>先停止操作</b><span>${escapeHtml(message)}</span></div><p>请修正输入或完成风险核验后再试。</p>`;
}

function tradingTiming(timestamp){
  const now=new Date(),zone='Asia/Shanghai',dateFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}),quoteDate=dateFormat.format(new Date(timestamp*1000)),today=dateFormat.format(now);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  const minutes=Number(parts.hour)*60+Number(parts.minute),weekend=parts.weekday==='Sat'||parts.weekday==='Sun';
  if(quoteDate!==today)return {live:false,label:'最近交易日行情',reason:'行情不是今天的盘中报价，不能据此生成今天的成交操作。请在下一交易日开盘后重新读取。'};
  if(weekend)return {live:false,label:'休市中',reason:'今天是休市日，不能执行股票交易。请在下一交易日盘中重新读取行情。'};
  if(minutes<570)return {live:false,label:'今日未开盘',reason:'市场尚未开盘，昨收后的价格条件不能直接用于今天成交。请在 09:30 后重新读取行情。'};
  if(minutes>=690&&minutes<780)return {live:false,label:'午间停盘',reason:'当前处于午间停盘，下午开盘后请重新读取一次行情，再决定是否执行。'};
  if(minutes>=900)return {live:false,label:'今日已收盘',reason:'今天的交易已经结束，不能再执行先卖后接。下一交易日盘中请重新读取行情，系统会按当时价格重算。'};
  return {live:true,label:'盘中实时行情',reason:''};
}

function buildRescuePlan(event){
  event.preventDefault();
  if(!currentQuote){showRescueError('请先读取股票最新行情。');return;}
  const cost=Number(byId('cost-price').value),total=Math.floor(Number(byId('total-shares').value)),sellable=Math.floor(Number(byId('sellable-shares').value)),ratio=Number(byId('tranche-ratio').value),spread=Number(byId('target-spread').value),feeRate=Number(byId('fee-rate').value),cycle=byId('rescue-cycle').value,gates=[...document.querySelectorAll('.risk-gates .gate')],unchecked=gates.filter(gate=>!gate.checked).length;
  if(!(cost>0&&total>=100&&sellable>=0&&spread>0&&feeRate>=0)){showRescueError('请完整填写成本价、持仓和执行参数。');return;}
  if(unchecked){showRescueError(`还有 ${unchecked} 道风险门未确认。风险门不通过时，不生成接回计划。`);return;}
  if(/(?:\*?ST|退市)/i.test(currentQuote.name)){showRescueError('股票名称带交易风险标识，不适合套用短线解套计算。');return;}
  const q=currentQuote,timing=tradingTiming(q.timestamp),lossPct=(q.current/cost-1)*100,rangePct=(q.high-q.low)/q.previous*100,position=(q.high-q.low)>0?(q.current-q.low)/(q.high-q.low):.5,requiredSpace=spread+feeRate+.25,available=Math.min(total,sellable),rawQty=Math.floor(total*ratio/100/100)*100,qty=available>=100?Math.min(available,Math.max(100,rawQty)):0,oneWayDown=q.current<=q.low*1.006&&q.current<q.open&&q.change<-.8,nearLimitDown=q.limitDown&&q.current<=q.limitDown*1.012,cycleBlocked=cycle==='ebb',alreadyProfitable=lossPct>=0;
  const reference=Math.min(q.high,Math.max(q.current,q.open||q.current,q.average||q.current)),sellLow=reference*.998,sellHigh=Math.min(q.high,reference*1.003),rawBuy=reference*(1-spread/100),buyPrice=Math.max(q.low*1.002,rawBuy),actualSpread=(reference-buyPrice)/reference*100,gross=(reference-buyPrice)*qty,fees=(reference+buyPrice)*qty*feeRate/100,net=gross-fees,newCost=total?Math.max(0,(cost*total-net)/total):cost;
  let level='green',label='今天可做条件计划',reason='行情具备一定日内空间，且当前价格不在全天最低区域。';
  if(!timing.live){level='gray';label=timing.label;reason=timing.reason;}
  else if(alreadyProfitable){level='gray';label='不属于解套场景';reason='最新价已经不低于持仓成本，当前应使用止盈或持仓纪律，而不是解套策略。';}
  else if(!qty){level='red';label='今天不能执行';reason='今日可卖数量不足100股，无法形成同数量接回的标准计划。';}
  else if(cycleBlocked){level='red';label='今天不做低位接回';reason='你选择的是退潮 / 亏钱扩散阶段。按作者框架应先收回流动性，停止新接力和补仓。';}
  else if(nearLimitDown||oneWayDown){level='red';label='今天不适合先卖后接';reason='股价接近全天低点并呈单边弱势，卖出后低位接回的空间和承接都不可靠。';}
  else if(rangePct<requiredSpace){level='red';label='今天价差空间不足';reason=`今日振幅约 ${round(rangePct)}%，低于目标价差、交易成本和安全垫合计 ${round(requiredSpace)}%。强做容易只贡献手续费。`;}
  else if(position<.42){level='orange';label='等待反弹，不在低位先卖';reason='当前价格处于今日波动区间下部。若没有反弹到参考卖出区，今天保持不动。';}
  else if(position<.65){level='orange';label='条件执行：先等卖点';reason='日内空间存在，但当前位置居中。只在反弹进入参考卖出区后执行第一步。';}
  else if(actualSpread<spread*.8){level='orange';label='条件执行：价差偏紧';reason='按不跌破今日低点的约束，实际可利用价差小于目标值，只能等待更高卖价。';}
  renderRescueResult({q,cost,total,sellable,qty,lossPct,rangePct,position,spread,feeRate,reference,sellLow,sellHigh,buyPrice,net,newCost,level,label,reason,freshness:timing.label,cycle});
}

function renderRescueResult(plan){
  const canTrade=plan.level==='green'||plan.level==='orange',positionText=plan.position>=.65?'区间上部':plan.position>=.42?'区间中部':'区间下部';
  const actions=canTrade?[
    [`第一步：等待卖出条件`,`只有价格进入 ${round(plan.sellLow)}—${round(plan.sellHigh)} 元，且不是放量直线拉升时，卖出 ${plan.qty} 股。没有到价，今天不操作。`],
    [`第二步：成交后等价差`,`实际卖出成交后，以约 ${round(plan.buyPrice)} 元作为接回参考。目标价差 ${round(plan.spread)}%，不追着价格向上改价。`],
    [`第三步：接回必须有承接`,`价格回落到参考位且没有有效跌破今日低点 ${round(plan.q.low)} 元，市场阶段未恶化，才接回同样 ${plan.qty} 股。若跌破今日低点，取消接回，重新评估。`],
    [`第四步：没跌下来怎么办`,`卖出后若股价直接走强，不追买；接受仓位减少，下一交易日重新判断。老太太策略的目标是解套，不是保证每次都接回。`]
  ]:[
    [`今天的第一动作`,`不执行先卖后接，也不因为亏损扩大而补仓。`],
    [`先处理原因`,`核对风险门、市场退潮、单边下跌或价差不足的具体原因。`],
    [`重新评估`,`等出现有效修复、日内空间和承接后，再重新生成计划。`]
  ];
  const metrics=canTrade?`<div class="plan-metrics"><div><span>本次操作</span><b>${plan.qty} 股</b></div><div><span>参考卖出区</span><b>${round(plan.sellLow)}—${round(plan.sellHigh)}</b></div><div><span>参考接回价</span><b>${round(plan.buyPrice)}</b></div><div><span>预计净价差</span><b>${round(plan.net)} 元</b></div><div><span>预计成本变化</span><b>${round(plan.cost)} → ${round(plan.newCost)}</b></div><div><span>不接回失效线</span><b>跌破 ${round(plan.q.low)}</b></div></div>`:'';
  byId('rescue-result').innerHTML=`<p class="result-kicker">${escapeHtml(plan.freshness)} · 今日结论</p><div class="verdict ${plan.level}"><b>${escapeHtml(plan.label)}</b><span>${escapeHtml(plan.reason)}</span></div><div class="quote-facts"><div><span>相对成本</span><b>${round(plan.lossPct)}%</b></div><div><span>今日振幅</span><b>${round(plan.rangePct)}%</b></div><div><span>当前所处位置</span><b>${positionText}</b></div></div>${metrics}<div class="action-sheet">${actions.map(([title,text])=>`<div class="action-row"><div><b>${escapeHtml(title)}</b><p>${escapeHtml(text)}</p></div></div>`).join('')}</div><div class="cancel-box"><b>立即取消计划：</b>出现重大公告、交易警示、跌停附近单边下杀、板块进入退潮，或你输入的可卖数量不准确。</div><p class="data-source">行情：东方财富公开行情接口，时间 ${escapeHtml(formatQuoteTime(plan.q.timestamp))}。计算采用你填写的双边综合成本率；实际成本以券商成交回报为准。</p>`;
}

async function start(){
  try{const response=await fetch('methods.json',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);state.data=await response.json();renderFilters();renderMethods();byId('method-search').addEventListener('input',event=>{state.query=event.target.value;renderMethods();});byId('decision-form').addEventListener('submit',runDecision);byId('fetch-quote').addEventListener('click',fetchQuote);byId('rescue-form').addEventListener('submit',buildRescuePlan);setupChecklist();byId('decision-form').requestSubmit();}
  catch(error){byId('method-count').textContent='方法数据加载失败';byId('method-grid').innerHTML=`<p class="empty-state">${escapeHtml(error.message)}</p>`;}
}
start();
