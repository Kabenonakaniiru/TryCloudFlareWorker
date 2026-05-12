import { drizzle } from 'drizzle-orm/d1';
import { categories } from '../schema';
import { asc, eq } from 'drizzle-orm';

export const categoryHandler = {
  /**
   * カテゴリ一覧を取得
   */
  async listCategories(env: Env) {
    // wrangler.tomlのbinding名に合わせて env.my_db1 を使用
    const db = drizzle(env.my_db1);
    try {
      return await db
        .select()
        .from(categories)
        .orderBy(asc(categories.id))
        .all();
    } catch (error) {
      console.error("Drizzle Error (listCategories):", error);
      throw new Error("Failed to fetch categories from D1");
    }
  },

  /**
   * 新規カテゴリを作成
   */
  async createCategory(env: Env, data: { slug: string; name: string; color?: string }) {
    const db = drizzle(env.my_db1);
    try {
      // D1 + Drizzle で挿入し、作成されたレコードを返す
      const result = await db.insert(categories).values({
        slug: data.slug,
        name: data.name,
        color: data.color || '#3b82f6',
      }).returning().get();

      return result;
    } catch (error) {
      console.error("Drizzle Error (createCategory):", error);
      throw new Error("Failed to create category");
    }
  },

  /**
   * カテゴリを削除
   */
  async deleteCategory(env: Env, id: number) {
    const db = drizzle(env.my_db1);
    try {
      await db
        .delete(categories)
        .where(eq(categories.id, id))
        .run();
    } catch (error) {
      console.error("Drizzle Error (deleteCategory):", error);
      throw new Error("Failed to delete category");
    }
  }
};