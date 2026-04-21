/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { getDb } from './db';
import { users } from './schema';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		// 1. GETリクエストの処理（既存）
		if (request.method === 'GET') {
			switch (url.pathname) {
				case '/message':
					return new Response('Hello, World!');
				case '/message2':
					return new Response('この沼、深い');
				case '/db':
					// Drizzle ORM で users テーブルのすべての行を取得
					const db = getDb(env);
					const allUsers = await db.select().from(users);
					return new Response(JSON.stringify(allUsers, null, 2), {
						headers: { 'Content-Type': 'application/json' }
					});
				case '/random':
					return new Response(crypto.randomUUID());
				default:
					return new Response('Not Found', { status: 404 });
			}
		}

		// 2. POSTリクエストの処理（新規追加）
		if (request.method === 'POST' && url.pathname === '/add-user') {
			try {
				const body = await request.json() as { name: string };
				const db = getDb(env);

				// データベースに挿入
				// .returning() をつけると挿入されたデータ（IDなど）を返してくれます
				const insertedUser = await db.insert(users).values({
					name: body.name
				}).returning();

				return new Response(JSON.stringify(insertedUser), {
					status: 201,
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (err) {
				return new Response('Invalid JSON or Database Error', { status: 400 });
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
