import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// 追加：タスク管理用のテーブル
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  status: text('status').default('todo'),
  // 追加項目
  start_at: text('start_at'),    // 開始日時
  end_at: text('end_at'),      // 終了日時
  interval: text('interval'),    // 繰り返し (daily, weekly, monthly, none)
  notes: text('notes'),          // メモ（任意）
});