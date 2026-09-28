import { findWorkoutForDate, mondayIndex, swappedWeekdays, toISODate } from '@/lib/calendar-dates';
import { supabase } from '@/lib/supabase';
import type { PlanData } from '@/lib/load-plan';
import type { ProfileId } from '@/types/database';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export type RescheduleScope = 'once' | 'forever';

/** Удаляет все forward-scheduled исключения дня — вызывается перед любым переносом этого дня, чтобы повторный перенос не оставлял дубликат на старой целевой дате. */
async function clearForwardSchedule(profileId: ProfileId, workoutDayId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_day_exceptions')
    .delete()
    .eq('profile_id', profileId)
    .eq('workout_day_id', workoutDayId)
    .eq('kind', 'scheduled');
  if (error) throw error;
}

/** Тренировочный день, который уже стоит на targetDate и это не тот же день, что переносим (иначе это не конфликт, а no-op). Для 'forever' конфликт определяется по постоянному weekday, не по одноразовому исключению — постоянный перенос должен видеть постоянного соседа по дню недели, даже если на этой конкретной дате сейчас действует исключение. */
export function findConflict(
  workoutDays: WorkoutDayEntry[],
  exceptions: PlanData['exceptions'],
  targetDate: Date,
  movingDayId: string,
  scope: RescheduleScope
): WorkoutDayEntry | null {
  if (scope === 'forever') {
    const weekdayOwner = workoutDays.find(
      (d) => d.weekday === mondayIndex(targetDate) && d.id !== movingDayId
    );
    return weekdayOwner ?? null;
  }
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
  await clearForwardSchedule(profileId, movingDayId);
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
export async function rescheduleForever(
  profileId: ProfileId,
  movingDayId: string,
  targetDate: Date
): Promise<void> {
  await clearForwardSchedule(profileId, movingDayId);
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
  await clearForwardSchedule(profileId, movingDayId);
  await clearForwardSchedule(profileId, conflictingDayId);
  const { error } = await supabase.from('workout_day_exceptions').upsert(
    [
      { profile_id: profileId, date: toISODate(targetDate), kind: 'scheduled', workout_day_id: movingDayId },
      { profile_id: profileId, date: toISODate(originDate), kind: 'scheduled', workout_day_id: conflictingDayId },
    ],
    { onConflict: 'profile_id,date' }
  );
  if (error) throw error;
}

/** Постоянный своп: два weekday-апдейта, каждый день получает постоянный weekday другого (не weekday даты, на которой открыт экран — см. `swappedWeekdays`). */
export async function swapForever(
  profileId: ProfileId,
  movingDay: WorkoutDayEntry,
  conflictingDay: WorkoutDayEntry
): Promise<void> {
  const weekdays = swappedWeekdays(movingDay, conflictingDay);
  await clearForwardSchedule(profileId, movingDay.id);
  await clearForwardSchedule(profileId, conflictingDay.id);
  const { error: movingError } = await supabase
    .from('workout_days')
    .update({ weekday: weekdays.moving })
    .eq('id', movingDay.id);
  if (movingError) throw movingError;

  const { error: conflictingError } = await supabase
    .from('workout_days')
    .update({ weekday: weekdays.conflicting })
    .eq('id', conflictingDay.id);
  if (conflictingError) throw conflictingError;
}
