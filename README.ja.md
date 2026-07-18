# Vellum

🌐 [English (US)](README.md) · [English (UK)](README.en-GB.md) · [Español](README.es.md) · [中文](README.zh.md) · **日本語** · [한국어](README.ko.md)

**想像を地図に。** 自分だけのファンタジー世界を創造し、磨き上げる Obsidian の地図生成・編集プラグイン。

外部ライブラリなしの純粋な Canvas（インク＆ウォッシュレンダリング）で動作し、レンダリング結果がそのまま完成した古地図になることを目指しています。地図は `.fmap`（JSON）ファイルとして保存されるため、バージョン管理や同期もそのまま機能します。

## リポジトリ構成

| フォルダ | 内容 |
|---|---|
| [`plugin/`](plugin/) | プラグインの**ソース**（TypeScript）。ビルド・テスト・アーキテクチャ文書を含む |
| [`docs/`](docs/) | ランディングページ（**GitHub Pages** で配信）。ダウンロード zip を含む |
| [`dist/`](dist/) | プラグインの**配布物** — リリース zip + 展開済みコピー（インストールに必要なファイルのみ） |

- ソースから配布物をビルドする方法：[`plugin/README.md`](plugin/README.md) の開発セクション参照
- アーキテクチャと内部構造：[`plugin/ARCHITECTURE.md`](plugin/ARCHITECTURE.md)（英語）
- 設計上の意思決定：[`plugin/DESIGN-DECISIONS.md`](plugin/DESIGN-DECISIONS.md)（英語）

## インストール（ユーザー向け）

1. [`dist/`](dist/) から最新の `vellum-x.y.z.zip` を取得して解凍します
   （またはランディングページのダウンロードボタンから）。
2. `main.js`、`manifest.json`、`styles.css` をボールトの `.obsidian/plugins/vellum/` フォルダにコピーします。
   - Windows なら同梱の `install.ps1 "ボールトのパス"` の 1 行で完了します。
3. 設定 → コミュニティプラグインで **Vellum** を有効化します。

> 現在デスクトップ専用です（モバイル未検証）。

## 開発（クイックスタート）

```powershell
cd plugin
npm install
npm run dev    # ウォッチビルド
npm run build  # 型チェック + プロダクションバンドル
npm test       # 純ロジックの単体テスト
```

## コントリビュート / ブランチ規則

このリポジトリは `master`（リリース）/ `dev`（統合）/ `feat/*`（機能）のブランチ戦略を採用しています。
PR を出す前に [CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。

## ライセンス

[MIT](plugin/LICENSE)
