import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { tasks, categories } from '../schema';
import { validateTaskInput, validateId } from '../utils/validation';
import { calendarHandler } from './calendar';

// カレンダーへの一括ループ登録を共通関数化
async function syncToGoogleCalendar(env: Env, workerTask: any) {
  let parsedSchedule: any = {};
  if (workerTask.schedule_data) {
    try {
      parsedSchedule = typeof workerTask.schedule_data === 'string'
        ? JSON.parse(workerTask.schedule_data)
        : workerTask.schedule_data;
    } catch (_) {
      parsedSchedule = {};
    }
  }

  if (workerTask.interval === 'daily' && parsedSchedule.start_at) {
    const baseDate = new Date(parsedSchedule.start_at);
    const loops = parsedSchedule.count && parsedSchedule.count > 0 ? parsedSchedule.count : 1;

    for (let i = 0; i < loops; i++) {
      const currentStart = new Date(baseDate.getTime());
      currentStart.setDate(baseDate.getDate() + i);
      const currentEnd = new Date(currentStart.getTime() + 60 * 60 * 1000); // 1時間

      await calendarHandler.createEvent(env, workerTask.id, {
        title: workerTask.title,
        description: workerTask.notes || '連動デイリータスク',
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
      });
    }
  } else if ((workerTask.interval === 'none' || !workerTask.interval) && workerTask.start_at && workerTask.end_at) {
    await calendarHandler.createEvent(env, workerTask.id, {
      title: workerTask.title,
      description: workerTask.notes || '通常タスク',
      startTime: new Date(workerTask.start_at).toISOString(),
      endTime: new Date(workerTask.end_at).toISOString(),
    });
  }
}

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

    const newWorkerTask = await db.insert(tasks).values({
      title: validated.title,
      start_at: validated.start_at,
      end_at: validated.end_at,
      interval: validated.interval,
      categoryId: validated.categoryId,
      notes: validated.notes,
      schedule_data: validated.schedule_data,
    }).returning().get();

    // カレンダーへ同期 (隠し属性 taskId を自動付与)
    try {
      await syncToGoogleCalendar(env, newWorkerTask);
    } catch (err) {
      console.error("Google Calendar Sync Error (Create):", err);
    }

    return newWorkerTask;
  },

  async update(env: Env, id: number, data: any, urlParams?: URLSearchParams) {
    const validatedId = validateId(id);
    const validated = validateTaskInput(data);
    const db = getDb(env);

    // 画面から渡される target パラメータを取得（デフォルトは 'future'）
    const scope = (urlParams?.get('target') === 'all') ? 'all' : 'future';

    // 1. D1データベースを更新
    const updatedWorkerTask = await db.update(tasks).set({
      title: validated.title,
      start_at: validated.start_at,
      end_at: validated.end_at,
      interval: validated.interval,
      categoryId: validated.categoryId,
      notes: validated.notes,
      schedule_data: validated.schedule_data,
    }).where(eq(tasks.id, validatedId)).returning().get();

    // 2. カレンダー側の指定された範囲の予定を一旦削除して再生成
    try {
      await calendarHandler.deleteEventsByTaskId(env, validatedId, scope);
      await syncToGoogleCalendar(env, updatedWorkerTask);
    } catch (err) {
      console.error("Google Calendar Sync Error (Update):", err);
    }

    return updatedWorkerTask;
  },

  async delete(env: Env, id: number, urlParams?: URLSearchParams) {
    const validatedId = validateId(id);
    const db = getDb(env);

    // 画面から渡される target パラメータを取得
    const scope = (urlParams?.get('target') === 'all') ? 'all' : 'future';

    // 1. カレンダー側の指定範囲のイベントを削除
    try {
      await calendarHandler.deleteEventsByTaskId(env, validatedId, scope);
    } catch (err) {
      console.error("Google Calendar Sync Error (Delete):", err);
    }

    // 2. D1からタスクを削除
    await db.delete(tasks).where(eq(tasks.id, validatedId)).run();
  }
};