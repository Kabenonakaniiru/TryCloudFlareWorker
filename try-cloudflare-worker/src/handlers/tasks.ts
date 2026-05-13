import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { tasks } from '../schema';

export const taskHandler = {
  // 一覧取得
  async list(env: Env) {
    try {
      const db = getDb(env);
      return await db.select().from(tasks);
    } catch (error) {
      console.error("Drizzle Error (listTasks):", error);
      throw new Error("Failed to fetch tasks from D1");
    }
  },

  // 追加
  async add(env: Env, data: any) {
    try {
      const db = getDb(env);
      const result = await db.insert(tasks).values({
        title: data.title,
        start_at: data.start_at,
        end_at: data.end_at,
        interval: data.interval,
      }).returning().get();
      return result;
    } catch (error) {
      console.error("Drizzle Error (addTask):", error);
      throw new Error("Failed to create task");
    }
  },

  // 削除
  async delete(env: Env, id: number) {
    try {
      const db = getDb(env);
      await db.delete(tasks).where(eq(tasks.id, id)).run();
    } catch (error) {
      console.error("Drizzle Error (deleteTask):", error);
      throw new Error("Failed to delete task");
    }
  }
};