import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Не найдены EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Проверь файл .env (см. .env.example) и перезапусти expo start.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    // Шаг 4 (email+пароль): раньше оба флага были false — гостевой режим
    // без логина не нуждался в сессии. Теперь сессия должна переживать
    // перезапуск приложения и обновлять токен, иначе вход по паролю
    // разлогинивал бы пользователя при каждом перезапуске.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
