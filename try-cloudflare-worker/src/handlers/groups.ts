import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { groups } from '../schema';

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
    const data = await request.json<{ slug: string; name: string; color?: string }>();
    if (!data.slug || !data.name) {
      return Response.json({ error: "Missing required fields: slug, name" }, { status: 400 });
    }

    const db = getDb(env);
    const result = await db
      .insert(groups)
      .values({
        slug: data.slug.trim().toLowerCase(),
        name: data.name.trim(),
        color: data.color || '#e0e0e0',
      })
      .returning()
      .get();
    return Response.json(result);
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