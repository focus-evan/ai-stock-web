(() => {
  const key = document.body.dataset.strategy;
  const catalog = window.STRATEGY_CATALOG || {};
  const strategy = catalog[key];
  if (!strategy) {
    document.body.innerHTML = '<main class="shell"><section class="section"><h1>未找到战法文档</h1><p><a href="../index.html">返回战法总览</a></p></section></main>';
    return;
  }

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const list = (items) => `<ul class="compact-list">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
  const rows = (items, fields) => items.map((item) => `<tr>${fields.map((field) => `<td>${esc(item[field])}</td>`).join('')}</tr>`).join('');
  const order = window.STRATEGY_CATALOG_ORDER || Object.keys(catalog);
  const index = order.indexOf(key);
  const previous = index > 0 ? order[index - 1] : null;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;
  const snapshot = strategy.snapshot || '4bd29b6';
  const fullSnapshot = strategy.fullSnapshot || '4bd29b6e390fa4f5f2cf6b06535f33b4acd639f1';
  const reviewedAt = strategy.reviewedAt || '2026-08-29';
  const hasUpdates = Array.isArray(strategy.updates) && strategy.updates.length > 0;

  document.title = `${strategy.title}｜AI Stock 战法手册`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = `${strategy.title}详细说明：原理、数据、评分、信号、执行、风控、局限与优化建议。`;

  document.body.innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="../index.html"><span class="brand-mark">S</span><span>AI Stock · 战法手册</span></a>
        <nav class="topnav" aria-label="主导航">
          <a href="../../index.html">HTML 总入口</a>
          <a href="../index.html">战法总览</a>
          <a href="index.html" aria-current="page">${esc(strategy.title)}</a>
        </nav>
      </div>
    </header>

    <section class="hero">
      <div class="hero-inner">
        <div class="eyebrow">${esc(strategy.english)}</div>
        <h1>${esc(strategy.title)}<br>详细战法说明</h1>
        <p class="hero-lead">${esc(strategy.summary)}</p>
        <div class="hero-meta">
          <span class="hero-chip">${esc(strategy.category)}</span>
          <span class="hero-chip">${esc(strategy.version)}</span>
          <span class="hero-chip">源码快照 ${esc(snapshot)}</span>
          <span class="hero-chip">${esc(reviewedAt)}</span>
        </div>
      </div>
    </section>

    <main class="shell">
      <div class="mobile-toc">
        <select data-mobile-toc aria-label="跳转到章节">
          <option value="#positioning">01 定位与边界</option>
          ${hasUpdates ? '<option value="#updates">01A 本轮优化</option>' : ''}
          <option value="#data">02 数据与流程</option>
          <option value="#scoring">03 评分与等级</option>
          <option value="#gates">04 硬闸门</option>
          <option value="#execution">05 执行与风控</option>
          <option value="#limitations">06 已知局限</option>
          <option value="#optimizations">07 优化路线</option>
          <option value="#implementation">08 代码审计</option>
        </select>
      </div>

      <div class="doc-layout">
        <aside class="toc" aria-label="目录">
          <div class="toc-title">Contents</div>
          <a href="#positioning">01 · 定位与边界</a>
          ${hasUpdates ? '<a href="#updates">01A · 本轮优化</a>' : ''}
          <a href="#data">02 · 数据与流程</a>
          <a href="#scoring">03 · 评分与等级</a>
          <a href="#gates">04 · 硬闸门</a>
          <a href="#execution">05 · 执行与风控</a>
          <a href="#limitations">06 · 已知局限</a>
          <a href="#optimizations">07 · 优化路线</a>
          <a href="#implementation">08 · 代码审计</a>
        </aside>

        <article class="content">
          <section class="section" id="positioning">
            <div class="section-kicker">01 · Positioning</div>
            <h2>它解决什么问题</h2>
            <p class="lead">${esc(strategy.conclusion)}</p>
            <div class="metrics">
              ${strategy.metrics.map((metric) => `
                <div class="metric">
                  <div class="metric-label">${esc(metric.label)}</div>
                  <div class="metric-value">${esc(metric.value)}</div>
                  <div class="metric-note">${esc(metric.note)}</div>
                </div>`).join('')}
            </div>
            <h3>适用与禁用边界</h3>
            ${list(strategy.positioning)}
            <div class="verdict warn"><div class="verdict-body"><strong>阅读口径</strong>这里记录的是当前真实代码路径与基线参数。运行中的自进化版本可以在边界内小步调整止损、止盈、买点缓冲、最低赔率和质量门，因此实盘应同时查看 evolution_version。</div></div>
          </section>

          ${hasUpdates ? `
          <section class="section" id="updates">
            <div class="section-kicker">01A · Version update</div>
            <h2>${esc(reviewedAt)} 本轮优化落地</h2>
            <p class="lead">本节只记录已经进入当前运行代码的变化；仍未完成的事项继续保留在后面的优化路线中。</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>优化项</th><th>优化前</th><th>当前实现</th><th>实盘影响</th></tr></thead>
                <tbody>${rows(strategy.updates, ['title', 'before', 'now', 'impact'])}</tbody>
              </table>
            </div>
          </section>` : ''}

          <section class="section" id="data">
            <div class="section-kicker">02 · Data and pipeline</div>
            <h2>数据从哪里来，如何形成候选</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>数据层</th><th>当前用途</th><th>边界</th></tr></thead>
                <tbody>${rows(strategy.data, ['name', 'content', 'boundary'])}</tbody>
              </table>
            </div>
            <div class="flow">
              ${strategy.pipeline.map((step, i) => `<div class="flow-step"><div class="flow-num">STEP ${String(i + 1).padStart(2, '0')}</div><strong>${esc(step.split('，')[0])}</strong><span>${esc(step)}</span></div>`).join('')}
            </div>
          </section>

          <section class="section" id="scoring">
            <div class="section-kicker">03 · Scoring and levels</div>
            <h2>评分、信号与推荐等级</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>维度</th><th>代码规则</th><th>交易含义</th></tr></thead>
                <tbody>${rows(strategy.scoring, ['part', 'rule', 'effect'])}</tbody>
              </table>
            </div>
            <h3>等级不是分数的简单别名</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th>等级/状态</th><th>成立条件</th><th>执行动作</th></tr></thead>
                <tbody>${rows(strategy.levels, ['level', 'rule', 'action'])}</tbody>
              </table>
            </div>
          </section>

          <section class="section" id="gates">
            <div class="section-kicker">04 · Hard gates</div>
            <h2>不可被 LLM 绕过的硬闸门</h2>
            ${list(strategy.gates)}
            <div class="verdict risk"><div class="verdict-body"><strong>自动交易底线</strong>推荐只是 setup。数据时间不明、价格缺失、盘口不可成交、风险门禁止或赔率不足时，都不能把解释性文字升级成真实成交。</div></div>
          </section>

          <section class="section" id="execution">
            <div class="section-kicker">05 · Execution and risk</div>
            <h2>买入、持有与卖出 SOP</h2>
            <div class="cards">
              <div class="mini-card"><div class="tag good">买入</div><h3>只在条件成立时</h3>${list(strategy.execution.buy)}</div>
              <div class="mini-card"><div class="tag info">持有</div><h3>持续检查失效条件</h3>${list(strategy.execution.hold)}</div>
              <div class="mini-card"><div class="tag risk">卖出</div><h3>先处理风险，再谈目标</h3>${list(strategy.execution.sell)}</div>
            </div>
          </section>

          <section class="section" id="limitations">
            <div class="section-kicker">06 · Known limitations</div>
            <h2>当前实现还不够好的地方</h2>
            ${list(strategy.limitations)}
          </section>

          <section class="section" id="optimizations">
            <div class="section-kicker">07 · Optimization roadmap</div>
            <h2>按优先级推进的优化建议</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>优先级</th><th>优化项</th><th>当前问题</th><th>建议改造</th><th>验收标准</th></tr></thead>
                <tbody>${rows(strategy.optimizations, ['priority', 'title', 'problem', 'action', 'acceptance'])}</tbody>
              </table>
            </div>
            <div class="verdict"><div class="verdict-body"><strong>推荐顺序</strong>先完成 P0 的数据真实性、时间一致性、评分单一口径和真实成交验证，再做 P1 的因子增强；没有 point-in-time 回测和成交模型前，不建议仅靠调高分数权重优化。</div></div>
          </section>

          <section class="section" id="implementation">
            <div class="section-kicker">08 · Implementation audit</div>
            <h2>源码入口与审计边界</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>代码文件</th><th>职责</th></tr></thead>
                <tbody>${rows(strategy.code, ['file', 'role'])}</tbody>
              </table>
            </div>
            <p class="small muted">文档依据源码提交 <span class="mono">${esc(fullSnapshot)}</span> 编制。源文件注释、旧架构文档与运行代码冲突时，以实际被调度器注册和调用的路径为准。</p>
            <div class="actions">
              ${previous ? `<a class="btn secondary" href="../${previous}/index.html">← ${esc(catalog[previous].title)}</a>` : '<a class="btn secondary" href="../northbound/index.html">← 北向资金</a>'}
              <a class="btn secondary" href="../index.html">返回战法总览</a>
              ${next ? `<a class="btn" href="../${next}/index.html">${esc(catalog[next].title)} →</a>` : ''}
            </div>
          </section>
        </article>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-inner"><span>AI Stock 战法手册 · ${esc(strategy.title)}</span><span>源码快照 ${esc(snapshot)} · ${esc(reviewedAt)}</span></div>
    </footer>`;
})();
