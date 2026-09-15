document.getElementById('year').textContent = new Date().getFullYear();

/* ダーク/ライト切り替え(選択内容はブラウザに保存され、次回訪問時も保持される) */
(function initTheme(){
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-toggle-icon');
  const STORAGE_KEY = 'portfolio-theme';

  function applyTheme(theme){
    if(theme === 'light'){
      root.setAttribute('data-theme', 'light');
      if(icon) icon.textContent = '☀';
    }else{
      root.removeAttribute('data-theme');
      if(icon) icon.textContent = '☾';
    }
  }

  let saved = null;
  try{ saved = localStorage.getItem(STORAGE_KEY); }catch{ /* プライベートモード等では無視 */ }
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));

  if(toggle){
    toggle.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      applyTheme(next);
      try{ localStorage.setItem(STORAGE_KEY, next); }catch{ /* 保存できなくても表示切替は継続 */ }
    });
  }
})();

const nav = document.getElementById('site-nav');
const toggle = document.getElementById('nav-toggle');
const links = document.getElementById('nav-links');

function onScroll(){
  if(window.scrollY > 40){
    nav.classList.add('is-scrolled');
  }else{
    nav.classList.remove('is-scrolled');
  }
}
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

if(toggle && links){
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* scroll-spy: どのセクションが見えているかでナビをハイライト(トップページのみ) */
const sections = document.querySelectorAll('.works-section[id]');
if(sections.length){
  const navAnchors = document.querySelectorAll('.nav-links a[data-cat]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const id = entry.target.id;
      navAnchors.forEach(a => {
        a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach(s => observer.observe(s));
}
