import { toISODate } from '@/lib/calendar-dates';
import { assignWeekdays } from '@/lib/program-schedule';
import { supabase } from '@/lib/supabase';
import type { ProfileId } from '@/types/database';

// Мутации режима программы и отметок (Этап 1 roadmap). Логика «что показывать»
// — в program-schedule.ts; здесь только запись в Supabase.

/** Новый открытый период. Второй открытый период не даст создать уникальный индекс 0008. */
export async function startProgram(profileId: ProfileId, programId: string, startDate: Date): Promise<void> {
  const { error } = await supabase
    .from('program_periods')
    .insert({ program_id: programId, profile_id: profileId, started_on: toISODate(startDate) });
  if (error) throw error;
}

async function closeOpenPeriod(programId: string, today: Date, reason: 'pause' | 'stop'): Promise<boolean> {
  const { data, error } = await supabase
    .from('program_periods')
    .update({ ended_on: toISODate(today), end_reason: reason })
    .eq('program_id', programId)
    .is('ended_on', null)
    .select('id');
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function pauseProgram(programId: string, today: Date): Promise<void> {
  const closed = await closeOpenPeriod(programId, today, 'pause');
  if (!closed) throw new Error('Программа уже не идёт — обнови экран');
}

export async function resumeProgram(profileId: ProfileId, programId: string, today: Date): Promise<void> {
  await startProgram(profileId, programId, today);
}

/** Из активной — закрыть открытый период; с паузы — перевести последнюю паузу в стоп. */
export async function stopProgram(programId: string, today: Date): Promise<void> {
  const closed = await closeOpenPeriod(programId, today, 'stop');
  if (closed) return;
  const { data: last, error: lastError } = await supabase
    .from('program_periods')
    .select('id')
    .eq('program_id', programId)
    .eq('end_reason', 'pause')
    .order('ended_on', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
  if (!last) throw new Error('Программа не запущена — останавливать нечего');
  const { error } = await supabase.from('program_periods').update({ end_reason: 'stop' }).eq('id', last.id);
  if (error) throw error;
}

/** Отмена запланированного (ещё не наступившего) старта — удаляет открытый период. */
export async function cancelScheduledStart(programId: string): Promise<void> {
  const { error } = await supabase.from('program_periods').delete().eq('program_id', programId).is('ended_on', null);
  if (error) throw error;
}

export async function countFutureExceptions(profileId: ProfileId, today: Date): Promise<number> {
  const { count, error } = await supabase
    .from('workout_day_exceptions')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .gte('date', toISODate(today));
  if (error) throw error;
  return count ?? 0;
}

/**
 * Разложить дни программы по выбранным дням недели. Будущие исключения переноса
 * удаляются — иначе старые разовые переносы и отмены легли бы на новую раскладку
 * (спека, раздел 2). N отдельных UPDATE не атомарны: при сбое повторное
 * сохранение приводит раскладку в порядок.
 */
export async function setWeekdays(
  profileId: ProfileId,
  workoutDays: { id: string; sort_order: number }[],
  weekdays: number[],
  today: Date
): Promise<void> {
  const assignments = assignWeekdays(workoutDays, weekdays);
  for (const { id, weekday } of assignments) {
    const { error } = await supabase.from('workout_days').update({ weekday }).eq('id', id);
    if (error) throw error;
  }
  const { error } = await supabase
    .from('workout_day_exceptions')
    .delete()
    .eq('profile_id', profileId)
    .gte('date', toISODate(today));
  if (error) throw error;
}

export async function markWorkoutDone(entry: {
  profileId: ProfileId;
  workoutDayId: string;
  date: Date;
  dayLabel: string;
  contextUsed: string | null;
}): Promise<void> {
  const { error } = await supabase.from('workout_logs').upsert(
    {
      profile_id: entry.profileId,
      workout_day_id: entry.workoutDayId,
      date: toISODate(entry.date),
      day_label: entry.dayLabel,
      context_used: entry.contextUsed,
      completed: true,
    },
    { onConflict: 'profile_id,date,workout_day_id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

export async function unmarkWorkoutDone(profileId: ProfileId, workoutDayId: string, date: Date): Promise<void> {
  const { data: deleted, error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('profile_id', profileId)
    .eq('workout_day_id', workoutDayId)
    .eq('date', toISODate(date))
    .select('id');
  if (error) throw error;
  // 204 от PostgREST не значит, что что-то удалено: без `.select` пустое
  // удаление неотличимо от успешного.
  if (!deleted || deleted.length === 0) throw new Error('Отметки за этот день уже нет — обнови экран');
}
