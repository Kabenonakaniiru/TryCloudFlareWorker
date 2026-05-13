import { categories } from '../schema';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { validateCategoryInput, validateId } from '../utils/validation';

export const categoryHandler = {
  async list(env: Env) {
    const db = getDb(env);
    return await db
      .select()
      .from(categories)
      .orderBy(asc(categories.id))
      .all();
  },

  async create(env: Env, data: any) {
    const validated = validateCategoryInput(data);
    const db = getDb(env);
    const result = await db.insert(categories).values({
      slug: validated.slug,
      name: validated.name,
      color: validated.color || '#3b82f6',
    }).returning().get();
    return result;
  },

  async delete(env: Env, id: number) {
    const validatedId = validateId(id);
    const db = getDb(env);
    await db
      .delete(categories)
      .where(eq(categories.id, validatedId))
      .run();
  }
};