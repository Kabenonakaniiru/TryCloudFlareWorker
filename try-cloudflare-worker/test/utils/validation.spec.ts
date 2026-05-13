import { describe, it, expect } from 'vitest';
import {
  validateCategoryInput,
  validateTaskInput,
  validateId,
} from '../../src/utils/validation';

describe('validation utils', () => {
  describe('validateCategoryInput', () => {
    it('should validate valid category input', () => {
      const result = validateCategoryInput({
        slug: 'test-category',
        name: 'Test Category',
        color: '#ff0000',
      });

      expect(result).toEqual({
        slug: 'test-category',
        name: 'Test Category',
        color: '#ff0000',
      });
    });

    it('should trim whitespace', () => {
      const result = validateCategoryInput({
        slug: '  test-slug  ',
        name: '  Test Name  ',
      });

      expect(result.slug).toBe('test-slug');
      expect(result.name).toBe('Test Name');
    });

    it('should throw error when slug is missing', () => {
      expect(() =>
        validateCategoryInput({ name: 'Test' })
      ).toThrow('slug is required');
    });

    it('should throw error when name is missing', () => {
      expect(() =>
        validateCategoryInput({ slug: 'test' })
      ).toThrow('name is required');
    });

    it('should throw error when slug is empty string', () => {
      expect(() =>
        validateCategoryInput({ slug: '   ', name: 'Test' })
      ).toThrow('slug is required');
    });

    it('should use default color if not provided', () => {
      const result = validateCategoryInput({
        slug: 'test',
        name: 'Test',
      });

      expect(result.color).toBeUndefined();
    });
  });

  describe('validateTaskInput', () => {
    it('should validate valid task input', () => {
      const result = validateTaskInput({
        title: 'Test Task',
        start_at: '2026-05-14T10:00:00',
        end_at: '2026-05-14T11:00:00',
      });

      expect(result.title).toBe('Test Task');
      expect(result.start_at).toBe('2026-05-14T10:00:00');
    });

    it('should throw error when title is missing', () => {
      expect(() => validateTaskInput({})).toThrow(
        'title is required'
      );
    });

    it('should throw error when title is empty string', () => {
      expect(() => validateTaskInput({ title: '   ' })).toThrow(
        'title is required'
      );
    });

    it('should convert optional fields to string', () => {
      const result = validateTaskInput({
        title: 'Test',
        categoryId: 1,
        notes: 'Some notes',
      });

      expect(result.categoryId).toBe(1);
      expect(result.notes).toBe('Some notes');
    });

    it('should handle missing optional fields', () => {
      const result = validateTaskInput({ title: 'Test' });

      expect(result.start_at).toBeUndefined();
      expect(result.end_at).toBeUndefined();
      expect(result.categoryId).toBeUndefined();
    });
  });

  describe('validateId', () => {
    it('should validate positive integer', () => {
      expect(validateId(1)).toBe(1);
      expect(validateId(999)).toBe(999);
    });

    it('should throw error for zero', () => {
      expect(() => validateId(0)).toThrow('id must be a positive integer');
    });

    it('should throw error for negative number', () => {
      expect(() => validateId(-1)).toThrow('id must be a positive integer');
    });

    it('should throw error for non-integer', () => {
      expect(() => validateId(1.5)).toThrow('id must be a positive integer');
    });

    it('should convert string to number', () => {
      expect(validateId('123')).toBe(123);
    });

    it('should throw error for invalid string', () => {
      expect(() => validateId('abc')).toThrow('id must be a positive integer');
    });
  });
});
