import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Не найдены EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Проверь файл .env (см. .env.example) и перезапусти expo start.'
  );
}

// На вебе (app.json: web.output "static") expo-router рендерит каждый роут
// один раз на Node-стороне (нет window/localStorage) до гидратации в
// браузере, и этот модуль выполняется в обоих окружениях. AsyncStorage на
// вебе — это тонкая обёртка над window.localStorage (см.
// node_modules/@react-native-async-storage/async-storage/lib/module/AsyncStorage.js) —
// падает с ReferenceError на Node-стороне.
// Решение — не передавать storage вообще на вебе: у @supabase/auth-js уже
// есть встроенный safe-фоллбэк именно под этот случай (GoTrueClient
// использует переданный storage только если он задан явно; иначе сам
// проверяет supportsLocalStorage(), который возвращает false, когда нет
// window/document, и тогда использует свой in-memory адаптер — см.
// node_modules/@supabase/auth-js/src/GoTrueClient.ts и src/lib/helpers.ts).
// На Node-стороне сессии всё равно взяться неоткуда, in-memory достаточно;
// в реальном браузере (после гидратации — отдельное выполнение модуля,
// window уже есть) supportsLocalStorage() вернёт true и будет использован
// настоящий window.localStorage — сессия так же переживает перезапуск
// вкладки, как и раньше через AsyncStorage (та же основа).
// На native (iOS/Android) window всегда undefined, поэтому там AsyncStorage
// передаём явно — иначе тот же автофоллбэк дал бы in-memory storage и
// пароль пришлось бы вводить при каждом перезапуске приложения.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    // Шаг 4 (email+пароль): раньше оба флага были false — гостевой режим
    // без логина не нуждался в сессии. Теперь сессия должна переживать
    // перезапуск приложения и обновлять токен, иначе вход по паролю
    // разлогинивал бы пользователя при каждом перезапуске.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
