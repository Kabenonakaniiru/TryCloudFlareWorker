import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { tasks, categories } from '../schema';
import { validateTaskInput, validateId } from '../utils/validation';

export const taskHandler = {
  async list(env: Env) {
    const db = getDb(env);
    return await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        start_at: tasks.start_at,
        end_at: tasks.end_at,
        interval: tasks.interval,
        categoryId: tasks.categoryId,
        notes: tasks.notes,
        category: {
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
          color: categories.color,
        },
      })
      .from(tasks)
      .leftJoin(categories, eq(tasks.categoryId, categories.id));
  },

  async create(env: Env, data: any) {
    const validated = validateTaskInput(data);
    const db = getDb(env);
    return await db.insert(tasks).values({
      title: validated.title,
      start_at: validated.start_at,
      end_at: validated.end_at,
      interval: validated.interval,
      categoryId: validated.categoryId,
      notes: validated.notes,
    }).returning().get();
  },

  async delete(env: Env, id: number) {
    const validatedId = validateId(id);
    const db = getDb(env);
    await db.delete(tasks).where(eq(tasks.id, validatedId)).run();
  }
};