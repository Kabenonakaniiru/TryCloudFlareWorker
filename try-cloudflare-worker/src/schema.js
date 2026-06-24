import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
// 1. 最上位の分類（フラット管理、絵文字などをプレフィックスにする想定）
export const groups = sqliteTable('groups', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(), // URLやAPIで扱う識別子
    name: text('name').notNull(), // 画面に表示する名前 (例: "🎮 艦これ")
    color: text('color'), // カレンダーバッジ用のカラーコード (例: "#0070f3")
    createdAt: text('created_at').default(new Date().toISOString()),
});
// 2. 発生周期やカレンダーへの挙動を決める大元のルール（旧タスクマスタ）
export const rules = sqliteTable('rules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(), // 日課の名前 (例: "南西諸島海域クリア")
    interval: text('interval').notNull().default('daily'), // daily, weekly, period, none
    periodStyle: text('period_style'), // routine(期間中毎日), single(期間中1回のみ)
    startAt: text('start_at'), // 期間指定の場合の開始日 (YYYY-MM-DD)
    endAt: text('end_at'), // 期間指定の場合の終了日 (YYYY-MM-DD)
    resetTime: text('reset_time').notNull().default('04:00'), // バッファ用の日付切り替え時間
    missedBehavior: text('missed_behavior').notNull().default('delete'), // delete(モードA) / slide(モードB)
    notes: text('notes'), // 画面に表示するちょっとしたメモ・備考
    scheduleData: text('schedule_data'), // 拡張用の予備JSONフィールド
    createdAt: text('created_at').default(new Date().toISOString()),
});
export const logs = sqliteTable('logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ruleId: integer('rule_id').references(() => rules.id, { onDelete: 'cascade' }),
    targetDate: text('target_date').notNull(), // 対象日 (YYYY-MM-DD)
    status: text('status').$type().notNull().default('pending'), // pending, completed, missed
    calendarEventId: text('calendar_event_id'), // GoogleカレンダーのイベントID（書き換え用）
    updatedAt: text('updated_at').default(new Date().toISOString()),
});
