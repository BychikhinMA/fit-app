import { getStoredProfileId } from '@/lib/profile-storage';
import { supabase } from '@/lib/supabase';
import type { ProfileId } from '@/types/database';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export const onAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);

/**
 * Профиль текущего авторизованного пользователя (owner_id = auth.uid(),
 * доступ ограничен RLS-политикой "owner full access" на profiles) — если
 * его ещё нет, создаёт новую строку. id новой строки — сам auth.uid(),
 * display_name — часть email до "@" (пользователь может переименовать
 * себя позже, отдельной фичи для этого пока нет).
 */
export async function ensureOwnProfile(): Promise<{ id: ProfileId; created: boolean }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Нет активной сессии Supabase');

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return { id: existing.id, created: false };

  const displayName = user.email?.split('@')[0] || 'Профиль';
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, owner_id: user.id, display_name: displayName })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return { id: created.id, created: true };
}

/**
 * Профиль, активный прямо сейчас на этом устройстве: сессия Supabase (для
 * входа по email+паролю) — источник правды, гостевой AsyncStorage-указатель
 * из profile-storage.ts используется только как fallback, когда сессии нет.
 * Гостевой флоу (maksim/maria) через эту функцию не идёт и не меняется.
 */
export async function getCurrentProfileId(): Promise<ProfileId | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', session.user.id)
      .maybeSingle();
    if (profile) return profile.id;
  }
  return getStoredProfileId();
}
