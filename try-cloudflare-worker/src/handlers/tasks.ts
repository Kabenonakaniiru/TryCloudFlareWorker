import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { tasks } from '../schema';

export const taskHandler = {
  // 一覧取得
  async list(env: Env) {
    const db = getDb(env);
    return await db.select().from(tasks);
  },

  // 追加
  async add(env: Env, data: any) {
    const db = getDb(env);
    return await db.insert(tasks).values({
      title: data.title,
      start_at: data.start_at,
      end_at: data.end_at,
      interval: data.interval,
    }).returning();
  },

  // 削除
  async delete(env: Env, id: number) {
    const db = getDb(env);
    return await db.delete(tasks).where(eq(tasks.id, id));
  }
};