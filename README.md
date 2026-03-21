# Mass Driver

Bluesky 投稿専用のクイックポストツール。  
複数アカウントへの同時投稿、画像添付、ハッシュタグ補助、通知確認、投稿管理を備えた PWA クライアントです。

## 主な機能

- **複数アカウント同時投稿** — 登録済みアカウントから投稿先を選んでまとめてポスト
- **画像添付** — JPEG / PNG / WebP を最大 4 枚、自動リサイズ・圧縮付き
- **ハッシュタグ補助** — 過去に使ったタグをワンタップで挿入
- **テンプレート保存** — よく使う定型文を保存してすぐ呼び出し
- **通知一覧** — 全アカウントの通知をまとめて確認、種類別フィルタ付き
- **投稿管理** — 自分のポストを一覧表示・削除
- **PWA / Share Target** — インストールして OS の共有メニューから直接投稿
- **URL クエリ共有** — `?intent=` パラメータでブログ等のシェアボタンに組み込み可能

## 必要なもの

- Bluesky アカウント
- [アプリパスワード](https://bsky.app/settings/app-passwords)（通常のパスワードではなく、設定画面で発行する専用パスワード）

> セッション情報はブラウザの `localStorage` に保存されます。サーバーには送信されません。

### データの保存と運用ルール

- **セッション**: Bluesky の AT Protocol セッションがブラウザの `localStorage` に保存されます。ブラウザのデータを消去するとログアウトされます。
- **セッション期限切れ**: セッションが無効になったアカウントは自動で削除され、再ログインが必要です。
- **アカウント登録**: 最大 10 アカウントまで登録できます。
- **投稿の部分失敗**: 複数アカウントへの同時投稿で一部が失敗した場合、成功したアカウントの投稿はそのまま残り、失敗したアカウントとエラー理由が結果パネルに表示されます。
- **テンプレート / ハッシュタグ履歴**: いずれも `localStorage` に保存されます。

## 開発

### 前提

- Node.js >= 22.12.0（`.nvmrc` に `22` を指定済み）

### セットアップ

```bash
npm install
```

### 開発サーバー

```bash
npm run dev
```

`http://localhost:5173` で起動します（`--host 0.0.0.0` 付き）。

### 主なスクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run check` | SvelteKit 型チェック |
| `npm run lint` | ESLint |
| `npm run mock:dev` | モック HTML を開いて UI 検討 |

### 技術スタック

- [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [@atproto/api](https://github.com/bluesky-social/atproto) — AT Protocol クライアント
- [vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html) — PWA + Share Target

## PWA としてインストール

ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択すると、  
OS の共有メニューに Mass Driver が表示され、他アプリから直接テキストや URL を送れます。

iOS Safari では Share Target 非対応のため、`?intent=` URL クエリをフォールバックとして利用してください。

## ライセンス

[THE SUSHI-WARE LICENSE](LISENCE.md)
