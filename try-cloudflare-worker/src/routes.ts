import { groupHandler } from './handlers/groups';
import { ruleHandler } from './handlers/rules';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --- Group API ---
  if (path === '/api/groups' && method === 'GET') {
    return Response.json(await groupHandler.list(env));
  }
  if (path === '/api/groups' && method === 'POST') {
    return Response.json(await groupHandler.create(env, await request.json()));
  }
  if (path.startsWith('/api/groups/') && method === 'DELETE') {
    const id = parseInt(path.split('/')[3]);
    return Response.json(await groupHandler.delete(env, id));
  }

  // --- Rule API ---
  if (path === '/api/rules' && method === 'GET') {
    return Response.json(await ruleHandler.list(env));
  }
  if (path === '/api/rules' && method === 'POST') {
    return Response.json(await ruleHandler.create(env, await request.json()));
  }
  if (path.startsWith('/api/rules/') && method === 'PUT') {
    const id = parseInt(path.split('/')[3]);
    return Response.json(await ruleHandler.update(env, id, await request.json()));
  }
  if (path.startsWith('/api/rules/') && method === 'DELETE') {
    const id = parseInt(path.split('/')[3]);
    return Response.json(await ruleHandler.delete(env, id));
  }

  // --- Log API ---
  if (path === '/api/logs/today' && method === 'GET') {
    return Response.json(await ruleHandler.listTodayLogs(env));
  }
  if (path.match(/\/api\/logs\/\d+\/status/) && method === 'PUT') {
    const id = parseInt(path.split('/')[3]);
    const { status } = await request.json();
    return Response.json(await ruleHandler.updateLogStatus(env, id, status));
  }

  return new Response('Not Found', { status: 404 });
}