import { eq, and, lt, inArray, or } from 'drizzle-orm';
import { getDb } from '../db';
import { rules, logs, groups, type LogStatus } from '../schema';
import { calendarHandler } from '../services/calendar'; // 修正：services 階層を参照

// ソシャゲ・日常リセット時間（例: 04:00）を考慮して、判定上の基準日付（YYYY-MM-DD）を返す
function getTargetDate(resetTimeStr: string = '04:00'): string {
  const now = new Date();
  const [resetHour, resetMin] = resetTimeStr.split(':').map(Number);

  const gameTime = new Date(now.getTime());
  if (now.getHours() < resetHour || (now.getHours() === resetHour && now.getMinutes() < resetMin)) {
    gameTime.setDate(gameTime.getDate() - 1);
  }

  return gameTime.toISOString().split('T')[0];
}

function getOffsetDate(baseDateStr: string, offsetDays: number): string {
  const date = new Date(baseDateStr);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

export const ruleHandler = {
  // =========================================================================
  // A. 大元ルール（マスタ）管理用 CRUD
  // =========================================================================

  async list(env: Env) {
    const db = getDb(env);
    return await db
      .select({
        id: rules.id,
        title: rules.title,
        interval: rules.interval,
        periodStyle: rules.periodStyle,
        startAt: rules.startAt,
        endAt: rules.endAt,
        resetTime: rules.resetTime,
        missedBehavior: rules.missedBehavior,
        groupId: rules.groupId,
        notes: rules.notes,
        group: {
          id: groups.id,
          slug: groups.slug,
          name: groups.name,
          color: groups.color,
        },
      })
      .from(rules)
      .leftJoin(groups, eq(rules.groupId, groups.id))
      .all();
  },

  async create(env: Env, data: any) {
    const db = getDb(env);
    return await db.insert(rules).values({
      groupId: data.groupId,
      title: data.title,
      interval: data.interval || 'daily',
      periodStyle: data.periodStyle,
      startAt: data.startAt,
      endAt: data.endAt,
      resetTime: data.resetTime || '04:00',
      missedBehavior: data.missedBehavior || 'delete',
      notes: data.notes,
      scheduleData: data.scheduleData,
    }).returning().get();
  },

  async update(env: Env, id: number, data: any) {
    const db = getDb(env);
    return await db.update(rules).set({
      groupId: data.groupId,
      title: data.title,
      interval: data.interval,
      periodStyle: data.periodStyle,
      startAt: data.startAt,
      endAt: data.endAt,
      resetTime: data.resetTime,
      missedBehavior: data.missedBehavior,
      notes: data.notes,
      scheduleData: data.scheduleData,
    }).where(eq(rules.id, id)).returning().get();
  },

  async delete(env: Env, id: number) {
    const db = getDb(env);
    try {
      await calendarHandler.deleteEventsByRuleId(env, id);
    } catch (err) {
      console.error("Google Calendar Sync Error (Delete Rule):", err);
    }
    await db.delete(rules).where(eq(rules.id, id)).run();
    return { success: true };
  },

  // =========================================================================
  // B. 日々の消化ログ（旧インスタンス）用 API
  // =========================================================================

  /**
   * トップ画面（index.html）用：今日（および過去の未完了）のチェックリストを取得
   */
  async listTodayLogs(env: Env) {
    const db = getDb(env);
    const todayStr = getTargetDate('04:00'); // 4時リセット基準

    return await db
      .select({
        logId: logs.id,
        targetDate: logs.targetDate,
        status: logs.status,
        calendarEventId: logs.calendarEventId,
        rule: {
          id: rules.id,
          title: rules.title,
          notes: rules.notes,
        },
        group: {
          name: groups.name,
          color: groups.color,
        }
      })
      .from(logs)
      .innerJoin(rules, eq(logs.ruleId, rules.id))
      .leftJoin(groups, eq(rules.groupId, groups.id))
      .where(
        or(
          eq(logs.targetDate, todayStr),
          eq(logs.status, 'pending')
        )
      )
      .all();
  },

  /**
   * チェックボックス連動：完了(completed) / 未完了(pending) を切り替え、カレンダーをパッチ
   */
  async updateLogStatus(env: Env, logId: number, status: LogStatus) {
    const db = getDb(env);

    const current = await db
      .select({ log: logs, rule: rules })
      .from(logs)
      .innerJoin(rules, eq(logs.ruleId, rules.id))
      .where(eq(logs.id, logId))
      .get();

    if (!current) throw new Error("Log record not found");

    const updatedLog = await db.update(logs)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(logs.id, logId))
      .returning().get();

    if (current.log.calendarEventId) {
      try {
        const newTitle = status === 'completed'
          ? `【完了】${current.rule.title}`
          : current.rule.title;

        await calendarHandler.updateEventTitle(env, current.log.calendarEventId, newTitle);
      } catch (err) {
        console.error("Google Calendar Sync Error (PATCH Title):", err);
      }
    }

    return updatedLog;
  },

  // =========================================================================
  // C. 定期実行クローン（Scheduled）用コアロジック
  // =========================================================================

  async runDailyLifecycle(env: Env) {
    const db = getDb(env);
    const todayStr = getTargetDate('04:00');
    const yesterdayStr = getOffsetDate(todayStr, -1);

    console.log(`[Lifecycle] Yesterday: ${yesterdayStr}, Today: ${todayStr}`);

    // STEP 1: 前日分の未完了（pending）の回収
    const yesterdayPendings = await db
      .select({ log: logs, rule: rules })
      .from(logs)
      .innerJoin(rules, eq(logs.ruleId, rules.id))
      .where(and(eq(logs.targetDate, yesterdayStr), eq(logs.status, 'pending')))
      .all();

    for (const item of yesterdayPendings) {
      if (item.rule.missedBehavior === 'delete') {
        await db.update(logs)
          .set({ status: 'missed', updatedAt: new Date().toISOString() })
          .where(eq(logs.id, item.log.id))
          .run();

        if (item.log.calendarEventId) {
          try {
            await calendarHandler.updateEventTitle(env, item.log.calendarEventId, `【未完了】${item.rule.title}`);
          } catch (e) { console.error(e); }
        }
      } else {
        await db.update(logs)
          .set({ targetDate: todayStr, updatedAt: new Date().toISOString() })
          .where(eq(logs.id, item.log.id))
          .run();

        if (item.log.calendarEventId) {
          try {
            await calendarHandler.updateEventDate(env, item.log.calendarEventId, todayStr);
          } catch (e) { console.error(e); }
        }
      }
    }

    // STEP 2: 今日の新規Logインスタンスの発行 ＆ カレンダーに「終日予定」登録
    const allRules = await db.select().from(rules).all();

    for (const rule of allRules) {
      let shouldGenerate = false;

      if (rule.interval === 'daily') {
        shouldGenerate = true;
      } else if (rule.interval === 'period' && rule.startAt && rule.endAt) {
        if (todayStr >= rule.startAt && todayStr <= rule.endAt) {
          if (rule.periodStyle === 'routine') {
            shouldGenerate = true;
          } else if (rule.periodStyle === 'single') {
            const exists = await db.select().from(logs).where(eq(logs.ruleId, rule.id)).get();
            if (!exists) shouldGenerate = true;
          }
        }
      }

      if (shouldGenerate) {
        const currentExists = await db.select()
          .from(logs)
          .where(and(eq(logs.ruleId, rule.id), eq(logs.targetDate, todayStr)))
          .get();

        if (!currentExists) {
          let calendarEventId: string | null = null;
          try {
            const event = await calendarHandler.createAllDayEvent(env, {
              title: rule.title,
              description: rule.notes || '定期ルーティン日課',
              date: todayStr,
            });
            calendarEventId = event.id;
          } catch (e) {
            console.error(`Calendar sync failed for rule ${rule.id}:`, e);
          }

          await db.insert(logs).values({
            ruleId: rule.id,
            targetDate: todayStr,
            status: 'pending',
            calendarEventId: calendarEventId,
          }).run();
        }
      }
    }

    // STEP 3: 過去ログクリーンアップ（3年保持）
    const retentionDays = Number(env.RETENTION_DAYS) || 1095;
    const boundaryDateStr = getOffsetDate(todayStr, -retentionDays);

    await db.delete(logs)
      .where(and(
        inArray(logs.status, ['completed', 'missed']),
        lt(logs.targetDate, boundaryDateStr)
      ))
      .run();
  }
};