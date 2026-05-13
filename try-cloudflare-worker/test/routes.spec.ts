import { describe, it, expect } from 'vitest';
import { findRoute, routes, pageRoutes } from '../src/routes';

describe('routes - path matching and resolution', () => {
  describe('findRoute - exact matches', () => {
    it('should find exact GET /api/tasks', () => {
      const result = findRoute('/api/tasks', 'GET');
      expect(result).toBeDefined();
      expect(result?.route.method).toBe('GET');
      expect(result?.params).toEqual({});
    });

    it('should find exact POST /api/tasks', () => {
      const result = findRoute('/api/tasks', 'POST');
      expect(result).toBeDefined();
      expect(result?.route.method).toBe('POST');
      expect(result?.params).toEqual({});
    });

    it('should find exact GET /api/categories', () => {
      const result = findRoute('/api/categories', 'GET');
      expect(result).toBeDefined();
      expect(result?.route.method).toBe('GET');
    });
  });

  describe('findRoute - path parameters', () => {
    it('should extract :id parameter from /api/tasks/:id', () => {
      const result = findRoute('/api/tasks/123', 'DELETE');
      expect(result).toBeDefined();
      expect(result?.params.id).toBe('123');
    });

    it('should extract :id from /api/categories/:id', () => {
      const result = findRoute('/api/categories/456', 'DELETE');
      expect(result).toBeDefined();
      expect(result?.params.id).toBe('456');
    });

    it('should match different numeric IDs', () => {
      const result1 = findRoute('/api/tasks/1', 'DELETE');
      const result2 = findRoute('/api/tasks/999', 'DELETE');
      expect(result1?.params.id).toBe('1');
      expect(result2?.params.id).toBe('999');
    });

    it('should match string-like IDs', () => {
      const result = findRoute('/api/tasks/abc123', 'DELETE');
      expect(result).toBeDefined();
      expect(result?.params.id).toBe('abc123');
    });
  });

  describe('findRoute - mismatches', () => {
    it('should return undefined for non-existent route', () => {
      const result = findRoute('/api/nonexistent', 'GET');
      expect(result).toBeUndefined();
    });

    it('should return undefined for unsupported method', () => {
      const result = findRoute('/api/tasks', 'PUT');
      expect(result).toBeUndefined();
    });

    it('should return undefined for wrong path depth', () => {
      const result = findRoute('/api/tasks/123/extra', 'DELETE');
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid method on valid path', () => {
      const result = findRoute('/api/tasks/123', 'GET');
      expect(result).toBeUndefined();
    });
  });

  describe('routes configuration', () => {
    it('should have POST routes with parseBody=true', () => {
      const postRoutes = routes.filter((r) => r.method === 'POST');
      postRoutes.forEach((route) => {
        expect(route.parseBody).toBe(true);
      });
    });

    it('should have GET and DELETE routes without parseBody', () => {
      const nonPostRoutes = routes.filter((r) => r.method !== 'POST');
      nonPostRoutes.forEach((route) => {
        expect(route.parseBody).toBeUndefined();
      });
    });

    it('should have handler for every route', () => {
      routes.forEach((route) => {
        expect(route.handler).toBeDefined();
        expect(typeof route.handler).toBe('function');
      });
    });

    it('should include task routes', () => {
      const taskRoutes = routes.filter((r) =>
        r.path.includes('/api/tasks')
      );
      expect(taskRoutes.length).toBeGreaterThanOrEqual(3);
    });

    it('should include category routes', () => {
      const categoryRoutes = routes.filter((r) =>
        r.path.includes('/api/categories')
      );
      expect(categoryRoutes.length).toBeGreaterThanOrEqual(3);
    });

    it('should include calendar route', () => {
      const calendarRoute = routes.find((r) =>
        r.path.includes('/api/calendar-test')
      );
      expect(calendarRoute).toBeDefined();
    });
  });

  describe('pageRoutes', () => {
    it('should map /categories to categories.html', () => {
      expect(pageRoutes['/categories']).toBe('/categories.html');
    });

    it('should map /tasks to tasks.html', () => {
      expect(pageRoutes['/tasks']).toBe('/tasks.html');
    });

    it('should map /calendar to calendar.html', () => {
      expect(pageRoutes['/calendar']).toBe('/calendar.html');
    });
  });
});
