import { routes, findRoute, pageRoutes } from './routes';
import { apiResponse, apiError } from './utils/apiHandler';

async function serveAsset(env: Env, request: Request, path: string) {
  const url = new URL(request.url);
  return env.ASSETS
    ? await env.ASSETS.fetch(new Request(new URL(path, url.origin), request))
    : apiError('Not Found', 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // API ルート処理
    const matched = findRoute(url.pathname, method);
    if (matched) {
      try {
        let body: any = undefined;
        if (matched.route.parseBody) {
          try {
            body = await request.json();
          } catch {
            return apiError('Invalid JSON', 400);
          }
        }

        const result = await matched.route.handler({
          env,
          body,
          params: matched.params,
        });

        // DELETE は 204 No Content、POST は 201 Created、GET は 200 OK
        let status = 200;
        if (method === 'POST') status = 201;
        if (method === 'DELETE') status = 204;

        // 204 No Content の場合はボディなし
        if (status === 204) {
          return new Response(null, { status });
        }

        return apiResponse(result, status);
      } catch (error: any) {
        console.error(`Route error [${method} ${url.pathname}]:`, error);
        return apiError(error.message, 500);
      }
    }

    // ページルート処理
    if (method === 'GET') {
      const pageFile = pageRoutes[url.pathname];
      if (pageFile) {
        return await serveAsset(env, request, pageFile);
      }

      // デフォルト: /public 配下のアセット
      return await serveAsset(env, request, url.pathname);
    }

    return apiError('Not Found', 404);
  },
} satisfies ExportedHandler<Env>;