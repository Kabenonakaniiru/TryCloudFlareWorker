# プロジェクトの現状と不整合に関するメモ (Project Memory)

このプロジェクトには、フロントエンドとバックエンドのAPIエンドポイント名において、いくつかの不整合が存在しています。開発を進める際は、以下の不整合を意識してください。

## ⚠️ APIエンドポイントの不整合

1. **カテゴリ管理 (`public/groups.html`)**
   - **フロントエンドの呼び出し**: `/api/categories` (`GET`, `POST`, `DELETE`)
   - **バックエンドの定義**: `/api/groups` ([src/routes.ts](file:///app/try-cloudflare-worker/src/routes.ts))
   - **影響**: カテゴリ管理画面を開いてカテゴリを操作すると、404エラーが発生します。

2. **ルール管理 (`public/rules.html`)**
   - **フロントエンドの呼び出し**: `/api/tasks` (`GET`, `POST`, `PUT`, `DELETE`)
   - **バックエンドの定義**: `/api/rules` ([src/routes.ts](file:///app/try-cloudflare-worker/src/routes.ts))
   - **影響**: タスク設定画面を開いて追加・編集・削除などを行うと、404エラーが発生します。

## ⚙️ 技術スタックと構成の概要

- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 + Drizzle ORM
- **外部サービス連携**: Google Calendar API（JWT認証、サービスアカウント）
- **タスク更新処理**: Cronトリガーによる `runDailyLifecycle`
- **フロントエンド**: `public/` 配下の静的HTML/CSS/JS (一部 `src/client/admin.ts` から `esbuild` でバンドル)
