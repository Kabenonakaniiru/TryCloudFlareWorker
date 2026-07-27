# プロジェクトの現状と不整合に関するメモ (Project Memory)

このプロジェクトには、フロントエンドとバックエンドのAPIエンドポイント名において、いくつかの不整合が存在していました。開発を進める際は、以下の状況および構成を意識してください。

## ✅ 解消済みの課題・直近の更新内容

1. **APIエンドポイントの不整合（解消済み）**
   - カテゴリ管理: フロントエンドの呼び出しを `/api/categories` から `/api/groups` に修正。
   - ルール管理: フロントエンドの呼び出しを `/api/tasks` から `/api/rules` に修正。

2. **フロントエンドコード（JS/TS・CSS）の完全外出し・モジュール化（完了）**
   - **`public/index.html`**: インライン `<script>` および `style="..."` を削除、`src/client/index.ts` / `src/client/styles/index.css` へ外出し分離。
   - **`public/admin.html`**: インライン `style="..."` を削除、`src/client/styles/admin.css` へCSS化。
   - **`public/groups.html`**: インライン `<script>` および `style="..."` を削除、`src/client/groups.ts` / `src/client/styles/groups.css` へ外出し分離。
   - **`public/rules.html`**: インライン `<script>` および `style="..."` を削除、`src/client/rules.ts` / `src/client/styles/rules.css` へ外出し分離。
   - **ビルド構成**: `build.js` (esbuild) の `entryPoints` に `index.ts`, `admin.ts`, `groups.ts`, `rules.ts` および全CSSを追加。`/dist/client/` 配下へ一括バンドル出力する構成に完備。

3. **上限・リソースを意識した堅牢化・最適化（完了）**
   - 入力値の厳密なバリデーション (`ValidationError`) およびカテゴリ（20件）、ルール（100件）の上限設定。
   - `runDailyLifecycle` 実行時、Google OAuth アクセストークンを再利用（1回のみ取得）し、Workers CPU 制限・API上限を回避。
   - Google Calendar 連携で一部エラーが発生しても D1 ログ・削除等の処理が止まらないよう耐障害性を向上。

---

## 📍 現在の作業状態と残タスク

- **ブランチ**: `feature/change_editable_category_on_task`
- **ビルド & テスト状態**: `node build.js` および `npm test` (37/37件) が全件成功。

### 📋 今後の作業ステップ（残タスク）
1. **仕様を詰める作業（要件整理・記録）**:
   * 日々のTODO画面（`/todo` 連携または対応画面）のクライアントUI仕様・イベント動作の定義。
   * ソシャゲ固有のリセット時刻（02:00等）と、未完了タスクの「繰越 (keep)」 vs 「リセット (delete)」の表示およびカレンダー連携の動作確認・仕様明確化。
   * 仕様決定次第、Project Memory に記録。

---

## 🔄 作業再開用のプロンプト例
次回対話を再開する際は、以下のプロンプトを入力してください：

```text
.agents/AGENTS.md を読み込んで、全HTMLからのJS/CSS外出し完了状態を確認したうえで、「TODO画面・タスク繰越に関する仕様の詰めと整理」を進めてください。
```

---

## ⚙️ 技術スタックと構成の概要

- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 + Drizzle ORM
- **外部サービス連携**: Google Calendar API（JWT認証、サービスアカウント）
- **タスク更新処理**: Cronトリガーによる `runDailyLifecycle`
- **フロントエンド**: `public/` 配下の静的HTML + `src/client/*.ts`, `src/client/styles/*.css` から `esbuild` でバンドル生成 (`/dist/client/*`)
