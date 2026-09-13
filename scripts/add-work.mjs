#!/usr/bin/env node
/**
 * 使い方:
 *   node scripts/add-work.mjs <URL> <REELS|STILLS|CINEMATOGRAPHY>
 *
 * 例:
 *   node scripts/add-work.mjs "https://youtu.be/xxxxxxxxxxx" REELS
 *   node scripts/add-work.mjs "https://vimeo.com/xxxxxxx" CINEMATOGRAPHY
 *   node scripts/add-work.mjs "https://www.artstation.com/artwork/xxxxxx" STILLS
 *
 * YouTube / Vimeo は oEmbed から、ArtStation はページの OGP タグから
 * タイトル・サムネイルを自動取得して data/works.json に追記する。
 * Node.js 18 以降が必要(組み込みの fetch を使用)。
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'data', 'works.json');
const CATEGORIES = ['REELS', 'STILLS', 'CINEMATOGRAPHY'];

async function main(){
  const [, , rawUrl, rawCategory] = process.argv;

  if(!rawUrl || !rawCategory){
    console.error('使い方: node scripts/add-work.mjs <URL> <REELS|STILLS|CINEMATOGRAPHY>');
    process.exit(1);
  }

  const category = rawCategory.toUpperCase();
  if(!CATEGORIES.includes(category)){
    console.error(`カテゴリは ${CATEGORIES.join(' / ')} のいずれかを指定してください。`);
    process.exit(1);
  }

  let url;
  try{
    url = new URL(rawUrl);
  }catch{
    console.error('URLの形式が正しくありません: ' + rawUrl);
    process.exit(1);
  }

  const platform = detectPlatform(url);
  if(!platform){
    console.error('対応していないURLです(YouTube / Vimeo / ArtStation のみ対応)。');
    process.exit(1);
  }

  console.log(`[${platform}] メタデータを取得しています...`);
  const meta = await fetchMeta(platform, url);

  const db = JSON.parse(await readFile(DATA_PATH, 'utf-8'));
  db.works = db.works || [];

  if(db.works.some(w => w.sourceUrl === url.toString())){
    console.log('このURLは既に登録されています。処理を中止しました。');
    return;
  }

  const entry = {
    id: slugify(meta.title) + '-' + Date.now().toString(36),
    title: meta.title,
    category,
    platform,
    sourceUrl: url.toString(),
    embedUrl: meta.embedUrl || '',
    thumbnail: meta.thumbnail || '',
    addedAt: new Date().toISOString().slice(0, 10)
  };

  db.works.push(entry);
  await writeFile(DATA_PATH, JSON.stringify(db, null, 2) + '\n', 'utf-8');

  console.log('追加しました:');
  console.log(`  タイトル: ${entry.title}`);
  console.log(`  カテゴリ: ${entry.category}`);
  console.log(`  サムネイル: ${entry.thumbnail || '(取得できませんでした。data/works.json を手動で編集してください)'}`);
}

function detectPlatform(url){
  const host = url.hostname.replace(/^www\./, '');
  if(host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'youtube';
  if(host === 'vimeo.com' || host === 'player.vimeo.com') return 'vimeo';
  if(host === 'artstation.com') return 'artstation';
  return null;
}

async function fetchMeta(platform, url){
  if(platform === 'youtube') return fetchYouTube(url);
  if(platform === 'vimeo') return fetchVimeo(url);
  if(platform === 'artstation') return fetchArtStation(url);
  throw new Error('unsupported platform');
}

async function fetchYouTube(url){
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`;
  const res = await fetch(oembedUrl);
  if(!res.ok) throw new Error('YouTube oEmbed の取得に失敗しました。URLを確認してください。');
  const data = await res.json();

  const videoId = extractYouTubeId(url);
  return {
    title: data.title,
    thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : data.thumbnail_url,
    embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  };
}

function extractYouTubeId(url){
  if(url.hostname.includes('youtu.be')) return url.pathname.slice(1);
  if(url.searchParams.get('v')) return url.searchParams.get('v');
  const shorts = url.pathname.match(/\/shorts\/([^/]+)/);
  if(shorts) return shorts[1];
  return null;
}

async function fetchVimeo(url){
  const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}`;
  const res = await fetch(oembedUrl);
  if(!res.ok) throw new Error('Vimeo oEmbed の取得に失敗しました。URLを確認してください。');
  const data = await res.json();

  const videoId = url.pathname.split('/').filter(Boolean)[0];
  return {
    title: data.title,
    thumbnail: data.thumbnail_url,
    embedUrl: videoId ? `https://player.vimeo.com/video/${videoId}` : ''
  };
}

async function fetchArtStation(url){
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; portfolio-site-bot/1.0)' }
  });
  if(!res.ok) throw new Error('ArtStation ページの取得に失敗しました。URLを確認してください。');
  const html = await res.text();

  return {
    title: extractMeta(html, 'og:title') || 'Untitled',
    thumbnail: extractMeta(html, 'og:image') || '',
    embedUrl: ''
  };
}

function extractMeta(html, property){
  const re = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(re);
  if(match) return decodeHtml(match[1]);

  // content と property の順序が逆のパターンにも対応
  const reReversed = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    'i'
  );
  const matchReversed = html.match(reReversed);
  return matchReversed ? decodeHtml(matchReversed[1]) : null;
}

function decodeHtml(str){
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function slugify(str){
  return (str || 'work')
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'work';
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
