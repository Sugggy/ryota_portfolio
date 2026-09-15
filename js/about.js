document.addEventListener('DOMContentLoaded', async () => {
  const data = await window.PortfolioData;
  const about = data.about;
  if(!about) return;

  document.getElementById('about-role').textContent = about.role || '';
  document.getElementById('about-name').textContent = about.name || '';
  document.getElementById('about-statement').textContent = about.statement || '';

  const bioEl = document.getElementById('about-bio-text');
  (about.bio || []).forEach(paragraph => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    bioEl.appendChild(p);
  });

  const photoEl = document.getElementById('about-photo');
  if(photoEl && about.photo){
    photoEl.src = about.photo;
    photoEl.alt = about.name ? `${about.name}のポートレート` : '';
    photoEl.hidden = false;
  }

  document.getElementById('email-text').textContent = about.email || '';

  const emailBtn = document.getElementById('email-copy');
  const flag = document.getElementById('email-copy-flag');
  if(emailBtn && about.email){
    emailBtn.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(about.email);
      }catch(err){
        // クリップボードAPIが使えない環境向けのフォールバック
        const temp = document.createElement('textarea');
        temp.value = about.email;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      emailBtn.classList.add('is-copied');
      const original = flag.textContent;
      flag.textContent = 'コピーしました';
      setTimeout(() => {
        flag.textContent = original;
        emailBtn.classList.remove('is-copied');
      }, 1800);
    });
  }

  const list = document.getElementById('social-links');
  (about.links || []).forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `<span>${link.label}</span><span>↗</span>`;
    li.appendChild(a);
    list.appendChild(li);
  });
});
