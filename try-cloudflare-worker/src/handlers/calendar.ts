import { sign } from '@tsndr/cloudflare-worker-jwt';

export const calendarHandler = {
  getFormattedPrivateKey(rawKey: string): string {
    if (!rawKey) return "";
    return rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
  },

  async getAccessToken(email: string, privateKey: string) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    const token = await sign(payload, privateKey, { algorithm: 'RS256' });
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });
    if (!resp.ok) throw new Error(`Google Auth Token Error: ${await resp.text()}`);
    const data = await resp.json() as { access_token: string };
    return data.access_token;
  },

  /**
   * カレンダーイベントの作成（隠し属性 taskId を追加）
   */
  async createEvent(env: Env, taskId: number, eventData: { title: string; description?: string; startTime: string; endTime: string }) {
    const rawKey = env.GOOGLE_PRIVATE_KEY || "";
    const privateKey = this.getFormattedPrivateKey(rawKey);
    const token = await this.getAccessToken(env.GOOGLE_CLIENT_EMAIL, privateKey);

    const url = `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events`;
    const body = {
      summary: eventData.title,
      description: eventData.description || '',
      start: { dateTime: eventData.startTime },
      end: { dateTime: eventData.endTime },
      // ★ ここで拡張プロパティにタスクIDを埋め込む
      extendedProperties: {
        private: {
          taskId: String(taskId)
        }
      }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`Google Calendar Create Error: ${await resp.text()}`);
    return await resp.json();
  },

  /**
   * taskId に紐づくイベントを条件指定（未来のみ or 全て）で検索して一括削除する
   */
  async deleteEventsByTaskId(env: Env, taskId: number, scope: 'future' | 'all') {
    const rawKey = env.GOOGLE_PRIVATE_KEY || "";
    const privateKey = this.getFormattedPrivateKey(rawKey);
    const token = await this.getAccessToken(env.GOOGLE_CLIENT_EMAIL, privateKey);

    // 1. 該当するイベントをプライベートプロパティ(taskId)を指定して検索
    let url = `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events?privateExtendedProperty=taskId=${taskId}`;

    // scopeが 'future' の場合は、現在時刻以降の予定のみを対象にする
    if (scope === 'future') {
      const nowIso = new Date().toISOString();
      url += `&timeMin=${nowIso}`;
    }

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) throw new Error(`Google Calendar List Error: ${await resp.text()}`);
    const data = await resp.json() as { items?: Array<{ id: string }> };

    if (!data.items || data.items.length === 0) return;

    // 2. 見つかったイベントをループ処理で全て削除
    for (const event of data.items) {
      const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events/${event.id}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  }
};