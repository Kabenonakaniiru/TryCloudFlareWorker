import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// 新設：カテゴリ管理用のテーブル
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),      // プログラム識別用 (e.g. 'kancolle')
  name: text('name').notNull(),                // 表示名 (e.g. '艦これ')
  color: text('color').default('#3b82f6'),    // カレンダー/UI用カラーコード
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 更新：タスク管理用のテーブル
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  status: text('status').default('todo'),
  // 日時関連
  start_at: text('start_at'),
  end_at: text('end_at'),
  interval: text('interval'),
  // 追加：カテゴリとの紐付け
  categoryId: integer('category_id').references(() => categories.id),
  notes: text('notes'),
  schedule_data: text('schedule_data'),
});