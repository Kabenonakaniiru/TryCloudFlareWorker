# プロジェクトの現状と不整合に関するメモ (Project Memory)

このプロジェクトには、フロントエンドとバックエンドのAPIエンドポイント名において、いくつかの不整合が存在していました。開発を進める際は、以下の状況および構成を意識してください。

## ✅ 解消済みの課題・直近の更新内容

1. **APIエンドポイントの不整合（解消済み）**
   - カテゴリ管理: フロントエンドの呼び出しを `/api/categories` から `/api/groups` に修正。
   - ルール管理: フロントエンドの呼び出しを `/api/tasks` から `/api/rules` に修正。

2. **フロントエンドコードのモジュール化・分離（完了）**
   - **`public/groups.html`**: インライン `<script>` を削除し、`src/client/groups.ts` へ外出し分離。
   - **`public/rules.html`**: インライン `<script>` を削除し、`src/client/rules.ts` へ外出し分離。
   - **ビルド構成**: `build.js` (esbuild) の `entryPoints` に `groups.ts`, `rules.ts` を追加。`/dist/client/` 配下へバンドル出力して HTML から読み込む構成に統一。

3. **上限・リソースを意識した堅牢化・最適化（完了）**
   - 入力値の厳密なバリデーション (`ValidationError`) およびカテゴリ（20件）、ルール（100件）の上限設定。
   - `runDailyLifecycle` 実行時、Google OAuth アクセストークンを再利用（1回のみ取得）し、Workers CPU 制限・API上限を回避。
   - Google Calendar 連携で一部エラーが発生しても D1 ログ・削除等の処理が止まらないよう耐障害性を向上。

---

## 📍 現在の作業状態と残タスク

- **ブランチ**: `feature/change_editable_category_on_task`
- **ビルド & テスト状態**: `node build.js` および `npm test` (37/37件) が全件成功。Git ワークツリーはクリーンにコミット済み (`5c03a70`)。

### 📋 次回の残タスク（今後の作業ステップ）
1. **仕様の詰めていく作業（要件整理・記録）**:
   * 日々のTODO画面（`/todo` 連携または対応画面）のクライアントUI仕様・イベント動作の定義。
   * ソシャゲ固有のリセット時刻（02:00等）と、未完了タスクの「繰越 (keep)」 vs 「リセット (delete)」の表示およびカレンダー連携の動作確認・仕様明確化。
   * 仕様決定次第、Project Memory に記録。
2. **その他UIのブラッシュアップ / インラインスタイルの整理（必要に応じて）**:
   * HTML内に残っている一部インラインスタイル (`style="..."`) の `src/client/styles/` への共通CSS化。

---

## 🔄 作業再開用のプロンプト例
次回対話を再開する際は、以下のプロンプトを入力してください：

```text
.agents/AGENTS.md を読み込んで、前回の「フロントエンドJS外出し完了」の状態を確認したうえで、残タスクである「TODO画面・タスク繰越に関する仕様の詰めと整理」を進めてください。
```

---

## ⚙️ 技術スタックと構成の概要

- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 + Drizzle ORM
- **外部サービス連携**: Google Calendar API（JWT認証、サービスアカウント）
- **タスク更新処理**: Cronトリガーによる `runDailyLifecycle`
- **フロントエンド**: `public/` 配下の静的HTML + `src/client/*.ts` から `esbuild` でバンドル生成 (`/dist/client/*.js`)
