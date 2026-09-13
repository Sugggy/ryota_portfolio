document.getElementById('year').textContent = new Date().getFullYear();

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
