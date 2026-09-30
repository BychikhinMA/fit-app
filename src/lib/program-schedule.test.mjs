// Запуск: `npm test`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  assignWeekdays,
  defaultWeekdays,
  getScheduleFacts,
  isActiveOn,
  programState,
  workoutForDate,
  workoutStatus,
} from './program-schedule.ts';

// Месяцы с единицы для читаемости; 2026-09-28 — понедельник.
const d = (month, day) => new Date(2026, month - 1, day);
const days = [
  { id: 'd1', weekday: 0, sort_order: 0 },
  { id: 'd2', weekday: 2, sort_order: 1 },
  { id: 'd3', weekday: 4, sort_order: 2 },
];
const open = (started_on) => ({ started_on, ended_on: null, end_reason: null });
const closed = (started_on, ended_on, end_reason) => ({ started_on, ended_on, end_reason });

describe('programState', () => {
  test('без периодов — не запущена', () => {
    assert.deepEqual(programState([], d(9, 28)), { kind: 'not_started' });
  });
  test('открытый период с прошлым/сегодняшним стартом — активна', () => {
    assert.deepEqual(programState([open('2026-09-28')], d(9, 28)), { kind: 'active', since: '2026-09-28' });
  });
  test('открытый период с будущим стартом — запланирован старт', () => {
    assert.deepEqual(programState([open('2026-10-05')], d(9, 28)), { kind: 'scheduled', startsOn: '2026-10-05' });
  });
  test('последний период закрыт паузой — на паузе', () => {
    const periods = [closed('2026-09-01', '2026-09-10', 'stop'), closed('2026-09-14', '2026-09-20', 'pause')];
    assert.deepEqual(programState(periods, d(9, 28)), { kind: 'paused', since: '2026-09-20' });
  });
  // Старт и пауза в один день, затем «Продолжить» и «Остановить» в тот же день:
  // оба периода нулевой длины с одним started_on. Последний — по created_at,
  // а не по порядку строк из базы.
  test('периоды с одной датой — последний по created_at', () => {
    const paused = { ...closed('2026-09-29', '2026-09-29', 'pause'), created_at: '2026-09-29T18:06:00Z' };
    const stopped = { ...closed('2026-09-29', '2026-09-29', 'stop'), created_at: '2026-09-29T18:10:00Z' };
    const expected = { kind: 'stopped', since: '2026-09-29' };
    assert.deepEqual(programState([paused, stopped], d(9, 30)), expected);
    assert.deepEqual(programState([stopped, paused], d(9, 30)), expected);
  });
  test('периоды с одной датой — после стопа в тот же день дни не на паузе', () => {
    const paused = { ...closed('2026-09-28', '2026-09-28', 'pause'), created_at: '2026-09-28T10:00:00Z' };
    const stopped = { ...closed('2026-09-28', '2026-09-28', 'stop'), created_at: '2026-09-28T10:05:00Z' };
    const input = { workoutDays: days, exceptions: [], periods: [stopped, paused], workoutLogs: [] };
    const facts = getScheduleFacts(input, d(9, 28), d(9, 30), d(9, 30));
    assert.deepEqual([...new Set(facts.map((f) => f.status))], ['not_started']);
  });
  test('последний период закрыт стопом — остановлена', () => {
    assert.deepEqual(programState([closed('2026-09-14', '2026-09-20', 'stop')], d(9, 28)), {
      kind: 'stopped',
      since: '2026-09-20',
    });
  });
  test('перезапуск с будущей даты после стопа — запланирован старт', () => {
    const periods = [closed('2026-09-14', '2026-09-20', 'stop'), open('2026-10-05')];
    assert.deepEqual(programState(periods, d(9, 28)), { kind: 'scheduled', startsOn: '2026-10-05' });
  });
});

describe('isActiveOn', () => {
  const periods = [closed('2026-09-14', '2026-09-28', 'pause'), open('2026-10-01')];
  test('до первого старта — нет', () => assert.equal(isActiveOn(periods, d(9, 13)), false));
  test('день старта — да', () => assert.equal(isActiveOn(periods, d(9, 14)), true));
  test('день перед закрытием — да', () => assert.equal(isActiveOn(periods, d(9, 27)), true));
  test('день закрытия (ended_on) — нет', () => assert.equal(isActiveOn(periods, d(9, 28)), false));
  test('внутри паузы — нет', () => assert.equal(isActiveOn(periods, d(9, 30)), false));
  test('после возобновления, в будущем — да', () => assert.equal(isActiveOn(periods, d(12, 31)), true));
  test('пауза и продолжение в один день — день снова активен', () => {
    const sameDay = [closed('2026-09-14', '2026-09-28', 'pause'), open('2026-09-28')];
    assert.equal(isActiveOn(sameDay, d(9, 28)), true);
  });
});

describe('workoutForDate', () => {
  test('вне периодов — ничего, даже если по weekday тренировка', () => {
    assert.equal(workoutForDate(days, d(9, 28), [], []), undefined);
  });
  test('в активном периоде — как findWorkoutForDate', () => {
    assert.equal(workoutForDate(days, d(9, 28), [], [open('2026-09-28')])?.id, 'd1');
  });
  test('исключение учитывается внутри периода', () => {
    const exceptions = [{ date: '2026-09-28', kind: 'cancelled', workout_day_id: null }];
    assert.equal(workoutForDate(days, d(9, 28), exceptions, [open('2026-09-28')]), undefined);
  });
});

describe('defaultWeekdays', () => {
  test('равномерный разнос', () => {
    assert.deepEqual(defaultWeekdays(2), [0, 3]);
    assert.deepEqual(defaultWeekdays(3), [0, 2, 4]);
    assert.deepEqual(defaultWeekdays(4), [0, 1, 3, 4]);
    assert.deepEqual(defaultWeekdays(5), [0, 1, 2, 4, 5]);
    assert.deepEqual(defaultWeekdays(6), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(defaultWeekdays(7), [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(defaultWeekdays(1), [0]);
  });
  test('вне 1..7 — ошибка', () => {
    assert.throws(() => defaultWeekdays(0));
    assert.throws(() => defaultWeekdays(8));
  });
});

describe('assignWeekdays', () => {
  test('дни по sort_order ложатся на выбранные дни по возрастанию', () => {
    const shuffled = [days[2], days[0], days[1]];
    assert.deepEqual(assignWeekdays(shuffled, [5, 1, 3]), [
      { id: 'd1', weekday: 1 },
      { id: 'd2', weekday: 3 },
      { id: 'd3', weekday: 5 },
    ]);
  });
  test('число дней не совпадает — ошибка', () => {
    assert.throws(() => assignWeekdays(days, [0, 2]));
  });
  test('повторы или значения вне 0..6 — ошибка', () => {
    assert.throws(() => assignWeekdays(days, [0, 0, 2]));
    assert.throws(() => assignWeekdays(days, [0, 2, 7]));
  });
});

describe('workoutStatus', () => {
  const logs = [{ date: '2026-09-21', workout_day_id: 'd1', completed: true }];
  test('есть отметка — выполнено', () => assert.equal(workoutStatus(d(9, 21), 'd1', logs, d(9, 28)), 'done'));
  test('прошлое без отметки — пропущено', () => assert.equal(workoutStatus(d(9, 23), 'd2', logs, d(9, 28)), 'missed'));
  test('сегодня без отметки — впереди', () => assert.equal(workoutStatus(d(9, 28), 'd1', logs, d(9, 28)), 'planned'));
  test('отметка с completed=false не считается', () => {
    assert.equal(workoutStatus(d(9, 23), 'd2', [{ date: '2026-09-23', workout_day_id: 'd2', completed: false }], d(9, 28)), 'missed');
  });
  // Регрессия: у Марии на 29.09 стоит День 1, а отметка осталась от Дня 2
  // (до смены дней недели) — «Выполнено» не снималось.
  test('отметка другого дня на ту же дату не считается', () => {
    const other = [{ date: '2026-09-29', workout_day_id: 'd2', completed: true }];
    assert.equal(workoutStatus(d(9, 29), 'd1', other, d(9, 30)), 'missed');
    assert.equal(workoutStatus(d(9, 29), 'd2', other, d(9, 30)), 'done');
  });
  test('две отметки на одну дату — каждый день видит только свою', () => {
    const both = [
      { date: '2026-09-29', workout_day_id: 'd1', completed: true },
      { date: '2026-09-29', workout_day_id: 'd2', completed: true },
    ];
    assert.equal(workoutStatus(d(9, 29), 'd1', both, d(9, 30)), 'done');
    // После «Снять отметку» у d1 остаётся только чужая запись — d1 больше не выполнен.
    const afterUnmark = both.filter((l) => l.workout_day_id !== 'd1');
    assert.equal(workoutStatus(d(9, 29), 'd1', afterUnmark, d(9, 30)), 'missed');
  });
  test('отметка без workout_day_id (план пересобран) не считается', () => {
    assert.equal(workoutStatus(d(9, 21), 'd1', [{ date: '2026-09-21', workout_day_id: null, completed: true }], d(9, 28)), 'missed');
  });
});

describe('getScheduleFacts', () => {
  const input = {
    workoutDays: days,
    exceptions: [],
    // Активна 14–20.09, пауза с 21.09, снова активна с 28.09.
    periods: [closed('2026-09-14', '2026-09-21', 'pause'), open('2026-09-28')],
    // 14.09 отмечен d1 (стоит по расписанию); 16.09 — отметка чужого дня d3
    // (осталась после смены дней недели), d2 на 16.09 она не закрывает.
    workoutLogs: [
      { date: '2026-09-14', workout_day_id: 'd1', completed: true },
      { date: '2026-09-16', workout_day_id: 'd3', completed: true },
    ],
  };
  const facts = getScheduleFacts(input, d(9, 7), d(10, 2), d(9, 30));

  test('до первого старта — not_started только на днях с тренировкой', () => {
    assert.deepEqual(
      facts.filter((f) => f.date < '2026-09-14'),
      [
        { date: '2026-09-07', status: 'not_started', workoutDayId: 'd1' },
        { date: '2026-09-09', status: 'not_started', workoutDayId: 'd2' },
        { date: '2026-09-11', status: 'not_started', workoutDayId: 'd3' },
      ]
    );
  });
  test('в активном периоде: выполнено / пропущено, дни отдыха не попадают', () => {
    assert.deepEqual(
      facts.filter((f) => f.date >= '2026-09-14' && f.date < '2026-09-21'),
      [
        { date: '2026-09-14', status: 'done', workoutDayId: 'd1' },
        { date: '2026-09-16', status: 'missed', workoutDayId: 'd2' },
        { date: '2026-09-18', status: 'missed', workoutDayId: 'd3' },
      ]
    );
  });
  test('в паузе — paused', () => {
    assert.deepEqual(
      facts.filter((f) => f.date >= '2026-09-21' && f.date < '2026-09-28').map((f) => f.status),
      ['paused', 'paused', 'paused']
    );
  });
  test('после возобновления: прошлое пропущено, сегодня и дальше впереди', () => {
    assert.deepEqual(
      facts.filter((f) => f.date >= '2026-09-28'),
      [
        { date: '2026-09-28', status: 'missed', workoutDayId: 'd1' },
        { date: '2026-09-30', status: 'planned', workoutDayId: 'd2' },
        { date: '2026-10-02', status: 'planned', workoutDayId: 'd3' },
      ]
    );
  });
  test('после стопа — not_started', () => {
    const stopped = { ...input, periods: [closed('2026-09-14', '2026-09-21', 'stop')] };
    const after = getScheduleFacts(stopped, d(9, 21), d(9, 27), d(9, 30));
    assert.deepEqual([...new Set(after.map((f) => f.status))], ['not_started']);
  });
});
