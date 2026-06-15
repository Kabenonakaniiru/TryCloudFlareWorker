import { groupHandler } from './handlers/groups';
import { ruleHandler } from './handlers/rules';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --- Group API ---
  if (path === '/api/groups') {
    if (method === 'GET') return groupHandler.list(env);
    if (method === 'POST') return groupHandler.create(request, env);
  }
  if (path.startsWith('/api/groups/') && method === 'DELETE') {
    const id = parseInt(path.split('/')[3]);
    return groupHandler.delete(id, env);
  }

  // --- Rule API ---
  if (path === '/api/rules') {
    if (method === 'GET') return ruleHandler.list(env);
    if (method === 'POST') return ruleHandler.create(request, env);
  }
  if (path.startsWith('/api/rules/')) {
    const id = parseInt(path.split('/')[3]);
    if (method === 'PUT') return ruleHandler.update(id, request, env);
    if (method === 'DELETE') return ruleHandler.delete(id, env);
  }

  // --- Log API ---
  if (path === '/api/logs/today' && method === 'GET') {
    return ruleHandler.listTodayLogs(env);
  }
  if (path.match(/\/api\/logs\/\d+\/status/) && method === 'PUT') {
    const id = parseInt(path.split('/')[3]);
    return ruleHandler.updateLogStatus(id, request, env);
  }

  // --- Admin API ---
  if (path === '/api/admin/data' && method === 'GET') {
    return ruleHandler.getAdminData(env);
  }
  if (path === '/api/logs/generate' && method === 'POST') {
    return ruleHandler.generateLogs(env);
  }

  return new Response('Not Found', { status: 404 });
}