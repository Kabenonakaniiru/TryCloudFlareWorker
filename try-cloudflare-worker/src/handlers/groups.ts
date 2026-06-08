import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { groups } from '../schema';

export const groupHandler = {
  /**
   * 1. グループ一覧の取得
   * 画面のドロップダウンや、管理画面のテーブル表示用
   */
  async list(env: Env) {
    const db = getDb(env);
    return await db
      .select({
        id: groups.id,
        slug: groups.slug,
        name: groups.name,
        color: groups.color,
      })
      .from(groups)
      .all();
  },

  /**
   * 2. 新規グループの登録
   * 「🎮 艦これ」「💻 開発」などをカラーコード付きで登録
   */
  async create(env: Env, data: { slug: string; name: string; color?: string }) {
    if (!data.slug || !data.name) {
      throw new Error("Missing required fields: slug, name");
    }

    const db = getDb(env);
    return await db
      .insert(groups)
      .values({
        slug: data.slug.trim().toLowerCase(),
        name: data.name.trim(),
        color: data.color || '#e0e0e0', // デフォルトカラー
      })
      .returning()
      .get();
  },

  /**
   * 3. グループの削除
   * スキーマ側で `onDelete: 'cascade'` を設定しているため、
   * グループを消すと紐づく Rule や Log も連動して自動で綺麗に消えます
   */
  async delete(env: Env, id: number) {
    const db = getDb(env);
    await db
      .delete(groups)
      .where(eq(groups.id, id))
      .run();

    return { success: true };
  }
};