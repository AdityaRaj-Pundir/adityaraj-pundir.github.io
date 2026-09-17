(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector('#motion-toggle');
  const scene = document.querySelector('.landscape');
  const hero = document.querySelector('.hero');
  const progress = document.querySelector('.progress');
  let motion = !reduced.matches;
  let queued = false;
  function applyMotion() {
    document.body.classList.toggle('motion-off', !motion);
    document.body.classList.toggle('js-motion', motion);
    button.setAttribute('aria-pressed', String(!motion));
    button.innerHTML = `Motion: ${motion ? 'on' : 'off'} <span>◉</span>`;
    if (!motion) scene.style.transform = '';
    document.dispatchEvent(new CustomEvent('portfolio-motion', {detail: {enabled:motion}}));
    update();
  }
  function update() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
    if (motion && scrollY < hero.offsetHeight) {
      scene.style.transform = `translateY(${scrollY * .13}px) `;
    }
    queued = false;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  }, {threshold: .08});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  button.addEventListener('click', () => { motion = !motion; applyMotion(); });
  reduced.addEventListener('change', () => { motion = !reduced.matches; applyMotion(); });
  addEventListener('scroll', () => { if (!queued) { requestAnimationFrame(update); queued = true; } }, {passive:true});
  addEventListener('resize', update);
  document.querySelector('#year').textContent = new Date().getFullYear();
  applyMotion();
})();
