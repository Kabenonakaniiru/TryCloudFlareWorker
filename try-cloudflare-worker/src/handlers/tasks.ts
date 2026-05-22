import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { tasks, categories } from '../schema';
import { validateTaskInput, validateId } from '../utils/validation';
import { calendarHandler } from './calendar';

export const taskHandler = {
  async list(env: Env) {
    const db = getDb(env);
    return await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        start_at: tasks.start_at,
        end_at: tasks.end_at,
        interval: tasks.interval,
        categoryId: tasks.categoryId,
        notes: tasks.notes,
        schedule_data: tasks.schedule_data,
        category: {
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
          color: categories.color,
        },
      })
      .from(tasks)
      .leftJoin(categories, eq(tasks.categoryId, categories.id));
  },

  async create(env: Env, data: any) {
    const validated = validateTaskInput(data);
    const db = getDb(env);

    // 1. まずベースとなるタスク情報を D1 に登録
    const newWorkerTask = await db.insert(tasks).values({
      title: validated.title,
      start_at: validated.start_at,
      end_at: validated.end_at,
      interval: validated.interval,
      categoryId: validated.categoryId,
      notes: validated.notes,
      schedule_data: validated.schedule_data,
    }).returning().get();

    // 2. Google カレンダーへの同期処理
    try {
      let parsedSchedule: any = {};
      if (newWorkerTask.schedule_data) {
        try {
          parsedSchedule = typeof newWorkerTask.schedule_data === 'string'
            ? JSON.parse(newWorkerTask.schedule_data)
            : newWorkerTask.schedule_data;
        } catch (_) {
          parsedSchedule = {};
        }
      }

      // --- [日次タスクの一括・複数日生成ロジック] ---
      if (newWorkerTask.interval === 'daily' && parsedSchedule.start_at) {
        const baseDate = new Date(parsedSchedule.start_at);
        const loops = parsedSchedule.count && parsedSchedule.count > 0 ? parsedSchedule.count : 1;

        for (let i = 0; i < loops; i++) {
          // ループごとに日付を 1日 ずつずらす
          const currentStart = new Date(baseDate.getTime());
          currentStart.setDate(baseDate.getDate() + i);

          const currentEnd = new Date(currentStart.getTime() + 60 * 60 * 1000); // デフォルト1時間

          // 余計な文字は入れず、入力されたタイトルそのままで予定を追加
          await calendarHandler.createEvent(env, {
            title: newWorkerTask.title,
            description: newWorkerTask.notes || '連動デイリータスク',
            startTime: currentStart.toISOString(),
            endTime: currentEnd.toISOString(),
          });
        }
      }
      // --- [その他のスケジュール形式（通常や期間指定）] ---
      else if (newWorkerTask.interval === 'period' && parsedSchedule.start_at && parsedSchedule.end_at) {
        await calendarHandler.createEvent(env, {
          title: newWorkerTask.title,
          description: newWorkerTask.notes || '期間指定イベント',
          startTime: new Date(parsedSchedule.start_at).toISOString(),
          endTime: new Date(parsedSchedule.end_at).toISOString(),
        });
      } else if ((newWorkerTask.interval === 'none' || !newWorkerTask.interval) && newWorkerTask.start_at && newWorkerTask.end_at) {
        await calendarHandler.createEvent(env, {
          title: newWorkerTask.title,
          description: newWorkerTask.notes || '通常タスク',
          startTime: new Date(newWorkerTask.start_at).toISOString(),
          endTime: new Date(newWorkerTask.end_at).toISOString(),
        });
      }

    } catch (calendarError) {
      console.error("Google Calendar Sync Error (Create):", calendarError);
    }

    return newWorkerTask;
  },

  async update(env: Env, id: number, data: any) {
    const validatedId = validateId(id);
    const validated = validateTaskInput(data);
    const db = getDb(env);

    await db.update(tasks).set({
      title: validated.title,
      start_at: validated.start_at,
      end_at: validated.end_at,
      interval: validated.interval,
      categoryId: validated.categoryId,
      notes: validated.notes,
      schedule_data: validated.schedule_data,
    }).where(eq(tasks.id, validatedId)).run();
  },

  async delete(env: Env, id: number) {
    const validatedId = validateId(id);
    const db = getDb(env);
    await db.delete(tasks).where(eq(tasks.id, validatedId)).run();
  }
};