import { groupHandler } from './handlers/groups';
import { ruleHandler } from './handlers/rules';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // --- Group API ---
    if (path === '/api/groups') {
      if (method === 'GET') return await groupHandler.list(env);
      if (method === 'POST') return await groupHandler.create(request, env);
    }
    if (path.startsWith('/api/groups/') && method === 'DELETE') {
      const id = parseInt(path.split('/')[3]);
      return await groupHandler.delete(id, env);
    }

    // --- Rule API ---
    if (path === '/api/rules') {
      if (method === 'GET') return await ruleHandler.list(env);
      if (method === 'POST') return await ruleHandler.create(request, env);
    }
    if (path.startsWith('/api/rules/')) {
      const id = parseInt(path.split('/')[3]);
      if (method === 'PUT') return await ruleHandler.update(id, request, env);
      if (method === 'DELETE') return await ruleHandler.delete(id, env);
    }

    // --- Log API ---
    if (path === '/api/logs/today' && method === 'GET') {
      return await ruleHandler.listTodayLogs(env);
    }
    if (path.match(/\/api\/logs\/\d+\/status/) && method === 'PUT') {
      const id = parseInt(path.split('/')[3]);
      return await ruleHandler.updateLogStatus(id, request, env);
    }

    // --- Admin API ---
    if (path === '/api/admin/data' && method === 'GET') {
      return await ruleHandler.getAdminData(env);
    }
    if (path === '/api/logs/generate' && method === 'POST') {
      return await ruleHandler.generateLogs(env);
    }

    return new Response('Not Found', { status: 404 });
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON: " + err.message }, { status: 400 });
    }
    if (err.name === 'ValidationError') {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}