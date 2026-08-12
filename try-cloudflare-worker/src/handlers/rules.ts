import { eq, and, lt, inArray, or, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { rules, logs, groups, type LogStatus } from '../schema';
import { calendarHandler } from '../services/calendar';
import { validateTaskInput, validateId } from '../utils/validation';

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
  async list(env: Env) {
    const db = getDb(env);
    const data = await db
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
        group: { id: groups.id, slug: groups.slug, name: groups.name, color: groups.color },
      })
      .from(rules)
      .leftJoin(groups, eq(rules.groupId, groups.id))
      .all();
    return Response.json(data);
  },

  async create(request: Request, env: Env) {
    try {
      const rawData = await request.json<any>();
      const data = validateTaskInput(rawData);

      const db = getDb(env);

      // 件数上限チェック
      const countResult = await db.select({ count: sql`count(*)` }).from(rules).get() as { count: number } | undefined;
      if (countResult && countResult.count >= 100) {
        return Response.json({ error: "Rule count limit exceeded (maximum 100)" }, { status: 400 });
      }

      const result = await db.insert(rules).values({
        groupId: data.categoryId,
        title: data.title,
        interval: data.interval || 'daily',
        periodStyle: rawData.periodStyle,
        startAt: data.start_at,
        endAt: data.end_at,
        resetTime: rawData.resetTime || '04:00',
        missedBehavior: rawData.missedBehavior || 'delete',
        notes: data.notes,
        scheduleData: data.schedule_data,
      }).returning().get();
      return Response.json(result);
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  },

  async update(id: number, request: Request, env: Env) {
    try {
      const rawData = await request.json<any>();
      const validatedId = validateId(id);
      const data = validateTaskInput(rawData);

      const db = getDb(env);
      const result = await db.update(rules).set({
        groupId: data.categoryId,
        title: data.title,
        interval: data.interval,
        periodStyle: rawData.periodStyle,
        startAt: data.start_at,
        endAt: data.end_at,
        resetTime: rawData.resetTime,
        missedBehavior: rawData.missedBehavior,
        notes: data.notes,
        scheduleData: data.schedule_data,
      }).where(eq(rules.id, validatedId)).returning().get();
      return Response.json(result);
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  },

  async delete(id: number, env: Env) {
    const db = getDb(env);
    try { await calendarHandler.deleteEventsByRuleId(env, id); } catch (err) { console.error(err); }
    await db.delete(rules).where(eq(rules.id, id)).run();
    return Response.json({ success: true });
  },

  async listTodayLogs(env: Env) {
    const db = getDb(env);
    const todayStr = getTargetDate('04:00');
    const data = await db
      .select({
        logId: logs.id,
        targetDate: logs.targetDate,
        status: logs.status,
        calendarEventId: logs.calendarEventId,
        isCarriedOver: logs.isCarriedOver,
        rule: { id: rules.id, title: rules.title, notes: rules.notes, missedBehavior: rules.missedBehavior },
        group: { id: groups.id, name: groups.name, color: groups.color }
      })
      .from(logs)
      .innerJoin(rules, eq(logs.ruleId, rules.id))
      .leftJoin(groups, eq(rules.groupId, groups.id))
      .where(or(eq(logs.targetDate, todayStr), eq(logs.status, 'pending')))
      .all();

    const formattedData = data.map(item => ({
      ...item,
      isCarriedOver: Boolean(item.isCarriedOver || item.targetDate < todayStr)
    }));

    return Response.json(formattedData);
  },

  async updateLogStatus(id: number, request: Request, env: Env) {
    const body = await request.json() as { status: LogStatus };
    const db = getDb(env);
    const current = await db.select({ log: logs, rule: rules }).from(logs).innerJoin(rules, eq(logs.ruleId, rules.id)).where(eq(logs.id, id)).get();
    if (!current) return new Response("Not Found", { status: 404 });

    const updatedLog = await db.update(logs).set({ status: body.status, updatedAt: new Date().toISOString() }).where(eq(logs.id, id)).returning().get();
    if (current.log.calendarEventId) {
      try {
        const newTitle = body.status === 'completed' ? `【完了】${current.rule.title}` : current.rule.title;
        await calendarHandler.updateEventTitle(env, current.log.calendarEventId, newTitle);
      } catch (err) { console.error(err); }
    }
    return Response.json(updatedLog);
  },

  async getAdminData(env: Env) {
    const db = getDb(env);
    const groupsData = await db.select().from(groups).all();
    const rulesData = await db.select().from(rules).all();
    return Response.json({ groups: groupsData, rules: rulesData });
  },

  async generateLogs(env: Env) {
    await this.runDailyLifecycle(env);
    return Response.json({ success: true });
  },

  async syncCalendarLog(id: number, env: Env) {
    const db = getDb(env);
    const item = await db.select({ log: logs, rule: rules }).from(logs).innerJoin(rules, eq(logs.ruleId, rules.id)).where(eq(logs.id, id)).get();
    if (!item) return Response.json({ error: "Log not found" }, { status: 404 });

    try {
      const token = await calendarHandler.getAccessToken(env);
      let eventId = item.log.calendarEventId;

      if (!eventId) {
        // 未作成の場合は新規作成
        const title = item.log.status === 'completed' ? `【完了】${item.rule.title}` : (item.log.status === 'missed' ? `【未完了】${item.rule.title}` : item.rule.title);
        const event = await calendarHandler.createAllDayEvent(env, {
          title,
          description: item.rule.notes || '定期ルーティン日課',
          date: item.log.targetDate,
        }, token);
        eventId = event.id;
        await db.update(logs).set({ calendarEventId: eventId, updatedAt: new Date().toISOString() }).where(eq(logs.id, id)).run();
      } else {
        // 作成済みの場合は更新同期
        const title = item.log.status === 'completed' ? `【完了】${item.rule.title}` : (item.log.status === 'missed' ? `【未完了】${item.rule.title}` : item.rule.title);
        await calendarHandler.updateEventTitle(env, eventId, title, token);
        await calendarHandler.updateEventDate(env, eventId, item.log.targetDate, token);
      }

      return Response.json({ success: true, calendarEventId: eventId });
    } catch (err: any) {
      console.error("Manual calendar sync failed:", err);
      return Response.json({ error: err.message || "Failed to sync Google Calendar" }, { status: 500 });
    }
  },

  async runDailyLifecycle(env: Env) {
    const db = getDb(env);
    const todayStr = getTargetDate('04:00');
    const yesterdayStr = getOffsetDate(todayStr, -1);

    // Google Calendar API トークンを1回だけ取得して使い回す
    let token: string | undefined;
    try {
      token = await calendarHandler.getAccessToken(env);
    } catch (e) {
      console.error("Failed to get Google Calendar access token:", e);
    }

    const yesterdayPendings = await db.select({ log: logs, rule: rules }).from(logs).innerJoin(rules, eq(logs.ruleId, rules.id)).where(and(eq(logs.targetDate, yesterdayStr), eq(logs.status, 'pending'))).all();
    for (const item of yesterdayPendings) {
      if (item.rule.missedBehavior === 'delete') {
        await db.update(logs).set({ status: 'missed', updatedAt: new Date().toISOString() }).where(eq(logs.id, item.log.id)).run();
        if (item.log.calendarEventId && token) {
          try {
            await calendarHandler.updateEventTitle(env, item.log.calendarEventId, `【未完了】${item.rule.title}`, token);
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        await db.update(logs).set({ targetDate: todayStr, isCarriedOver: 1, updatedAt: new Date().toISOString() }).where(eq(logs.id, item.log.id)).run();
        if (item.log.calendarEventId && token) {
          try {
            await calendarHandler.updateEventDate(env, item.log.calendarEventId, todayStr, token);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    const allRules = await db.select().from(rules).all();
    for (const rule of allRules) {
      let shouldGenerate = false;
      if (rule.interval === 'daily') shouldGenerate = true;
      else if (rule.interval === 'period' && rule.startAt && rule.endAt && todayStr >= rule.startAt && todayStr <= rule.endAt) {
        if (rule.periodStyle === 'routine') shouldGenerate = true;
        else if (rule.periodStyle === 'single') {
          const exists = await db.select().from(logs).where(eq(logs.ruleId, rule.id)).get();
          if (!exists) shouldGenerate = true;
        }
      }
      if (shouldGenerate) {
        const currentExists = await db.select().from(logs).where(and(eq(logs.ruleId, rule.id), eq(logs.targetDate, todayStr))).get();
        if (!currentExists) {
          let calendarEventId: string | null = null;
          if (token) {
            try {
              const event = await calendarHandler.createAllDayEvent(env, { title: rule.title, description: rule.notes || '定期ルーティン日課', date: todayStr }, token);
              calendarEventId = event.id;
            } catch (e) {
              console.error(e);
            }
          }
          await db.insert(logs).values({ ruleId: rule.id, targetDate: todayStr, status: 'pending', calendarEventId: calendarEventId }).run();
        }
      }
    }
    const retentionDays = Number(env.RETENTION_DAYS) || 1095;
    const boundaryDateStr = getOffsetDate(todayStr, -retentionDays);
    await db.delete(logs).where(and(inArray(logs.status, ['completed', 'missed']), lt(logs.targetDate, boundaryDateStr))).run();
  },

  async getStats(env: Env, days: number = 7) {
    const db = getDb(env);
    const todayStr = getTargetDate('04:00');
    const startDateStr = getOffsetDate(todayStr, -(days - 1));

    // 日別の達成状況（完了数、未完了・失効数、総タスク数）の集計
    const rawLogs = await db
      .select({
        targetDate: logs.targetDate,
        status: logs.status,
        groupId: rules.groupId,
        groupName: groups.name,
        groupColor: groups.color
      })
      .from(logs)
      .innerJoin(rules, eq(logs.ruleId, rules.id))
      .leftJoin(groups, eq(rules.groupId, groups.id))
      .where(and(sql`${logs.targetDate} >= ${startDateStr}`, sql`${logs.targetDate} <= ${todayStr}`))
      .all();

    // 日別データの集計
    const dateMap: Record<string, { total: number; completed: number; missed: number; pending: number }> = {};
    
    // 直近N日分を初期化
    for (let i = days - 1; i >= 0; i--) {
      const d = getOffsetDate(todayStr, -i);
      dateMap[d] = { total: 0, completed: 0, missed: 0, pending: 0 };
    }

    rawLogs.forEach(log => {
      if (dateMap[log.targetDate]) {
        dateMap[log.targetDate].total++;
        if (log.status === 'completed') dateMap[log.targetDate].completed++;
        else if (log.status === 'missed') dateMap[log.targetDate].missed++;
        else if (log.status === 'pending') dateMap[log.targetDate].pending++;
      }
    });

    const dailyStats = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      ...counts,
      rate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
    }));

    // 通算統計
    const overallTotal = rawLogs.length;
    const overallCompleted = rawLogs.filter(l => l.status === 'completed').length;
    const overallRate = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    return Response.json({
      days,
      startDate: startDateStr,
      endDate: todayStr,
      overall: {
        total: overallTotal,
        completed: overallCompleted,
        rate: overallRate
      },
      daily: dailyStats
    });
  }
};