import { sign } from '@tsndr/cloudflare-worker-jwt';

export const calendarHandler = {
  // アクセストークンの取得
  async getAccessToken(email: string, privateKey: string) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
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

    // ここを追加：トークン取得自体の成否をチェック
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Google Auth Token Error: ${resp.status} - ${errorText}`);
    }

    const data = await resp.json() as { access_token: string };
    return data.access_token;
  },

  // 今日の予定一覧を取得
  async listTodayEvents(env: Env) {
    const token = await this.getAccessToken(env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY);

    const now = new Date();
    const min = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const max = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events?timeMin=${min}&timeMax=${max}&singleEvents=true&orderBy=startTime`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return await resp.json();
  }
};