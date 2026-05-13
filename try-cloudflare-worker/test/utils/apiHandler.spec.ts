import { describe, it, expect } from 'vitest';
import { apiResponse, apiError } from '../../src/utils/apiHandler';

describe('apiHandler utils', () => {
  describe('apiResponse', () => {
    it('should return JSON response with data', async () => {
      const data = { id: 1, title: 'Test' };
      const response = apiResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toEqual(data);
    });

    it('should return response with custom status', async () => {
      const data = { id: 1 };
      const response = apiResponse(data, 201);

      expect(response.status).toBe(201);
    });

    it('should handle null data', async () => {
      const response = apiResponse(null);
      expect(response.status).toBe(200);
      expect(await response.json()).toBeNull();
    });

    it('should handle array data', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = apiResponse(data);

      expect(await response.json()).toEqual(data);
    });

    it('should default status to 200', async () => {
      const response = apiResponse({ test: true });
      expect(response.status).toBe(200);
    });
  });

  describe('apiError', () => {
    it('should return error response with message', async () => {
      const response = apiError('Something went wrong');

      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toContain('application/json');
      const body = await response.json();
      expect(body.error).toBe('Something went wrong');
    });

    it('should return error with custom status', async () => {
      const response = apiError('Not found', 404);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Not found');
    });

    it('should return 400 for validation error', async () => {
      const response = apiError('Invalid input', 400);
      expect(response.status).toBe(400);
    });

    it('should default status to 500', async () => {
      const response = apiError('Server error');
      expect(response.status).toBe(500);
    });

    it('should have error property in JSON', async () => {
      const response = apiError('Test error');
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });
  });
});
