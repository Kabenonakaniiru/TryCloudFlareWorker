# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## 💡 エージェントのクレジット（リソース）上限の意識と安全な一時停止原則

- **リソース・クレジット（トークン/ステップ数）の節約**: エージェント自身のリソース消費を最小限に抑えるため、ツール呼び出しを最適化し（`multi_replace_file_content` の積極的な活用など）、コンテキストの肥大化や冗長な対話を避けること。
- **上限接近時の安全停止**:
  - ステップ数やトークン制限などのエージェントの上限に達しそうになった場合は、無理に作業を続けず、必ず**キリの良いところ**で作業を終わらせること。
  - 作業一時停止・終了時は、以下の処理を確実に実行すること：
    1. 変更したコードおよびドキュメントを Git でコミットし、リモートリポジトリへ `push` して作業ツリーを完全なクリーン状態にする。
    2. プロジェクトの現状、決定済み仕様、および次のステップ（具体的に何をすべきかの残タスク）を `.agents/AGENTS.md` (Project Memory) に正確かつ詳細に書き残す。
    3. 次回開始時は、ユーザーから特別な詳細指示がなくても `.agents/AGENTS.md` を自発的に読み込み、残タスクを自動認識して即座に作業を再開・実行できるようにする。
    4. ユーザーに現在の進捗と、次回は簡潔な指示（例:「続きをお願いします」）で再開可能である旨を伝えて終了する。

 ## 今後の改修方針
  - まずはHTMLからJavaScript、CSSを外出しにする
  - 仕様について詰めていく(決まった仕様は記録すること)
  
  の方針で進めたいです。
  
  上記方針に従って、昨日決めた方針通りに1日の作業を行うこと