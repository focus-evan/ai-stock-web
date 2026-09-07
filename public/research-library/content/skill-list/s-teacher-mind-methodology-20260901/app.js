(() => {
  const progress = document.querySelector('.progress');
  const backTop = document.querySelector('.back-top');

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.width = `${Math.min(100, ratio * 100)}%`;
    if (backTop) backTop.classList.toggle('show', window.scrollY > 520);
  };

  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav a').forEach((link) => {
    const href = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
    if (href === current) link.classList.add('active');
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
