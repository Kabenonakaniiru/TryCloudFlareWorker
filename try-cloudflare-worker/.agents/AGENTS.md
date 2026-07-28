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

## 📌 決定済み仕様 (Confirmed Specifications)

### 1. TODO画面（日々のタスク運用UI）
- **タスク一覧表示**: リセット時刻（デフォルト 04:00）考慮後の本日の対象タスクを表示。グループごとのカラーバッジを付与。
- **グループフィルター**: 画面上部にグループ（「🎮 艦これ」「⚔️ 原神」等）ごとの抽出タブを配置。
- **進捗インジケーター**: 「完了数 / 全タスク数 (例: 3/5 60%)」を表示するプログレスバーを設置。
- **繰越タスク表示**: 前日から持ち越されたタスク（`slide` 処理されたログ）には `[繰越]` バッジを表示。

### 2. 日次リセット & 未完了タスク処理（`runDailyLifecycle`）
- **リセット時刻**: ルールごとの `resetTime`（デフォルト `04:00`）に基づき判定。
- **未完了タスク (`pending`) の分岐**:
  - `delete` (リセットモード): 前日の未完了ログを `missed`（未達成）に更新確定し、Google Calendar 上のタイトルを `【未完了】{タイトル}` に変更。
  - `slide` (繰越モード): 前日の未完了ログの `targetDate` を本日に更新して繰り越し、Google Calendar のイベント日付を本日に変更。

### 3. Google Calendar 連携
- 新規生成時: 終日イベントを自動生成し `calendarEventId` を D1 に記録。
- ステータス更新時: 完了 (`completed`) 時にカレンダー上のイベント表示を更新。

---

## 📍 現在の作業状態と残タスク

- **ブランチ**: `feature/change_editable_category_on_task`
- **ビルド & テスト状態**: `node build.js` および `npm test` が成功。

### 📋 次の作業ステップ
1. **TODO画面（`public/index.html`, `src/client/index.ts`, `src/client/styles/index.css`）の実装強化**:
   - グループフィルター機能の追加。
   - 本日の完了進捗バーの追加。
   - 繰越タスク識別バッジの追加。
2. **バックエンド API / 日時計算の整合性確認**:
   - `/api/logs/today` がグループ情報や繰越フラグを適切に返すかの確認・拡張。
3. **ビルド & テストの実行と検証**。

---

## 🔄 作業再開用のプロンプト例
次回対話を再開する際は、以下のプロンプトを入力してください：

```text
.agents/AGENTS.md を読み込んで、決定した仕様に基づき「TODO画面のUI強化（グループフィルター・進捗バー・繰越表示）」の実装を進めてください。
```

---

## ⚙️ 技術スタックと構成の概要

- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 + Drizzle ORM
- **外部サービス連携**: Google Calendar API（JWT認証、サービスアカウント）
- **タスク更新処理**: Cronトリガーによる `runDailyLifecycle`
- **フロントエンド**: `public/` 配下の静的HTML + `src/client/*.ts`, `src/client/styles/*.css` から `esbuild` でバンドル生成 (`/dist/client/*`)
