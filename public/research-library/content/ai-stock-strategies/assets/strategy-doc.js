(() => {
  const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
  const sections = tocLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    }, { rootMargin: '-18% 0px -70% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  const mobileToc = document.querySelector('[data-mobile-toc]');
  if (mobileToc) {
    mobileToc.addEventListener('change', () => {
      const target = document.querySelector(mobileToc.value);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const calculator = document.querySelector('[data-score-calculator]');
  if (!calculator) return;

  const read = (name) => Number(calculator.elements[name]?.value || 0);
  const yes = (name) => calculator.elements[name]?.value === 'yes';

  function calculate() {
    const inNorthbound = yes('in_northbound');
    const holdRatio = read('hold_ratio');
    const mainInflowYi = read('main_inflow');
    const mainInflow = mainInflowYi * 100000000;
    const superPositive = yes('super_positive');
    const largePositive = yes('large_positive');
    const changePct = read('change_pct');
    const amountYi = read('amount');

    let hold = 0;
    if (inNorthbound) {
      hold = holdRatio >= 10 ? 25 : holdRatio >= 5 ? 21 : holdRatio >= 2 ? 17 : holdRatio >= 1 ? 12 : 8;
    }

    let capital = 0;
    if (mainInflow > 0) {
      capital = mainInflow >= 500000000 ? 25 : mainInflow >= 100000000 ? 21 : mainInflow >= 50000000 ? 16 : 8;
    } else if (mainInflow < -100000000) {
      capital = -5;
    }

    const orders = superPositive && largePositive ? 15 : (superPositive || largePositive ? 8 : 0);
    const market = changePct >= 0 && changePct <= 5 ? 10
      : changePct > 5 && changePct < 9.8 ? 8
      : changePct >= -2 && changePct < 0 ? 7
      : changePct < -2 ? 3 : 2;
    const contrarian = changePct < 0 && mainInflow > 100000000 ? 10 : 0;
    const liquidity = amountYi >= 10 ? 10 : amountYi >= 5 ? 7 : 3;
    const resonance = inNorthbound && mainInflow > 0 ? 5 : 0;
    const total = Math.max(0, Math.min(100, hold + capital + orders + market + contrarian + liquidity + resonance));
    const eligible = inNorthbound || mainInflow >= 50000000;
    const level = total >= 80 ? '强烈推荐' : total >= 60 ? '推荐' : total >= 40 ? '关注' : '回避';

    calculator.querySelector('[data-total]').textContent = String(total);
    calculator.querySelector('[data-level]').textContent = eligible ? level : '候选池过滤';
    calculator.querySelector('[data-eligibility]').textContent = eligible
      ? '通过硬过滤；仍需再过 LLM 与统一风控护栏。'
      : '非季度持仓股且主力净流入不足 0.5 亿，不进入排序。';

    const breakdown = calculator.querySelector('[data-breakdown]');
    breakdown.replaceChildren();
    [
      ['季度持仓', hold], ['主力代理', capital], ['大单一致', orders],
      ['市场表现', market], ['逆势承接', contrarian], ['活跃度', liquidity], ['共振', resonance],
    ].forEach(([label, value]) => {
      const item = document.createElement('span');
      item.textContent = `${label} ${value >= 0 ? '+' : ''}${value}`;
      breakdown.appendChild(item);
    });
  }

  calculator.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });
  calculator.addEventListener('input', calculate);
  calculate();
})();
