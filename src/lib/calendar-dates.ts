export type CalendarScale = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const WEEKDAY_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const MONTH_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const MONTH_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** 0 = понедельник .. 6 = воскресенье (JS `Date.getDay()` — 0 = воскресенье). */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Всегда через 1-е число месяца — не переносит "31" на несуществующий день соседнего месяца. */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getWeekStart(anchor: Date): Date {
  return addDays(startOfDay(anchor), -mondayIndex(anchor));
}

/** 7 дат Пн..Вс недели, которая содержит `anchor`. */
export function getWeekDates(anchor: Date): Date[] {
  const monday = getWeekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Сетка недель месяца (Пн-старт), с ведущими/хвостовыми днями соседних
 * месяцев, чтобы заполнить крайние недели. Число недель — 5 или 6, по факту
 * месяца (как в Календаре iPhone), не всегда фиксированные 6.
 */
export function getMonthGrid(anchor: Date): Date[][] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -mondayIndex(firstOfMonth));
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const totalCells = mondayIndex(firstOfMonth) + daysInMonth;
  const weeks = Math.ceil(totalCells / 7);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i))
  );
}

/** 3 даты начала месяцев календарного квартала (Янв–Мар / Апр–Июн / ...), в который попадает `anchor`. */
export function getQuarterMonths(anchor: Date): Date[] {
  const quarterStartMonth = Math.floor(anchor.getMonth() / 3) * 3;
  return [0, 1, 2].map((i) => new Date(anchor.getFullYear(), quarterStartMonth + i, 1));
}

/** 12 дат начала месяцев календарного года `anchor`. */
export function getYearMonths(anchor: Date): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(anchor.getFullYear(), i, 1));
}

export function shiftAnchor(date: Date, scale: CalendarScale, direction: 1 | -1): Date {
  switch (scale) {
    case 'day':
      return addDays(date, direction);
    case 'week':
      return addDays(date, 7 * direction);
    case 'month':
      return addMonths(date, direction);
    case 'quarter':
      return addMonths(date, 3 * direction);
    case 'year':
      return addMonths(date, 12 * direction);
  }
}

/** Тренировочный день, чей `weekday` совпадает с днём недели `date` (программа повторяется бессрочно). */
export function findWorkoutForDate<T extends { weekday: number | null }>(
  workoutDays: T[],
  date: Date
): T | undefined {
  const idx = mondayIndex(date);
  return workoutDays.find((d) => d.weekday === idx);
}

export function formatDayLabel(date: Date): string {
  return `${WEEKDAY_FULL[mondayIndex(date)]}, ${date.getDate()} ${MONTH_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatWeekLabel(weekDates: Date[]): string {
  const start = weekDates[0];
  const end = weekDates[6];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_GENITIVE[start.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTH_GENITIVE[start.getMonth()]} – ${end.getDate()} ${MONTH_GENITIVE[end.getMonth()]}`;
}

export function formatMonthLabel(date: Date): string {
  return `${MONTH_NOMINATIVE[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatQuarterLabel(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${quarter}-й квартал ${date.getFullYear()}`;
}

export function formatYearLabel(date: Date): string {
  return `${date.getFullYear()}`;
}

export function formatScaleLabel(scale: CalendarScale, anchor: Date): string {
  switch (scale) {
    case 'day':
      return formatDayLabel(anchor);
    case 'week':
      return formatWeekLabel(getWeekDates(anchor));
    case 'month':
      return formatMonthLabel(anchor);
    case 'quarter':
      return formatQuarterLabel(anchor);
    case 'year':
      return formatYearLabel(anchor);
  }
}
