import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { users, tasks } from './schema'; // tasksを追加

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const db = getDb(env);

		// 1. GETリクエストの処理
		if (request.method === 'GET') {
			switch (url.pathname) {
				case '/message':
					return new Response('Hello, World!');
				case '/db':
					const allUsers = await db.select().from(users);
					return new Response(JSON.stringify(allUsers, null, 2), {
						headers: { 'Content-Type': 'application/json' }
					});
				// --- ここを追加 ---
				case '/api/tasks':
					const allTasks = await db.select().from(tasks);
					return new Response(JSON.stringify(allTasks), {
						headers: { 'Content-Type': 'application/json' }
					});
				// ------------------
				case '/random':
					return new Response(crypto.randomUUID());
				default:
					// 静的アセット（HTML/CSS）がある場合はそれを返し、なければ404
					return env.ASSETS ? await env.ASSETS.fetch(request) : new Response('Not Found', { status: 404 });
			}
		}

		// 2. POSTリクエストの処理
		if (request.method === 'POST') {
			// 既存のadd-user
			if (url.pathname === '/add-user') {
				try {
					const body = await request.json() as { name: string };
					const insertedUser = await db.insert(users).values({ name: body.name }).returning();
					return new Response(JSON.stringify(insertedUser), {
						status: 201,
						headers: { 'Content-Type': 'application/json' }
					});
				} catch (err) {
					return new Response('Error', { status: 400 });
				}
			}

			if (url.pathname === '/api/add-task') {
				try {
					const body = await request.json() as any;
					const insertedTask = await db.insert(tasks).values({
						title: body.title,
						start_at: body.start_at,
						end_at: body.end_at,
						interval: body.interval,
					}).returning();
					return new Response(JSON.stringify(insertedTask), {
						status: 201,
						headers: { 'Content-Type': 'application/json' }
					});
				} catch (err) {
					return new Response('Database Error', { status: 400 });
				}
			}

			if (url.pathname === '/api/delete-task') {
				try {
					const { id } = await request.json() as { id: number };
					const db = getDb(env);

					// Drizzle ORM で該当IDのタスクを削除
					await db.delete(tasks).where(eq(tasks.id, id));

					return new Response('Deleted', { status: 200 });
				} catch (err) {
					return new Response('Delete Error', { status: 400 });
				}
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;