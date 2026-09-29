// Чистая логика расписания программы (Этап 1 roadmap). Без `@/`-импортов и без
// обращений к базе — покрывается `npm test` (node:test). Дизайн:
// docs/superpowers/specs/2026-09-28-program-lifecycle-design.md.
import { findWorkoutForDate, toISODate, type WorkoutDayException } from './calendar-dates.ts';

export type ProgramPeriod = { started_on: string; ended_on: string | null; end_reason: 'pause' | 'stop' | null };
export type WorkoutLogFact = { date: string; workout_day_id: string | null; completed: boolean };

export type ProgramState =
  | { kind: 'not_started' }
  | { kind: 'scheduled'; startsOn: string }
  | { kind: 'active'; since: string }
  | { kind: 'paused'; since: string }
  | { kind: 'stopped'; since: string };

export type WorkoutStatus = 'done' | 'missed' | 'planned';

export type DayFact = {
  date: string;
  status: 'done' | 'missed' | 'planned' | 'paused' | 'not_started';
  workoutDayId: string | null;
};

type ScheduledDay = { id: string; weekday: number | null };

export type ScheduleInput<T extends ScheduledDay> = {
  workoutDays: T[];
  exceptions: WorkoutDayException[];
  periods: ProgramPeriod[];
  workoutLogs: WorkoutLogFact[];
};

const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function programState(periods: ProgramPeriod[], today: Date): ProgramState {
  if (periods.length === 0) return { kind: 'not_started' };
  const open = periods.find((p) => p.ended_on === null);
  if (open) {
    return open.started_on > toISODate(today)
      ? { kind: 'scheduled', startsOn: open.started_on }
      : { kind: 'active', since: open.started_on };
  }
  const last = [...periods].sort((a, b) => (a.started_on < b.started_on ? -1 : a.started_on > b.started_on ? 1 : 0))[
    periods.length - 1
  ];
  const since = last.ended_on as string;
  return last.end_reason === 'stop' ? { kind: 'stopped', since } : { kind: 'paused', since };
}

/** Дата внутри какого-либо периода `[started_on, ended_on)`. */
export function isActiveOn(periods: ProgramPeriod[], date: Date): boolean {
  const iso = toISODate(date);
  return periods.some((p) => p.started_on <= iso && (p.ended_on === null || iso < p.ended_on));
}

/** Тренировка на дату с учётом периодов: вне активных периодов — ничего. */
export function workoutForDate<T extends ScheduledDay>(
  workoutDays: T[],
  date: Date,
  exceptions: WorkoutDayException[],
  periods: ProgramPeriod[]
): T | undefined {
  if (!isActiveOn(periods, date)) return undefined;
  return findWorkoutForDate(workoutDays, date, exceptions);
}

/** Равномерный разнос N тренировочных дней по неделе (0 = Пн). */
export function defaultWeekdays(count: number): number[] {
  const weekdays = DEFAULT_WEEKDAYS[count];
  if (!weekdays) throw new Error(`Нельзя разложить ${count} дней по неделе — допустимо от 1 до 7`);
  return [...weekdays];
}

/** Дни программы по `sort_order` → выбранные дни недели по возрастанию. */
export function assignWeekdays(
  days: { id: string; sort_order: number }[],
  weekdays: number[]
): { id: string; weekday: number }[] {
  const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
  const unique = new Set(sortedWeekdays);
  if (unique.size !== sortedWeekdays.length || sortedWeekdays.some((w) => !Number.isInteger(w) || w < 0 || w > 6)) {
    throw new Error('Дни недели должны быть разными, от Пн до Вс');
  }
  if (sortedWeekdays.length !== days.length) {
    throw new Error(`Нужно выбрать ровно ${days.length} дн. — по числу дней программы`);
  }
  const sortedDays = [...days].sort((a, b) => a.sort_order - b.sort_order);
  return sortedDays.map((day, i) => ({ id: day.id, weekday: sortedWeekdays[i] }));
}

/** Статус запланированной тренировки на дату. Факт — любая отметка `completed` на эту дату. */
export function workoutStatus(date: Date, logs: WorkoutLogFact[], today: Date): WorkoutStatus {
  const iso = toISODate(date);
  if (logs.some((l) => l.date === iso && l.completed)) return 'done';
  return iso < toISODate(today) ? 'missed' : 'planned';
}

/** Пауза или «не идёт»: последний закрытый до даты период закрыт паузой → paused. */
function inactiveStatus(periods: ProgramPeriod[], iso: string): 'paused' | 'not_started' {
  const endedBefore = periods
    .filter((p) => p.ended_on !== null && p.ended_on <= iso)
    .sort((a, b) => ((a.ended_on as string) < (b.ended_on as string) ? -1 : 1));
  const last = endedBefore[endedBefore.length - 1];
  return last?.end_reason === 'pause' ? 'paused' : 'not_started';
}

/**
 * Факты для Этапа 3 за диапазон дат (включительно). Только даты, на которые
 * по расписанию (weekday + исключения) приходится тренировка; дни отдыха не
 * попадают. Вне активных периодов — paused / not_started.
 */
export function getScheduleFacts<T extends ScheduledDay>(
  input: ScheduleInput<T>,
  from: Date,
  to: Date,
  today: Date
): DayFact[] {
  const facts: DayFact[] = [];
  const toIso = toISODate(to);
  for (let i = 0; ; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const iso = toISODate(date);
    if (iso > toIso) break;
    const scheduled = findWorkoutForDate(input.workoutDays, date, input.exceptions);
    if (!scheduled) continue;
    const status = isActiveOn(input.periods, date)
      ? workoutStatus(date, input.workoutLogs, today)
      : inactiveStatus(input.periods, iso);
    facts.push({ date: iso, status, workoutDayId: scheduled.id });
  }
  return facts;
}
