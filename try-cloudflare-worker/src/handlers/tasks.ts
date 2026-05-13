import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { tasks } from '../schema';
import { validateTaskInput, validateId } from '../utils/validation';

export const taskHandler = {
  async list(env: Env) {
    const db = getDb(env);
    return await db.select().from(tasks);
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