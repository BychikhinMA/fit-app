// Запуск: `npm test` (встроенный node:test, Node 24 сам снимает TS-типы с импортируемого .ts).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { findWorkoutForDate, mondayIndex, swappedWeekdays } from './calendar-dates.ts';

// Неделя 28.09.2026 (Пн) — 04.10.2026 (Вс), месяцы в Date с нуля.
const date = (day, month = 9) => new Date(2026, month - 1, day);

function makePlan() {
  return [
    { id: 'd1', weekday: 0 },
    { id: 'd2', weekday: 1 },
    { id: 'd3', weekday: 2 },
    { id: 'd4', weekday: 3 },
  ];
}

function weekIds(workoutDays, exceptions, monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return findWorkoutForDate(workoutDays, d, exceptions)?.id ?? null;
  });
}

describe('swappedWeekdays', () => {
  test('регрессия N1: постоянный своп после разового не ставит два дня на один weekday', () => {
    const workoutDays = makePlan();

    // Шаг 1: разово поменять местами День 1 (Пн 28.09) и День 3 (Ср 30.09) — как swapOnce.
    let exceptions = [
      { date: '2026-09-30', kind: 'scheduled', workout_day_id: 'd1' },
      { date: '2026-09-28', kind: 'scheduled', workout_day_id: 'd3' },
    ];

    // Шаг 2: День 1 открыт на среде 30.09 → «Перенести» → вторник 29.09 → «Теперь всегда».
    const originDate = date(30);
    const targetDate = date(29);
    const movingDay = findWorkoutForDate(workoutDays, originDate, exceptions);
    assert.equal(movingDay.id, 'd1');
    // Постоянный конфликт — по weekday, как findConflict(…, 'forever').
    const conflictingDay = workoutDays.find(
      (d) => d.weekday === mondayIndex(targetDate) && d.id !== movingDay.id
    );
    assert.equal(conflictingDay.id, 'd2');
    // Сам баг: weekday даты открытия экрана не совпадает с постоянным weekday Дня 1.
    assert.notEqual(mondayIndex(originDate), movingDay.weekday);

    // «Поменять местами» — как swapForever: clearForwardSchedule обоих + два weekday-апдейта.
    const weekdays = swappedWeekdays(movingDay, conflictingDay);
    movingDay.weekday = weekdays.moving;
    conflictingDay.weekday = weekdays.conflicting;
    exceptions = exceptions.filter(
      (e) => !(e.kind === 'scheduled' && [movingDay.id, conflictingDay.id].includes(e.workout_day_id))
    );

    // Шаг 3: у всех дней разные weekday, День 2 и День 3 не совпадают.
    const byId = Object.fromEntries(workoutDays.map((d) => [d.id, d.weekday]));
    assert.deepEqual(byId, { d1: 1, d2: 0, d3: 2, d4: 3 });
    assert.notEqual(byId.d2, byId.d3);

    // Со следующей недели (без исключений) Пн и Ср заняты, ни один день не пропал.
    assert.deepEqual(weekIds(workoutDays, exceptions, date(5, 10)), ['d2', 'd1', 'd3', 'd4', null, null, null]);
  });

  test('обычный постоянный своп без исключений меняет weekday местами', () => {
    const [d1, d2] = makePlan();
    assert.deepEqual(swappedWeekdays(d1, d2), { moving: 1, conflicting: 0 });
  });

  test('без постоянного weekday своп навсегда отклоняется, а не обнуляет день', () => {
    assert.throws(() => swappedWeekdays({ weekday: null }, { weekday: 2 }));
    assert.throws(() => swappedWeekdays({ weekday: 2 }, { weekday: null }));
  });
});
