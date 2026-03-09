# Mock Workspace

このディレクトリは、Mass Driver のUI再設計専用ワークスペースです。
実装コード（`src/`）に手を入れる前に、ここで情報設計と画面設計を固めます。

## 目的

- 既存機能の棚卸し
- 画面構成の再定義
- UIモックでレイアウト/トーンを先に確認

## ファイル構成

- `features.md` : 現在の機能一覧（要件の土台）
- `screen-architecture.md` : 画面再構成案と優先度
- `todos.md` : 再設計・実装準備のタスク一覧
- `mockup.html` : デザイン検討用の静的モック
- `mockup.css` : モック用スタイル

## 使い方

1. `mock/features.md` で不要機能・不足機能を確定
2. `mock/screen-architecture.md` で導線と画面責務を整理
3. `mock/todos.md` で対応順と担当を決める
4. `mock/mockup.html` を開いて見た目と情報量を検証
5. 合意後に `src/` 実装へ落とし込む
