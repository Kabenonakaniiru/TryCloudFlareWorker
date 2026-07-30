import { describe, it, expect } from 'vitest';
import { ruleHandler } from '../src/handlers/rules';
import { groupHandler } from '../src/handlers/groups';

describe('handlers', () => {
  describe('groupHandler', () => {
    it('should return 400 when creating group without slug or name', async () => {
      const mockRequest = new Request('http://example.com/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // missing slug
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await groupHandler.create(mockRequest, {} as Env);
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error).toContain('Missing required fields');
    });

    it('should fail with DB error when listing groups (due to no tables)', async () => {
      await expect(groupHandler.list({} as Env)).rejects.toThrow();
    });
  });

  describe('ruleHandler', () => {
    it('should fail with DB error when listing rules (due to no tables)', async () => {
      await expect(ruleHandler.list({} as Env)).rejects.toThrow();
    });

    it('should fail with DB error when creating rule (due to no tables)', async () => {
      const mockRequest = new Request('http://example.com/api/rules', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Rule', groupId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });
      await expect(ruleHandler.create(mockRequest, {} as Env)).rejects.toThrow();
    });
    it('should fail with DB error when listing today logs (due to no tables)', async () => {
      await expect(ruleHandler.listTodayLogs({} as Env)).rejects.toThrow();
    });
  });
});
