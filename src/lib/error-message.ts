/**
 * Человекочитаемый текст ошибки. Ошибки Supabase (`PostgrestError`) приходят
 * обычным объектом `{ message, details, hint, code }`, а не `Error`, поэтому
 * `String(err)` превращал их в «[object Object]».
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const { message, details } = err as { message?: unknown; details?: unknown };
    if (typeof message === 'string' && message) return message;
    if (typeof details === 'string' && details) return details;
  }
  if (typeof err === 'string' && err) return err;
  return fallback;
}
