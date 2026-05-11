import { sign } from '@tsndr/cloudflare-worker-jwt';

export const calendarHandler = {
  /**
   * 環境変数からGoogleの秘密鍵を安全に取得・整形する
   */
  getFormattedPrivateKey(rawKey: string): string {
    if (!rawKey) return "";

    return rawKey
      .replace(/\\n/g, '\n') // 文字列としての "\n" を実際の改行に変換
      .replace(/"/g, '')     // 前後の引用符を削除
      .trim();               // 余計な空白を削除
  },

  /**
   * Google OAuth 2.0 アクセストークンの取得
   */
  async getAccessToken(email: string, privateKey: string) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // 整形済みの privateKey を使用して署名
    const token = await sign(payload, privateKey, { algorithm: 'RS256' });

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Google Auth Token Error: ${resp.status} - ${errorText}`);
    }

    const data = await resp.json() as { access_token: string };
    return data.access_token;
  },

  /**
   * 今日の予定一覧を取得
   */
  async listTodayEvents(env: Env) {
    // 1. 秘密鍵を関数経由で整形して取得
    const rawKey = env.GOOGLE_PRIVATE_KEY || "";

    // 【調査用デバッグログ】
    console.log("DEBUG: Key length =", rawKey.length);
    console.log("DEBUG: Contains \\n (string)? =", rawKey.includes("\\n"));
    console.log("DEBUG: Contains \n (newline)? =", rawKey.includes("\n"));

    const privateKey = this.getFormattedPrivateKey(rawKey);

    // 2. アクセストークンの取得
    const token = await this.getAccessToken(env.GOOGLE_CLIENT_EMAIL, privateKey);

    // 3. カレンダーAPIの呼び出し
    const now = new Date();
    const min = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const max = new Date(new Date(min).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${env.GOOGLE_CALENDAR_ID}/events?timeMin=${min}&timeMax=${max}&singleEvents=true&orderBy=startTime`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Google Calendar API Error: ${resp.status} - ${errorText}`);
    }

    return await resp.json();
  }
};