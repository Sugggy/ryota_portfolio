# Portfolio Site

プレーンな HTML / CSS / JS のみで作られた、GitHub Pages でそのまま公開できるポートフォリオサイトです。
Reels / Stills / Cinematography の作品リストと About ページの内容は `data/works.json` 1ファイルで管理します。

## フォルダ構成

```
index.html          トップページ(ヒーロー動画 + 作品一覧)
about.html           Aboutページ
css/style.css        スタイル
js/main.js           ナビの開閉・スクロール演出
js/works.js          works.json の読み込み・グリッド描画・ライトボックス
js/about.js          Aboutページの描画・メールのクリックコピー
data/works.json      ★ 作品データ・About情報(ここを編集するだけで更新できる)
scripts/add-work.mjs URLを渡すと自動で works.json に作品を追加するスクリプト
assets/videos/       ヒーローの背景動画(mp4)を置く
assets/images/       サムネイル画像(必要な場合)
```

## ローカルで確認する

動画やfetchを使うため `file://` では正しく動きません。簡易サーバーを立てて確認してください。

```bash
npx --yes serve .
# あるいは
python3 -m http.server 8000
```

## 作品の追加方法

### 方法A: URLを渡して自動追加(おすすめ)

YouTube・Vimeo・ArtStation のURLを渡すと、タイトルとサムネイルを自動取得して `data/works.json` に追記します。Node.js 18以上が必要です。

```bash
node scripts/add-work.mjs "https://youtu.be/xxxxxxxxxxx" REELS
node scripts/add-work.mjs "https://vimeo.com/xxxxxxx" CINEMATOGRAPHY
node scripts/add-work.mjs "https://www.artstation.com/artwork/xxxxxx" STILLS
```

カテゴリは `REELS` / `STILLS` / `CINEMATOGRAPHY` のいずれかです。
ArtStationは公式のoEmbedが無いため、ページのOGPタグ(og:title / og:image)から取得します。まれにページ構造の変更で取得できないことがあり、その場合は方法Bで手動追記してください。

### 方法B: JSONを直接編集する

`data/works.json` の `worksReels` / `worksStills` / `worksCinematography` のいずれかの配列に、以下の形式でオブジェクトを追加するだけです。GitHub上のWebエディタ(リポジトリ画面で該当ファイルを開き鉛筆アイコンをクリック)からでも編集できます。

```json
{
  "id": "任意の一意なID",
  "title": "作品タイトル",
  "platform": "youtube",
  "sourceUrl": "https://youtu.be/xxxxxxxxxxx",
  "embedUrl": "https://www.youtube.com/embed/xxxxxxxxxxx",
  "thumbnail": "https://img.youtube.com/vi/xxxxxxxxxxx/maxresdefault.jpg",
  "addedAt": "2026-09-13"
}
```

`platform` が `youtube` / `vimeo` の場合はクリックでライトボックス再生、それ以外(`artstation` など画像作品)はサムネイル画像を拡大表示します。

### ヒーローの背景動画を変える

`assets/videos/` に mp4 を置き、`data/works.json` の `hero.videos` にパスを追加・入れ替えするだけです。複数指定すると自動的に順番に再生されます(1本終わったら次へ切り替え)。書き出しは軽量な mp4(H.264、1080p、10〜20秒、音声なし)を推奨します。

### About の内容を変える

`data/works.json` の `about` オブジェクトを編集してください。`email` は About ページでクリックするとクリップボードにコピーされます。`links` 配列に ArtStation / X / Instagram / YouTube などのURLを追加・削除できます。

## GitHub Pages で公開する

1. このフォルダの中身をリポジトリのルートにコミット・プッシュする
2. GitHubのリポジトリ画面 → `Settings` → `Pages`
3. `Build and deployment` の `Source` を `Deploy from a branch` にし、ブランチを `main`、フォルダを `/ (root)` に設定
4. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

独自ドメインを使う場合はリポジトリ直下に `CNAME` ファイルを追加してください。

## Sveltia CMSで管理画面から更新する

`/admin/` にブラウザからログインし、フォーム入力だけで `data/works.json` を更新・コミットできます(ArtstationやWordPressの管理画面に近い体験)。ホスティングはGitHub Pagesのままで、Netlifyは不要です。設定は一度だけでOKです。

1. GitHubの右上アイコン → **Settings** → 左メニュー最下部 **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. トークンの設定:
   - Repository access: **Only select repositories** → `ryota_portfolio` を選択
   - Permissions → **Repository permissions** → `Contents` を **Read and write** に変更
   - 有効期限はお好みで(90日など。切れたら作り直せば大丈夫です)
3. **Generate token** を押し、表示されたトークン(`github_pat_...`から始まる文字列)をコピーしておく(この画面を閉じると二度と表示されません)
4. `https://<ユーザー名>.github.io/<リポジトリ名>/admin/` を開く
5. Sveltia CMSのログイン画面で「Personal access token」を選び、3でコピーしたトークンを貼り付けてログイン
6. 「REELS作品」「STILLS作品」「CINEMATOGRAPHY作品」「About」から編集 → 右上の **Publish**(または保存ボタン)でGitHubに直接コミットされ、GitHub Pagesが自動で再デプロイする

トークンはブラウザに保存されるので、毎回貼り付ける必要はありません(有効期限が切れたら再発行してください)。

### 入力のコツ

- **YouTube / Vimeo**:「元のページURL」に普通の視聴URL(`https://youtu.be/xxxx` など)を貼るだけでOK。タイトル・サムネイルを空欄にしておくと、サイト側が表示時に自動取得します。
- **ArtStation(STILLS)**:ブラウザから直接ArtStationの情報を取得することはできない(CORS制限)ため、タイトルとサムネイル画像は管理画面から手入力・アップロードしてください。
- 画像をアップロードすると `assets/images/uploads/` に保存され、自動でパスが入力されます。
- 「元のページURL」だけ入っていてタイトル・サムネイルが空のYouTube/Vimeo作品は、閲覧者のブラウザ側で毎回oEmbedを取得するため表示がわずかに遅れます。頻繁に見られるページでは、一度CMSで開いて保存し直すとタイトル・サムネイルが固定されて速くなります。

## 今後よく触る場所

- 新しい作品を追加したい → `node scripts/add-work.mjs <URL> <カテゴリ>`
- ヒーロー動画を差し替えたい → `assets/videos/` + `data/works.json` の `hero.videos`
- 自己紹介・SNSリンクを変えたい → `data/works.json` の `about`
- デザインを調整したい → `css/style.css`(色は `:root` の変数にまとまっています)
