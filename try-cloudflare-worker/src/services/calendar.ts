export const calendarHandler = {
  /**
   * Google API用のJWTアクセストークンを取得
   */
  async getAccessToken(env: Env): Promise<string> {
    const pkey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const iss = env.GOOGLE_CLIENT_EMAIL;
    const scope = 'https://www.googleapis.com/auth/calendar';
    const aud = 'https://oauth2.googleapis.com/token';

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss,
      scope,
      aud,
      exp: now + 3600,
      iat: now,
    };

    const base64UrlEncode = (str: string) =>
      btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwtHeader = base64UrlEncode(JSON.stringify(header));
    const jwtPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${jwtHeader}.${jwtPayload}`;

    const binaryDer = Uint8Array.from(
      atob(pkey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')),
      (c) => c.charCodeAt(0)
    );

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const jwtSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${signatureInput}.${jwtSignature}`;

    const resp = await fetch(aud, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data: any = await resp.json();
    if (!data.access_token) throw new Error(`Failed to get Google Token: ${JSON.stringify(data)}`);
    return data.access_token;
  },

  /**
   * 1. 終日予定（All-day event）の作成
   */
  async createAllDayEvent(env: Env, params: { title: string; description: string; date: string }, token?: string) {
    const accessToken = token || await this.getAccessToken(env);
    const calendarId = env.GOOGLE_CALENDAR_ID || 'primary';

    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: params.title,
        description: params.description,
        start: { date: params.date },
        end: { date: params.date },
      }),
    });

    if (!resp.ok) throw new Error(`Google Calendar Create Failed: ${await resp.text()}`);
    return await resp.json() as any;
  },

  /**
   * 2. 予定のタイトルを書き換え
   */
  async updateEventTitle(env: Env, eventId: string, newTitle: string, token?: string) {
    const accessToken = token || await this.getAccessToken(env);
    const calendarId = env.GOOGLE_CALENDAR_ID || 'primary';

    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: newTitle,
      }),
    });

    if (!resp.ok) console.error(`Google Calendar PATCH Title Failed for ${eventId}:`, await resp.text());
  },

  /**
   * 3. 予定の日付を変更
   */
  async updateEventDate(env: Env, eventId: string, newDate: string, token?: string) {
    const accessToken = token || await this.getAccessToken(env);
    const calendarId = env.GOOGLE_CALENDAR_ID || 'primary';

    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: { date: newDate },
        end: { date: newDate },
      }),
    });

    if (!resp.ok) console.error(`Google Calendar PATCH Date Failed for ${eventId}:`, await resp.text());
  },

  /**
   * 4. ルール削除時のフック
   */
  async deleteEventsByRuleId(env: Env, ruleId: number) {
    // 拡張用
  },
};