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

    // 1. D1 にタスクを登録
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
      let startTime: string | null = null;
      let endTime: string | null = null;

      // schedule_data が存在する場合はパースを試みる
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

      // スケジュール種別ごとに日時の抽出ロジックを切り分け
      if (newWorkerTask.interval === 'period') {
        // 期間指定の場合 (YYYY-MM-DD 形式)
        if (parsedSchedule.start_at && parsedSchedule.end_at) {
          startTime = new Date(parsedSchedule.start_at).toISOString();
          // カレンダーの終日・期間終了に合わせるため、日付のパースを設定
          endTime = new Date(parsedSchedule.end_at).toISOString();
        }
      } else if (newWorkerTask.interval === 'daily') {
        // 日次の開始指定がある場合
        if (parsedSchedule.start_at) {
          const start = new Date(parsedSchedule.start_at);
          startTime = start.toISOString();
          endTime = new Date(start.getTime() + 60 * 60 * 1000).toISOString(); // デフォルト1時間
        }
      } else if (newWorkerTask.interval === 'none' || !newWorkerTask.interval) {
        // 通常タスク（直下に日時があるパターン）
        if (newWorkerTask.start_at && newWorkerTask.end_at) {
          startTime = new Date(newWorkerTask.start_at).toISOString();
          endTime = new Date(newWorkerTask.end_at).toISOString();
        }
      }

      // 日時が特定できれば Google カレンダーへリクエストを飛ばす
      if (startTime && endTime) {
        await calendarHandler.createEvent(env, {
          title: newWorkerTask.title,
          description: newWorkerTask.notes || `${newWorkerTask.interval || '通常'}タスク`,
          startTime,
          endTime,
        });
      }
    } catch (calendarError) {
      // カレンダー側のエラーでタスク登録自体を落とさないよう安全にキャッチ
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