/**
 * カテゴリ作成時のバリデーション
 */
export function validateCategoryInput(data: any): {
  slug: string;
  name: string;
  color?: string;
} {
  if (!data.slug || typeof data.slug !== 'string' || data.slug.trim() === '') {
    throw new Error('slug is required and must be a non-empty string');
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    throw new Error('name is required and must be a non-empty string');
  }
  if (data.color && typeof data.color !== 'string') {
    throw new Error('color must be a string');
  }

  return {
    slug: data.slug.trim(),
    name: data.name.trim(),
    color: data.color ? data.color.trim() : undefined,
  };
}

/**
 * タスク作成時のバリデーション
 */
export function validateTaskInput(data: any): {
  title: string;
  start_at?: string;
  end_at?: string;
  interval?: string;
  categoryId?: number;
  notes?: string;
} {
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    throw new Error('title is required and must be a non-empty string');
  }

  return {
    title: data.title.trim(),
    start_at: data.start_at ? String(data.start_at) : undefined,
    end_at: data.end_at ? String(data.end_at) : undefined,
    interval: data.interval ? String(data.interval) : undefined,
    categoryId: data.categoryId ? Number(data.categoryId) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
  };
}

/**
 * ID のバリデーション
 */
export function validateId(id: any): number {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('id must be a positive integer');
  }
  return parsed;
}
