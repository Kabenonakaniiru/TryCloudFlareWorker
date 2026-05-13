/**
 * API レスポンスを標準フォーマットで返す
 */
export function apiResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

/**
 * エラーレスポンスを返す
 */
export function apiError(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
