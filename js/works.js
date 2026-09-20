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
    return { hero: { videos: [] }, about: null, worksReels: [], worksStills: [] };
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

function formatDate(dateStr){
  if(!dateStr) return '';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : dateStr;
}

function buildCard(work){
  const card = document.createElement('div');
  card.className = 'work-card';
  card.dataset.workId = work.id || work.title;

  const thumb = document.createElement('div');
  thumb.className = 'work-thumb';
  const img = document.createElement('img');
  img.src = work.thumbnail;
  img.alt = work.title;
  img.loading = 'lazy';
  thumb.appendChild(img);
  card.appendChild(thumb);

  const caption = document.createElement('div');
  caption.className = 'work-caption';

  const title = document.createElement('span');
  title.className = 'work-caption-title';
  title.textContent = work.title;
  caption.appendChild(title);

  const date = formatDate(work.addedAt);
  if(date){
    const dateEl = document.createElement('span');
    dateEl.className = 'work-caption-date';
    dateEl.textContent = date;
    caption.appendChild(dateEl);
  }

  card.appendChild(caption);

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

const PLATFORM_LABELS = {
  youtube: 'YouTubeで見る',
  vimeo: 'Vimeoで見る',
  artstation: 'ArtStationで見る'
};

// テキスト中のURLを自動でリンク化する(HTMLエスケープしてからURL部分だけaタグに置き換える)
function linkifyText(text){
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // URLとして許容する文字だけにマッチさせる(日本語や全角記号はここで自然に途切れる)
  return escaped.replace(/(https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&*+,;=%]+)/g, (url) => {
    // 末尾に残りがちな句読点は除く
    const trailingMatch = url.match(/[.,;:]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const cleanUrl = trailing ? url.slice(0, -trailing.length) : url;
    return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanUrl}</a>${trailing}`;
  });
}

function openLightbox(work){
  const lightbox = document.getElementById('lightbox');
  const body = document.getElementById('lightbox-body');
  if(!lightbox || !body) return;

  body.innerHTML = '';

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'lightbox-media';

  if(work.platform === 'youtube' || work.platform === 'vimeo'){
    const ratioBox = document.createElement('div');
    ratioBox.className = 'ratio-box';
    const iframe = document.createElement('iframe');
    iframe.src = deriveEmbedUrl(work);
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    ratioBox.appendChild(iframe);
    mediaWrap.appendChild(ratioBox);
  }else{
    const img = document.createElement('img');
    img.src = work.thumbnail;
    img.alt = work.title;
    mediaWrap.appendChild(img);
  }
  body.appendChild(mediaWrap);

  const info = document.createElement('div');
  info.className = 'lightbox-info';

  const titleEl = document.createElement('h3');
  titleEl.className = 'lightbox-title';
  titleEl.textContent = work.title;
  info.appendChild(titleEl);

  const date = formatDate(work.addedAt);
  if(date){
    const dateEl = document.createElement('p');
    dateEl.className = 'lightbox-date';
    dateEl.textContent = date;
    info.appendChild(dateEl);
  }

  if(work.description){
    const descEl = document.createElement('p');
    descEl.className = 'lightbox-description';
    descEl.innerHTML = linkifyText(work.description);
    info.appendChild(descEl);
  }

  if(work.sourceUrl){
    const link = document.createElement('a');
    link.className = 'lightbox-link';
    link.href = work.sourceUrl;
    link.textContent = (PLATFORM_LABELS[work.platform] || '元のページを見る') + ' ↗';
    link.target = '_blank';
    link.rel = 'noopener';
    info.appendChild(link);
  }

  body.appendChild(info);

  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  lightbox.scrollTop = 0;
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

  if(videos.length === 1){
    videos[0].loop = true;
    videos[0].play().catch(() => {});
    return;
  }

  let current = 0;
  let failStreak = 0; // 連続で何本再生に失敗したかを数える(壊れた動画で無限に固まるのを防ぐ)

  function play(index){
    videos.forEach((v, i) => v.classList.toggle('is-active', i === index));
    const v = videos[index];
    v.preload = 'auto';
    v.currentTime = 0;
    const playPromise = v.play();
    if(playPromise && playPromise.catch) playPromise.catch(() => advance());
  }

  function advance(){
    failStreak++;
    if(failStreak >= videos.length) return; // 1周してどれも再生できない場合のみ諦める
    current = (current + 1) % videos.length;
    play(current);
  }

  videos.forEach((v, i) => {
    v.addEventListener('ended', () => {
      if(i !== current) return;
      failStreak = 0; // 1本でも最後まで再生できたら失敗カウントをリセット(ループを継続させる)
      current = (current + 1) % videos.length;
      play(current);
    });
    v.addEventListener('error', () => {
      if(i !== current) return;
      advance();
    });
  });

  play(0);
}

document.addEventListener('DOMContentLoaded', async () => {
  const data = await window.PortfolioData;

  // 2つに分かれた作品リスト(worksReels/worksStills)をカテゴリ情報付きの1本の配列にまとめる
  const works = [
    ...(data.worksReels || []).map(w => ({ ...w, category: 'REELS' })),
    ...(data.worksStills || []).map(w => ({ ...w, category: 'STILLS' }))
  ];

  if(document.querySelector('.works-grid[data-category]')){
    const enriched = await Promise.all(works.map(w => enrichWork({ ...w })));
    renderGrids(enriched);
  }
  initHero((data.hero && data.hero.videos) || []);

  const heroName = document.getElementById('hero-name');
  const heroRole = document.getElementById('hero-role');
  if(data.about){
    if(heroName && data.about.name) heroName.textContent = data.about.name;
    if(heroRole && data.about.role) heroRole.textContent = data.about.role;
  }

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
