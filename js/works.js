/* works.js
 * data/works.json を読み込み、作品グリッドとヒーロー動画を描画する。
 * 新しい作品を追加したいときは data/works.json を編集するか、
 * scripts/add-work.mjs を使う(README参照)。
 */

const DATA_URL = 'data/works.json';

window.PortfolioData = (async function loadPortfolioData(){
  try{
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if(!res.ok) throw new Error('works.json の読み込みに失敗しました: ' + res.status);
    return await res.json();
  }catch(err){
    console.error(err);
    return { hero: { videos: [] }, about: null, works: [] };
  }
})();

function buildCard(work){
  const card = document.createElement('div');
  card.className = 'work-card';
  card.dataset.workId = work.id;

  const img = document.createElement('img');
  img.src = work.thumbnail;
  img.alt = work.title;
  img.loading = 'lazy';
  card.appendChild(img);

  const title = document.createElement('span');
  title.className = 'work-card-title';
  title.textContent = work.title;
  card.appendChild(title);

  card.addEventListener('click', () => openLightbox(work));
  return card;
}

function renderGrids(works){
  const grids = document.querySelectorAll('.works-grid[data-category]');
  grids.forEach(grid => {
    const category = grid.dataset.category;
    const items = works.filter(w => w.category === category);

    const countEl = document.querySelector(`.section-count[data-count="${category}"]`);
    if(countEl) countEl.textContent = items.length ? String(items.length).padStart(2, '0') : '';

    if(!items.length){
      const empty = document.createElement('p');
      empty.className = 'works-empty';
      empty.textContent = '準備中です。';
      grid.appendChild(empty);
      return;
    }

    items
      .slice()
      .sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
      .forEach(work => grid.appendChild(buildCard(work)));
  });
}

function openLightbox(work){
  const lightbox = document.getElementById('lightbox');
  const body = document.getElementById('lightbox-body');
  if(!lightbox || !body) return;

  body.innerHTML = '';

  if(work.platform === 'youtube' || work.platform === 'vimeo'){
    const ratioBox = document.createElement('div');
    ratioBox.className = 'ratio-box';
    const iframe = document.createElement('iframe');
    iframe.src = work.embedUrl;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    ratioBox.appendChild(iframe);
    body.appendChild(ratioBox);
  }else{
    const img = document.createElement('img');
    img.src = work.thumbnail;
    img.alt = work.title;
    body.appendChild(img);
  }

  const caption = document.createElement('div');
  caption.className = 'lightbox-caption';
  const titleSpan = document.createElement('span');
  titleSpan.textContent = work.title;
  caption.appendChild(titleSpan);
  if(work.sourceUrl){
    const link = document.createElement('a');
    link.href = work.sourceUrl;
    link.textContent = '元のページを見る ↗';
    link.target = '_blank';
    link.rel = 'noopener';
    caption.appendChild(link);
  }
  body.appendChild(caption);

  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(){
  const lightbox = document.getElementById('lightbox');
  const body = document.getElementById('lightbox-body');
  if(!lightbox) return;
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if(body) body.innerHTML = '';
}

function initHero(videoUrls){
  const stage = document.getElementById('hero-video-stage');
  if(!stage || !videoUrls || !videoUrls.length) return;

  const videos = videoUrls.map((src, i) => {
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.loop = false;
    v.playsInline = true;
    v.preload = i === 0 ? 'auto' : 'none';
    if(i === 0) v.classList.add('is-active');
    stage.appendChild(v);
    return v;
  });

  let current = 0;

  function play(index){
    videos.forEach((v, i) => v.classList.toggle('is-active', i === index));
    const v = videos[index];
    v.preload = 'auto';
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  videos.forEach((v, i) => {
    v.addEventListener('ended', () => {
      current = (i + 1) % videos.length;
      play(current);
    });
    // 動画ファイルがまだ無い/読み込みに失敗した場合は次の動画へスキップする
    v.addEventListener('error', () => {
      if(videos.every(video => video.error)) return; // 全滅なら何もしない(黒背景のまま)
      if(i === current){
        current = (i + 1) % videos.length;
        play(current);
      }
    });
  });

  play(0);
}

document.addEventListener('DOMContentLoaded', async () => {
  const data = await window.PortfolioData;

  if(document.querySelector('.works-grid[data-category]')){
    renderGrids(data.works || []);
  }
  initHero((data.hero && data.hero.videos) || []);

  const closeBtn = document.getElementById('lightbox-close');
  const lightbox = document.getElementById('lightbox');
  if(closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if(lightbox){
    lightbox.addEventListener('click', (e) => {
      if(e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeLightbox();
  });
});
