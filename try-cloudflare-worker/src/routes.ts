import { taskHandler } from './handlers/tasks';
import { calendarHandler } from './handlers/calendar';
import { categoryHandler } from './handlers/category';

export interface RouteParams {
  env: Env;
  body?: any;
  params?: Record<string, string>;
}

type RouteHandler = (options: RouteParams) => Promise<any>;

interface Route {
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  handler: RouteHandler;
  parseBody?: boolean;
}

export const routes: Route[] = [
  // Task routes
  {
    path: '/api/tasks',
    method: 'GET',
    handler: ({ env }) => taskHandler.list(env),
  },
  {
    path: '/api/tasks',
    method: 'POST',
    handler: ({ env, body }) => taskHandler.create(env, body),
    parseBody: true,
  },
  {
    path: '/api/tasks/:id',
    method: 'DELETE',
    handler: ({ env, params }) => taskHandler.delete(env, Number(params?.id)),
  },

  // Category routes
  {
    path: '/api/categories',
    method: 'GET',
    handler: ({ env }) => categoryHandler.list(env),
  },
  {
    path: '/api/categories',
    method: 'POST',
    handler: ({ env, body }) => categoryHandler.create(env, body),
    parseBody: true,
  },
  {
    path: '/api/categories/:id',
    method: 'DELETE',
    handler: ({ env, params }) => categoryHandler.delete(env, Number(params?.id)),
  },

  // Calendar routes
  {
    path: '/api/calendar-test',
    method: 'GET',
    handler: ({ env }) => calendarHandler.listTodayEvents(env),
  },
];

/**
 * ルートマッチングと パラメータ抽出
 */
export function findRoute(
  pathname: string,
  method: string
): { route: Route; params: Record<string, string> } | undefined {
  // 完全一致を優先
  const exactRoute = routes.find(
    (route) => route.method === method && route.path === pathname
  );
  if (exactRoute) {
    return { route: exactRoute, params: {} };
  }

  // パターンマッチ
  for (const route of routes) {
    if (route.method !== method) continue;

    const params = matchRoutePath(route.path, pathname);
    if (params) {
      return { route, params };
    }
  }

  return undefined;
}

/**
 * パスパターンマッチ（:id など）
 * マッチ時はパラメータを返す、不一致時は null を返す
 */
function matchRoutePath(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];

    if (part.startsWith(':')) {
      // パラメータを抽出
      const paramName = part.slice(1);
      params[paramName] = pathParts[i];
    } else if (part !== pathParts[i]) {
      // 固定部分が一致しない
      return null;
    }
  }

  return params;
}

/**
 * ページルート（GET のみ）
 */
export const pageRoutes: Record<string, string> = {
  '/categories': '/categories.html',
  '/tasks': '/tasks.html',
  '/calendar': '/calendar.html',
};
