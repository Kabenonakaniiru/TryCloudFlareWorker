import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { groups } from '../schema';
import { validateCategoryInput } from '../utils/validation';

export const groupHandler = {
  /**
   * 1. グループ一覧の取得
   */
  async list(env: Env) {
    const db = getDb(env);
    const data = await db
      .select({
        id: groups.id,
        slug: groups.slug,
        name: groups.name,
        color: groups.color,
      })
      .from(groups)
      .all();
    return Response.json(data);
  },

  /**
   * 2. 新規グループの登録
   */
  async create(request: Request, env: Env) {
    try {
      const rawData = await request.json<any>();
      const data = validateCategoryInput(rawData);

      const db = getDb(env);

      // 件数上限チェック
      const countResult = await db.select({ count: sql`count(*)` }).from(groups).get() as { count: number } | undefined;
      if (countResult && countResult.count >= 20) {
        return Response.json({ error: "Category count limit exceeded (maximum 20)" }, { status: 400 });
      }

      const result = await db
        .insert(groups)
        .values({
          slug: data.slug.toLowerCase(),
          name: data.name,
          color: data.color || '#e0e0e0',
        })
        .returning()
        .get();
      return Response.json(result);
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  },

  /**
   * 3. グループの削除
   */
  async delete(id: number, env: Env) {
    const db = getDb(env);
    await db
      .delete(groups)
      .where(eq(groups.id, id))
      .run();

    return Response.json({ success: true });
  }
};