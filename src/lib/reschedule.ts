import { findWorkoutForDate, mondayIndex, toISODate } from '@/lib/calendar-dates';
import { supabase } from '@/lib/supabase';
import type { PlanData } from '@/lib/load-plan';
import type { ProfileId } from '@/types/database';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export type RescheduleScope = 'once' | 'forever';

/** Тренировочный день, который уже стоит на targetDate и это не тот же день, что переносим (иначе это не конфликт, а no-op). */
export function findConflict(
  workoutDays: WorkoutDayEntry[],
  exceptions: PlanData['exceptions'],
  targetDate: Date,
  movingDayId: string
): WorkoutDayEntry | null {
  const existing = findWorkoutForDate(workoutDays, targetDate, exceptions);
  if (existing && existing.id !== movingDayId) return existing;
  return null;
}

/** Разовый перенос без конфликта: cancelled на originDate + scheduled на targetDate. */
export async function rescheduleOnce(
  profileId: ProfileId,
  movingDayId: string,
  originDate: Date,
  targetDate: Date
): Promise<void> {
  const { error } = await supabase.from('workout_day_exceptions').upsert(
    [
      { profile_id: profileId, date: toISODate(originDate), kind: 'cancelled', workout_day_id: null },
      { profile_id: profileId, date: toISODate(targetDate), kind: 'scheduled', workout_day_id: movingDayId },
    ],
    { onConflict: 'profile_id,date' }
  );
  if (error) throw error;
}

/** Постоянный перенос без конфликта: прямой UPDATE weekday, без записи в workout_day_exceptions. */
export async function rescheduleForever(movingDayId: string, targetDate: Date): Promise<void> {
  const { error } = await supabase
    .from('workout_days')
    .update({ weekday: mondayIndex(targetDate) })
    .eq('id', movingDayId);
  if (error) throw error;
}

/** Разовый своп: обе даты получают scheduled-записи (никаких cancelled) — своп местами. */
export async function swapOnce(
  profileId: ProfileId,
  movingDayId: string,
  originDate: Date,
  targetDate: Date,
  conflictingDayId: string
): Promise<void> {
  const { error } = await supabase.from('workout_day_exceptions').upsert(
    [
      { profile_id: profileId, date: toISODate(targetDate), kind: 'scheduled', workout_day_id: movingDayId },
      { profile_id: profileId, date: toISODate(originDate), kind: 'scheduled', workout_day_id: conflictingDayId },
    ],
    { onConflict: 'profile_id,date' }
  );
  if (error) throw error;
}

/** Постоянный своп: два weekday-апдейта, каждый день получает weekday другого. */
export async function swapForever(
  movingDayId: string,
  originDate: Date,
  targetDate: Date,
  conflictingDayId: string
): Promise<void> {
  const { error: movingError } = await supabase
    .from('workout_days')
    .update({ weekday: mondayIndex(targetDate) })
    .eq('id', movingDayId);
  if (movingError) throw movingError;

  const { error: conflictingError } = await supabase
    .from('workout_days')
    .update({ weekday: mondayIndex(originDate) })
    .eq('id', conflictingDayId);
  if (conflictingError) throw conflictingError;
}
