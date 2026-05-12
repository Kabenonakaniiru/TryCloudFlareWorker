import { taskHandler } from './handlers/tasks';
import { calendarHandler } from './handlers/calendar';
import { categoryHandler } from './handlers/category';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		// --- GET Requests ---
		if (method === 'GET') {
			switch (url.pathname) {
				case '/api/tasks':
					const data = await taskHandler.list(env);
					return Response.json(data);

				case '/api/categories':
					try {
						const categories = await categoryHandler.listCategories(env);
						return Response.json(categories);
					} catch (err: any) {
						return new Response(err.message, { status: 500 });
					}

				case '/api/calendar-test':
					try {
						const events = await calendarHandler.listTodayEvents(env);
						return Response.json(events);
					} catch (err: any) {
						return new Response(err.message, { status: 500 });
					}

				// ページ返却ロジック
				case '/categories':
					// /categories アクセス時に categories.html を返す
					return env.ASSETS
						? await env.ASSETS.fetch(new Request(new URL('/categories.html', url.origin), request))
						: new Response('Not Found', { status: 404 });

				default:
					return env.ASSETS ? await env.ASSETS.fetch(request) : new Response('Not Found', { status: 404 });
			}
		}

		// --- POST Requests ---
		if (method === 'POST') {
			const body = await request.json().catch(() => ({}));

			switch (url.pathname) {
				case '/api/add-task':
					const newTask = await taskHandler.add(env, body);
					return Response.json(newTask, { status: 201 });

				case '/api/delete-task':
					await taskHandler.delete(env, body.id);
					return new Response('OK');

				case '/api/add-category':
					try {
						const newCat = await categoryHandler.createCategory(env, body);
						return Response.json(newCat, { status: 201 });
					} catch (err: any) {
						return new Response(err.message, { status: 500 });
					}

				case '/api/delete-category':
					try {
						await categoryHandler.deleteCategory(env, body.id);
						return new Response('OK');
					} catch (err: any) {
						return new Response(err.message, { status: 500 });
					}
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;