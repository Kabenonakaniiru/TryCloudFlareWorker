import { taskHandler } from './handlers/tasks';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		// --- GET Requests ---
		if (method === 'GET') {
			switch (url.pathname) {
				case '/api/tasks':
					const data = await taskHandler.list(env);
					return Response.json(data);

				// ページ返却ロジック
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
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;