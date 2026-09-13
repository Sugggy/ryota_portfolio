/* works.js
 * data/works.json を読み込み、作品グリッドとヒーロー動画を描画する。
 * 新しい作品を追加したいときは /admin/ の管理画面(Decap CMS)を使うか、
 * data/works.json を直接編集するか、scripts/add-work.mjs を使う(README参照)。
 *
 * タイトル・サムネイルが未入力のYouTube/Vimeo作品は、oEmbedから自動取得する。
 * ArtStationは外部からの直接取得(CORS)ができないため、CMS側での手入力が必要。
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

const oembedCache = new Map();

function extractYouTubeId(sourceUrl){
  try{
    const url = new URL(sourceUrl);
    if(url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if(url.searchParams.get('v')) return url.searchParams.get('v');
    const shorts = url.pathname.match(/\/shorts\/([^/]+)/);
    if(shorts) return shorts[1];
  }catch{ /* 無効なURL */ }
  return null;
}

function extractVimeoId(sourceUrl){
  try{
    const url = new URL(sourceUrl);
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }catch{
    return null;
  }
}

// 保存済みの embedUrl があればそれを使い、無ければ sourceUrl から組み立てる
function deriveEmbedUrl(work){
  if(work.embedUrl) return work.embedUrl;
  if(work.platform === 'youtube'){
    const id = extractYouTubeId(work.sourceUrl);
    return id ? `https://www.youtube.com/embed/${id}` : '';
  }
  if(work.platform === 'vimeo'){
    const id = extractVimeoId(work.sourceUrl);
    return id ? `https://player.vimeo.com/video/${id}` : '';
  }
  return '';
}

function fetchOEmbed(work){
  if(oembedCache.has(work.sourceUrl)) return oembedCache.get(work.sourceUrl);

  let promise;
  if(work.platform === 'youtube'){
    promise = fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(work.sourceUrl)}&format=json`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
  }else if(work.platform === 'vimeo'){
    promise = fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(work.sourceUrl)}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
  }else{
    promise = Promise.resolve(null);
  }
  oembedCache.set(work.sourceUrl, promise);
  return promise;
}

// タイトル・サムネイルが空の作品を、可能な範囲で自動補完する
async function enrichWork(work){
  if(work.platform === 'youtube' && !work.thumbnail){
    const id = extractYouTubeId(work.sourceUrl);
    if(id) work.thumbnail = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }

  const needsMeta = (!work.title || !work.thumbnail) && (work.platform === 'youtube' || work.platform === 'vimeo');
  if(needsMeta){
    const meta = await fetchOEmbed(work);
    if(meta){
      if(!work.title) work.title = meta.title || work.title;
      if(!work.thumbnail) work.thumbnail = meta.thumbnail_url || work.thumbnail;
    }
  }

  if(!work.title) work.title = 'Untitled';
  if(!work.thumbnail) work.thumbnail = 'https://placehold.co/1200x750/131416/c9a063?text=No+Image';
  return work;
}

function buildCard(work){
  const card = document.createElement('div');
  card.className = 'work-card';
  card.dataset.workId = work.id || work.title;

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
    iframe.src = deriveEmbedUrl(work);
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
    const works = await Promise.all((data.works || []).map(w => enrichWork({ ...w })));
    renderGrids(works);
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
