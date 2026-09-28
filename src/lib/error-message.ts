/**
 * Русские тексты для частых кодов Supabase Auth (`AuthError.code`). Остальные
 * коды показываются исходным (английским) сообщением сервера.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный email или пароль.',
  email_not_confirmed: 'Email ещё не подтверждён — открой письмо и перейди по ссылке.',
  user_already_exists: 'Пользователь с таким email уже зарегистрирован.',
  email_exists: 'Пользователь с таким email уже зарегистрирован.',
  weak_password: 'Слишком простой пароль — возьми длиннее и сложнее.',
  same_password: 'Новый пароль совпадает со старым.',
  email_address_invalid: 'Некорректный email.',
  email_address_not_authorized: 'На этот email сервер не может отправить письмо.',
  validation_failed: 'Проверь, правильно ли заполнены поля.',
  signup_disabled: 'Регистрация сейчас отключена.',
  email_provider_disabled: 'Вход по email сейчас отключён.',
  user_banned: 'Этот аккаунт заблокирован.',
  user_not_found: 'Пользователь не найден.',
  over_request_rate_limit: 'Слишком много попыток — подожди немного и попробуй снова.',
  over_email_send_rate_limit: 'Слишком много писем за короткое время — подожди немного и попробуй снова.',
  captcha_failed: 'Не пройдена проверка «я не робот».',
  request_timeout: 'Сервер не ответил вовремя — попробуй ещё раз.',
  session_expired: 'Сессия истекла — войди заново.',
  session_not_found: 'Сессия истекла — войди заново.',
  refresh_token_not_found: 'Сессия истекла — войди заново.',
  refresh_token_already_used: 'Сессия истекла — войди заново.',
};

const NETWORK_ERROR_MESSAGE = 'Нет связи с сервером — проверь интернет и попробуй ещё раз.';

/** Ошибки `@supabase/auth-js` помечены `__isAuthError` — по нему, а не по `code`, чтобы не спутать с кодами Postgrest. */
function authErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object' || !('__isAuthError' in err)) return null;
  const { name, code } = err as { name?: unknown; code?: unknown };
  if (name === 'AuthRetryableFetchError') return NETWORK_ERROR_MESSAGE;
  if (typeof code === 'string' && code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[code];
  return null;
}

/**
 * Человекочитаемый текст ошибки. Ошибки Supabase (`PostgrestError`) приходят
 * обычным объектом `{ message, details, hint, code }`, а не `Error`, поэтому
 * `String(err)` превращал их в «[object Object]». Известные ошибки Supabase
 * Auth переводятся на русский.
 */
export function errorMessage(err: unknown, fallback: string): string {
  const authMessage = authErrorMessage(err);
  if (authMessage) return authMessage;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const { message, details } = err as { message?: unknown; details?: unknown };
    if (typeof message === 'string' && message) return message;
    if (typeof details === 'string' && details) return details;
  }
  if (typeof err === 'string' && err) return err;
  return fallback;
}
