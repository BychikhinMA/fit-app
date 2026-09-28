# Этап 1 roadmap: режим программы и факт тренировки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Программа запускается/ставится на паузу/останавливается с историей периодов, тренировки идут в выбранные дни недели и показываются только в активные периоды, тренировку можно отметить выполненной, календарь показывает выполнено/пропущено/впереди.

**Architecture:** Вся логика «что показывать на дату» и «какой статус у тренировки» — чистые функции в новом `src/lib/program-schedule.ts` (покрыт `npm test`). Мутации в Supabase — тонкий `src/lib/program-lifecycle.ts` по образцу `reschedule.ts`. Новая таблица `program_periods` (миграция `0008`), отметки — в существующую `workout_logs`. UI: блок «Программа» и шторки на вкладке «Тренировки», состояния на Главной, кнопка отметки на экране тренировки.

**Tech Stack:** Expo SDK 57 / React Native Web / expo-router, Supabase (PostgREST), `node:test` (Node 24, снятие TS-типов).

**Spec:** `docs/superpowers/specs/2026-09-28-program-lifecycle-design.md` (альтернативы — `...-alternatives.md`).

## Global Constraints

- Никаких новых npm-зависимостей.
- Миграции применяет владелец вручную (Dashboard → SQL Editor); после применения — `NOTIFY pgrst, 'reload schema'` и REST-запрос к новой таблице с ответом `200` (правило проекта: всегда проверять кэш PostgREST после миграции с новой таблицей).
- Типы `src/types/database.ts` правятся руками синхронно с миграцией.
- Даты — локальные `YYYY-MM-DD` через `toISODate` (не `toISOString`).
- Период покрывает `[started_on, ended_on)`: день `ended_on` не входит.
- Цвета: `accent` — только заливки и иконки, акцентный текст — `accentText`, текст на акцентной заливке — `onAccent`; ошибки — токен `error`.
- Тексты ошибок — `Не получилось <действие>: ${errorMessage(err, 'неизвестная ошибка')}`.
- Системные диалоги (`window.confirm`/`Alert`) не использовать — подтверждения внутри приложения.
- Touch-target ≥ 44pt (`minHeight: 44`).
- Файлы вне плана не трогать без согласования с владельцем.
- Перед кодом на Expo сверяться с https://docs.expo.dev/versions/v57.0.0/ (AGENTS.md).

## Review Focus

1. **Граница дня паузы.** Пауза, нажатая сегодня, прячет сегодняшнюю тренировку; «Продолжить» в тот же день возвращает её. → тесты `isActiveOn` в Task 1.
2. **Двойное нажатие «Начать»/«Продолжить».** Второй открытый период не должен появиться: уникальный частичный индекс в `0008` + кнопка заблокирована во время сохранения; ошибка индекса показывается текстом. → Task 2 (индекс), Task 5 (`isSaving`), живая проверка в Task 8.
3. **Выбрано не столько дней, сколько в программе.** Сохранить нельзя; `assignWeekdays` бросает ошибку при несовпадении. → тест в Task 1, UI в Task 5.
4. **Повторная отметка и снятие отметки.** Двойное нажатие не создаёт дубль (уникальный индекс + upsert), снятие удаляет запись. → Task 2, Task 7, живая проверка.
5. **Пересборка плана через онбординг при активной программе.** Новая программа — «Не запущена», старые отметки остаются с `workout_day_id = null` и всё равно считаются выполнением на свою дату. → тест `getScheduleFacts` с `workout_day_id: null` в Task 1.

---

## File Structure

| Файл | Ответственность |
|---|---|
| `tsconfig.json` (изм.) | `allowImportingTsExtensions: true` — чтобы чистые модули импортировали друг друга с `.ts` и тестировались `node:test` |
| `src/lib/program-schedule.ts` (нов.) | чистая логика: состояние программы, активность даты, тренировка на дату, раскладка дней, статус тренировки, факты для Этапа 3 |
| `src/lib/program-schedule.test.mjs` (нов.) | тесты к нему |
| `supabase/migrations/0008_program_periods.sql` (нов.) | таблица `program_periods` + RLS + уникальный индекс в `workout_logs` |
| `src/types/database.ts` (изм.) | тип `program_periods` |
| `src/lib/load-plan.ts` (изм.) | `PlanData.periods`, `PlanData.workoutLogs` |
| `src/lib/program-lifecycle.ts` (нов.) | мутации: старт/пауза/продолжить/стоп/отмена старта, смена дней, отметка |
| `src/components/sheet.tsx` (нов.) | общий каркас шторки (Modal + подложка + ScrollView, maxWidth 480) |
| `src/components/workout-day/reschedule-sheet.tsx` (изм.) | переходит на `Sheet` |
| `src/components/program/weekday-picker.tsx` (нов.) | 7 чипов Пн…Вс, ровно N выбранных |
| `src/components/program/start-program-sheet.tsx` (нов.) | шторка «Начать»: дата старта + дни |
| `src/components/program/edit-weekdays-sheet.tsx` (нов.) | шторка «Изменить дни» |
| `src/components/program/program-controls.tsx` (нов.) | блок «Программа» на вкладке «Тренировки» |
| `src/components/calendar/*.tsx` (изм.) | учёт периодов + статусы в День/Неделя/Месяц |
| `src/components/workout-day/reschedule-date-picker.tsx` (изм.) | учёт периодов |
| `src/app/(tabs)/workouts.tsx`, `src/app/(tabs)/home.tsx` (изм.) | состояния программы, перезагрузка при фокусе |
| `src/app/workout-day/[id].tsx` (изм.) | учёт периодов, кнопка «Отметить выполненной» |
| `src/lib/plan-stub.ts` (изм.) | равномерный разнос дней |

---

### Task 1: Чистая логика расписания

**Files:**
- Modify: `tsconfig.json`
- Create: `src/lib/program-schedule.ts`
- Test: `src/lib/program-schedule.test.mjs`

**Interfaces:**
- Consumes: из `src/lib/calendar-dates.ts` — `findWorkoutForDate`, `toISODate`, тип `WorkoutDayException`.
- Produces (используют Tasks 3–8):
  ```ts
  export type ProgramPeriod = { started_on: string; ended_on: string | null; end_reason: 'pause' | 'stop' | null };
  export type WorkoutLogFact = { date: string; workout_day_id: string | null; completed: boolean };
  export type ProgramState =
    | { kind: 'not_started' }
    | { kind: 'scheduled'; startsOn: string }
    | { kind: 'active'; since: string }
    | { kind: 'paused'; since: string }
    | { kind: 'stopped'; since: string };
  export type WorkoutStatus = 'done' | 'missed' | 'planned';
  export type DayFact = { date: string; status: 'done' | 'missed' | 'planned' | 'paused' | 'not_started'; workoutDayId: string | null };
  export type ScheduleInput<T extends { id: string; weekday: number | null }> = {
    workoutDays: T[]; exceptions: WorkoutDayException[]; periods: ProgramPeriod[]; workoutLogs: WorkoutLogFact[];
  };
  export function programState(periods: ProgramPeriod[], today: Date): ProgramState;
  export function isActiveOn(periods: ProgramPeriod[], date: Date): boolean;
  export function workoutForDate<T extends { id: string; weekday: number | null }>(workoutDays: T[], date: Date, exceptions: WorkoutDayException[], periods: ProgramPeriod[]): T | undefined;
  export function defaultWeekdays(count: number): number[];
  export function assignWeekdays(days: { id: string; sort_order: number }[], weekdays: number[]): { id: string; weekday: number }[];
  export function workoutStatus(date: Date, logs: WorkoutLogFact[], today: Date): WorkoutStatus;
  export function getScheduleFacts<T extends { id: string; weekday: number | null }>(input: ScheduleInput<T>, from: Date, to: Date, today: Date): DayFact[];
  ```

- [ ] **Step 1: Разрешить импорт `.ts` в `tsconfig.json`**

В `compilerOptions` добавить строку перед `"strict": true`:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 2: Написать падающие тесты** — `src/lib/program-schedule.test.mjs`:

```js
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
  test('есть отметка — выполнено', () => assert.equal(workoutStatus(d(9, 21), logs, d(9, 28)), 'done'));
  test('прошлое без отметки — пропущено', () => assert.equal(workoutStatus(d(9, 23), logs, d(9, 28)), 'missed'));
  test('сегодня без отметки — впереди', () => assert.equal(workoutStatus(d(9, 28), logs, d(9, 28)), 'planned'));
  test('отметка с completed=false не считается', () => {
    assert.equal(workoutStatus(d(9, 23), [{ date: '2026-09-23', workout_day_id: 'd2', completed: false }], d(9, 28)), 'missed');
  });
});

describe('getScheduleFacts', () => {
  const input = {
    workoutDays: days,
    exceptions: [],
    // Активна 14–20.09, пауза с 21.09, снова активна с 28.09.
    periods: [closed('2026-09-14', '2026-09-21', 'pause'), open('2026-09-28')],
    // Отметка без workout_day_id (план пересобран) всё равно считается выполнением.
    workoutLogs: [{ date: '2026-09-14', workout_day_id: null, completed: true }],
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
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL — `Cannot find module .../program-schedule.ts`.

- [ ] **Step 4: Реализовать** — `src/lib/program-schedule.ts`:

```ts
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
```

- [ ] **Step 5: Прогнать тесты**

Run: `npm test`
Expected: PASS — все прежние 9 + новые тесты `program-schedule`.

- [ ] **Step 6: Проверить, что `.ts`-импорт не ломает tsc, eslint и Metro**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib && echo ok`
Expected: `ok`.

Затем временно, только для проверки бандла, добавить в `src/app/(tabs)/home.tsx` строку `import '@/lib/program-schedule';`, запустить `npx expo start --web --port 8081` в фоне, выполнить `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8081/home"` — ожидать `200` и отсутствие `Unable to resolve` в выводе сервера. Убрать временный импорт, остановить сервер.

- [ ] **Step 7: Коммит**

```bash
git add tsconfig.json src/lib/program-schedule.ts src/lib/program-schedule.test.mjs
git commit -m "feat(program): pure schedule logic for program periods, weekdays and facts"
```

---

### Task 2: Миграция, типы, загрузка данных

**Files:**
- Create: `supabase/migrations/0008_program_periods.sql`
- Modify: `src/types/database.ts` (после блока `workout_day_exceptions`, ~стр. 155)
- Modify: `src/lib/load-plan.ts`

**Interfaces:**
- Consumes: `ProgramPeriod`, `WorkoutLogFact` из Task 1 (структурно совместимы с новыми Row-типами).
- Produces: `PlanData.periods: ProgramPeriodRow[]`, `PlanData.workoutLogs: WorkoutLogRow[]`; тип `program_periods` в `Database`.

- [ ] **Step 1: Миграция** — `supabase/migrations/0008_program_periods.sql`:

```sql
-- Этап 1 roadmap: режим программы (старт/пауза/стоп) и факт тренировки.
-- Дизайн: docs/superpowers/specs/2026-09-28-program-lifecycle-design.md.
-- Как применить: Supabase Dashboard -> SQL Editor -> вставить файл целиком -> Run.
-- После применения обязательно: REST-запрос
--   GET /rest/v1/program_periods?select=id&limit=1  -> HTTP 200
-- (если 404/PGRST205 — ещё раз `notify pgrst, 'reload schema';` и проверить
-- Settings -> API -> Exposed schemas).
--
-- Одна строка = один непрерывный период, когда программа шла. Период покрывает
-- даты [started_on, ended_on): день ended_on уже не входит. Открытый период
-- (ended_on is null) — программа идёт; закрыт с end_reason = 'pause' — пауза,
-- 'stop' — остановлена. Нет строк — программа ещё не запускалась.

create table if not exists program_periods (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  profile_id text not null references profiles(id) on delete cascade,
  started_on date not null,
  ended_on date,
  end_reason text check (end_reason in ('pause', 'stop')),
  created_at timestamptz not null default now(),
  constraint program_periods_end_consistency check ((ended_on is null) = (end_reason is null)),
  constraint program_periods_end_after_start check (ended_on is null or ended_on >= started_on)
);

create index if not exists program_periods_profile_idx on program_periods(profile_id);

-- Не больше одного открытого периода на программу (защита от двойного «Начать»).
create unique index if not exists program_periods_one_open_idx
  on program_periods(program_id) where ended_on is null;

alter table program_periods enable row level security;

drop policy if exists "anon full access" on program_periods;
create policy "anon full access" on program_periods
  for all
  to anon
  using (private.profile_owner_id(profile_id) is null)
  with check (private.profile_owner_id(profile_id) is null);

drop policy if exists "owner full access" on program_periods;
create policy "owner full access" on program_periods
  for all
  to authenticated
  using (private.profile_owner_id(profile_id) = auth.uid())
  with check (private.profile_owner_id(profile_id) = auth.uid());

-- Отметка «выполнено»: одна запись на профиль + дату + день программы.
-- workout_logs на момент миграции пуста (проверено 2026-09-28), индекс безопасен.
create unique index if not exists workout_logs_profile_date_day_unique
  on workout_logs(profile_id, date, workout_day_id);

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Попросить владельца применить миграцию и проверить кэш**

Остановиться и попросить владельца выполнить файл в SQL Editor. После ответа проверить:

Run: `set -a; . ./.env; set +a; curl -s -o /dev/null -w "%{http_code}\n" "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/program_periods?select=id&limit=1" -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"`
Expected: `200`. Если `404` — попросить владельца выполнить `notify pgrst, 'reload schema';` и повторить.

- [ ] **Step 3: Типы** — в `src/types/database.ts` сразу после блока `workout_day_exceptions: Table<...>;` добавить:

```ts
      program_periods: Table<
        {
          id: string;
          program_id: string;
          profile_id: ProfileId;
          /** YYYY-MM-DD, первый день периода (входит). */
          started_on: string;
          /** YYYY-MM-DD, день закрытия (уже НЕ входит); null — период открыт. */
          ended_on: string | null;
          end_reason: 'pause' | 'stop' | null;
          created_at: string;
        },
        {
          id?: string;
          program_id: string;
          profile_id: ProfileId;
          started_on: string;
          ended_on?: string | null;
          end_reason?: 'pause' | 'stop' | null;
        }
      >;
```

- [ ] **Step 4: `loadPlan`** — в `src/lib/load-plan.ts`:

После `type WorkoutDayExceptionRow = ...` добавить:

```ts
type ProgramPeriodRow = Database['public']['Tables']['program_periods']['Row'];
type WorkoutLogRow = Database['public']['Tables']['workout_logs']['Row'];
```

В `PlanData` после `exceptions: WorkoutDayExceptionRow[];` добавить:

```ts
  /** Периоды активной программы, по возрастанию started_on. Пусто — программа не запускалась. */
  periods: ProgramPeriodRow[];
  /** Все отметки тренировок профиля (факты, переживают пересборку плана). */
  workoutLogs: WorkoutLogRow[];
```

Внутри `loadPlan` сразу после блока `const { data: program } = ...maybeSingle();` добавить:

```ts
  let periods: ProgramPeriodRow[] = [];
  if (program) {
    const { data: periodsData, error: periodsError } = await supabase
      .from('program_periods')
      .select('*')
      .eq('program_id', program.id)
      .order('started_on');
    if (periodsError) throw periodsError;
    periods = periodsData ?? [];
  }

  const { data: workoutLogs, error: workoutLogsError } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('profile_id', profileId)
    .order('date');
  if (workoutLogsError) throw workoutLogsError;
```

И заменить `return` на:

```ts
  return {
    settings,
    program: program ?? null,
    workoutDays,
    exceptions: exceptions ?? [],
    periods,
    workoutLogs: workoutLogs ?? [],
    mealPlan: mealPlan ?? null,
    meals,
  };
```

(Ошибки периодов и отметок пробрасываются, а не глотаются как у `exceptions`: пустые периоды = «не запущена» и молча спрятали бы все тренировки.)

- [ ] **Step 5: Проверка**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib src/types && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: без ошибок tsc/eslint, `fail 0`.

- [ ] **Step 6: Коммит**

```bash
git add supabase/migrations/0008_program_periods.sql src/types/database.ts src/lib/load-plan.ts
git commit -m "feat(program): program_periods table, workout_logs uniqueness, load periods and logs"
```

---

### Task 3: Мутации жизненного цикла и отметок

**Files:**
- Create: `src/lib/program-lifecycle.ts`

**Interfaces:**
- Consumes: `assignWeekdays` (Task 1), `PlanData` (Task 2), `toISODate` (`calendar-dates.ts`), `supabase`.
- Produces (используют Tasks 5–7):
  ```ts
  export async function startProgram(profileId: ProfileId, programId: string, startDate: Date): Promise<void>;
  export async function pauseProgram(programId: string, today: Date): Promise<void>;
  export async function resumeProgram(profileId: ProfileId, programId: string, today: Date): Promise<void>;
  export async function stopProgram(programId: string, today: Date): Promise<void>;
  export async function cancelScheduledStart(programId: string): Promise<void>;
  export async function setWeekdays(profileId: ProfileId, workoutDays: { id: string; sort_order: number }[], weekdays: number[], today: Date): Promise<void>;
  export async function countFutureExceptions(profileId: ProfileId, today: Date): Promise<number>;
  export async function markWorkoutDone(entry: { profileId: ProfileId; workoutDayId: string; date: Date; dayLabel: string; contextUsed: string | null }): Promise<void>;
  export async function unmarkWorkoutDone(profileId: ProfileId, workoutDayId: string, date: Date): Promise<void>;
  ```

- [ ] **Step 1: Реализовать** — `src/lib/program-lifecycle.ts`:

```ts
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
  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('profile_id', profileId)
    .eq('workout_day_id', workoutDayId)
    .eq('date', toISODate(date));
  if (error) throw error;
}
```

- [ ] **Step 2: Проверка**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib && echo ok`
Expected: `ok`. (Мутации проверяются вживую в Task 8 — сетевой слой не покрыт `node:test`.)

- [ ] **Step 3: Коммит**

```bash
git add src/lib/program-lifecycle.ts
git commit -m "feat(program): Supabase mutations for program lifecycle, weekdays and workout marks"
```

---

### Task 4: Календарь и выбор даты учитывают периоды и статусы

**Files:**
- Modify: `src/components/calendar/day-view.tsx`, `week-view.tsx`, `month-view.tsx`, `month-mini.tsx`, `quarter-view.tsx`, `year-view.tsx`
- Modify: `src/components/workout-day/reschedule-date-picker.tsx`, `src/components/workout-day/reschedule-sheet.tsx`
- Modify: `src/app/(tabs)/workouts.tsx` (только проброс пропсов), `src/app/workout-day/[id].tsx` (проброс в `RescheduleSheet` и `isScheduledOnOrigin`)

**Interfaces:**
- Consumes: `workoutForDate`, `workoutStatus`, типы `ProgramPeriod`, `WorkoutLogFact` (Task 1); `PlanData.periods`, `PlanData.workoutLogs` (Task 2).
- Produces: у `DayView`/`WeekView`/`MonthView` новые пропсы `periods: PlanData['periods']` и `workoutLogs: PlanData['workoutLogs']`; у `MonthMini`/`QuarterView`/`YearView`/`RescheduleDatePicker`/`RescheduleSheet` — `periods: PlanData['periods']`.

- [ ] **Step 1: `WeekView`** — заменить импорт `findWorkoutForDate` на функции из `program-schedule`, добавить пропсы и статусы:

```tsx
import { WEEKDAY_FULL, WEEKDAY_SHORT, getWeekDates, isSameDay, toISODate } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';
import { workoutForDate, workoutStatus } from '@/lib/program-schedule';
```

Сигнатура:

```tsx
export function WeekView({
  anchor,
  workoutDays,
  exceptions,
  periods,
  workoutLogs,
}: {
  anchor: Date;
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
  periods: PlanData['periods'];
  workoutLogs: PlanData['workoutLogs'];
}) {
```

В цикле: `const day = workoutForDate(workoutDays, date, exceptions, periods);`. В ветке с тренировкой перед `return`:

```tsx
        const status = workoutStatus(date, workoutLogs, today);
        const statusLabel = { done: 'выполнено', missed: 'пропущено', planned: 'впереди' }[status];
```

`accessibilityLabel` дополнить: `` `${WEEKDAY_FULL[i]}, ${dateLabel} — ${day.day_label}, ${statusLabel}. Открыть` ``. Точку заменить на `<StatusMark status={status} />` (см. Step 4).

- [ ] **Step 2: `MonthView`** — те же изменения: импорты, пропсы `periods`, `workoutLogs`, `workoutForDate(workoutDays, date, exceptions, periods)`, `const status = workoutStatus(date, workoutLogs, today);`, подпись доступности `` `${formatDayLabel(date)} — ${day.day_label}, ${statusLabel}. Открыть` ``, точка → `<StatusMark status={status} size="small" />`.

- [ ] **Step 3: `DayView`** — пропсы `periods`, `workoutLogs`; `const day = workoutForDate(workoutDays, anchor, exceptions, periods);`; внутри карточки тренировки после строки с группами мышц:

```tsx
          <ThemedText type="small" themeColor={status === 'done' ? 'accentText' : 'textSecondary'}>
            {status === 'done' ? 'Выполнено ✓' : status === 'missed' ? 'Пропущено' : 'Впереди'}
          </ThemedText>
```

где `const status = day ? workoutStatus(anchor, workoutLogs, new Date()) : null;` (объявить после `day`). Если `day` нет — текст «Тренировки нет» оставить как есть.

- [ ] **Step 4: Общий маркер статуса** — Create `src/components/calendar/status-mark.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutStatus } from '@/lib/program-schedule';

/** Точка «впереди», галочка «выполнено», приглушённое кольцо «пропущено». Смысл дублируется в accessibilityLabel ячейки. */
export function StatusMark({ status, size = 'regular' }: { status: WorkoutStatus; size?: 'regular' | 'small' }) {
  const theme = useTheme();
  const dim = size === 'small' ? 5 : 6;

  if (status === 'done') {
    return (
      <ThemedText type="small" themeColor="accentText" style={styles.check}>
        ✓
      </ThemedText>
    );
  }
  if (status === 'missed') {
    return (
      <View
        style={{ width: dim, height: dim, borderRadius: dim / 2, borderWidth: 1, borderColor: theme.textSecondary }}
      />
    );
  }
  return <View style={{ width: dim, height: dim, borderRadius: dim / 2, backgroundColor: theme.accent }} />;
}

const styles = StyleSheet.create({
  check: { lineHeight: 12 },
});
```

(В `WeekView`/`MonthView` удалить ставший ненужным стиль `dot`.) Добавить `src/components/calendar/status-mark.tsx` в список файлов коммита.

- [ ] **Step 5: `MonthMini`, `QuarterView`, `YearView`** — добавить проп `periods: PlanData['periods']`, пробросить сверху вниз; в `MonthMini` заменить `findWorkoutForDate(workoutDays, date, exceptions)` на `workoutForDate(workoutDays, date, exceptions, periods)` (импорт из `@/lib/program-schedule`, `findWorkoutForDate` убрать из импорта `calendar-dates`).

- [ ] **Step 6: `RescheduleDatePicker` и `RescheduleSheet`** — в обоих добавить проп `periods: PlanData['periods']`; `RescheduleSheet` пробрасывает его в `RescheduleDatePicker`; в пикере `const hasWorkout = inMonth && workoutForDate(workoutDays, date, exceptions, periods) !== undefined;`.

- [ ] **Step 7: Проброс в экраны**
  - `src/app/(tabs)/workouts.tsx`: `const { program, workoutDays, exceptions, periods, workoutLogs } = data;` и передать `periods` во все пять видов, `workoutLogs` — в `DayView`/`WeekView`/`MonthView`.
  - `src/app/workout-day/[id].tsx`: импорт `workoutForDate` из `@/lib/program-schedule` вместо `findWorkoutForDate`; в `isScheduledOnOrigin` — `workoutForDate(planData.workoutDays, originDate, planData.exceptions, planData.periods)?.id === id`; в `<RescheduleSheet ... periods={planData.periods} />`. Комментарий над `isScheduledOnOrigin` дополнить: «…и только в активном периоде программы — на паузе переносить нечего».

- [ ] **Step 8: Проверка**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: без ошибок, `fail 0`. `grep -rn "findWorkoutForDate" src/components src/app` — пусто (прямых вызовов в UI не осталось).

- [ ] **Step 9: Коммит**

```bash
git add src/components/calendar src/components/workout-day/reschedule-date-picker.tsx src/components/workout-day/reschedule-sheet.tsx "src/app/(tabs)/workouts.tsx" "src/app/workout-day/[id].tsx"
git commit -m "feat(calendar): show workouts only in active program periods, with done/missed/planned marks"
```

---

### Task 5: Шторки и блок «Программа» на вкладке «Тренировки»

**Files:**
- Create: `src/components/sheet.tsx`
- Modify: `src/components/workout-day/reschedule-sheet.tsx` (переход на `Sheet`)
- Create: `src/components/program/weekday-picker.tsx`, `start-program-sheet.tsx`, `edit-weekdays-sheet.tsx`, `program-controls.tsx`
- Modify: `src/app/(tabs)/workouts.tsx`
- Modify: `docs/superpowers/specs/2026-09-28-program-lifecycle-design.md` (дата старта — три варианта)

**Interfaces:**
- Consumes: `programState`, `defaultWeekdays`, `ProgramState` (Task 1); мутации Task 3; `PlanData` (Task 2); `Chip`; `errorMessage`.
- Produces:
  ```tsx
  export function Sheet(props: { visible: boolean; onClose: () => void; children: React.ReactNode }): JSX.Element;
  export function WeekdayPicker(props: { selected: number[]; required: number; onChange: (next: number[]) => void }): JSX.Element;
  export function StartProgramSheet(props: { visible: boolean; onClose: () => void; profileId: ProfileId; plan: PlanData; onDone: () => void }): JSX.Element;
  export function EditWeekdaysSheet(props: { visible: boolean; onClose: () => void; profileId: ProfileId; plan: PlanData; onDone: () => void }): JSX.Element;
  export function ProgramControls(props: { profileId: ProfileId; plan: PlanData; onChanged: () => void }): JSX.Element;
  ```
  `ProgramControls` сам открывает `StartProgramSheet` и `EditWeekdaysSheet`. Task 6 переиспользует `StartProgramSheet`.

- [ ] **Step 1: `Sheet`** — Create `src/components/sheet.tsx` (вынос каркаса из `RescheduleSheet` без изменения поведения):

```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Нижняя шторка: подложка на весь экран, на широком экране — не шире 480, прокручивается. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <ScrollView
          style={[styles.sheet, { backgroundColor: theme.background }, Elevation.card]}
          contentContainerStyle={styles.sheetContent}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    flexGrow: 0,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    alignSelf: 'center',
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
  },
  sheetContent: { padding: Spacing.four, gap: Spacing.three },
});
```

В `reschedule-sheet.tsx` заменить `<Modal ...><View style={styles.overlay}><Pressable backdrop/><ScrollView ...>…</ScrollView></View></Modal>` на `<Sheet visible={visible} onClose={handleClose}>…</Sheet>`, удалить из его стилей `overlay`, `backdrop`, `sheet`, `sheetContent` и неиспользуемые импорты (`Modal`, `ScrollView`, `Elevation`, `Radius`).

- [ ] **Step 2: `WeekdayPicker`** — Create `src/components/program/weekday-picker.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WEEKDAY_SHORT } from '@/lib/calendar-dates';

export function WeekdayPicker({
  selected,
  required,
  onChange,
}: {
  selected: number[];
  required: number;
  onChange: (next: number[]) => void;
}) {
  function toggle(weekday: number) {
    onChange(
      selected.includes(weekday) ? selected.filter((w) => w !== weekday) : [...selected, weekday].sort((a, b) => a - b)
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {WEEKDAY_SHORT.map((label, weekday) => (
          <Chip key={label} label={label} selected={selected.includes(weekday)} onPress={() => toggle(weekday)} />
        ))}
      </View>
      <ThemedText type="small" themeColor={selected.length === required ? 'textSecondary' : 'error'}>
        Выбрано {selected.length} из {required} — по числу дней в программе
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
```

- [ ] **Step 3: `StartProgramSheet`** — Create `src/components/program/start-program-sheet.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { WeekdayPicker } from '@/components/program/weekday-picker';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatDayLabel } from '@/lib/calendar-dates';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import { setWeekdays, startProgram } from '@/lib/program-lifecycle';
import { defaultWeekdays } from '@/lib/program-schedule';
import type { ProfileId } from '@/types/database';

/** Текущие дни недели программы, если они корректны; иначе — равномерный разнос. */
export function initialWeekdays(workoutDays: PlanData['workoutDays']): number[] {
  const current = workoutDays.map((d) => d.weekday).filter((w): w is number => w !== null);
  const unique = [...new Set(current)].sort((a, b) => a - b);
  if (unique.length === workoutDays.length && workoutDays.length > 0) return unique;
  return defaultWeekdays(Math.min(7, Math.max(1, workoutDays.length)));
}

function startOptions(today: Date): { label: string; date: Date }[] {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  const daysToMonday = ((8 - base.getDay()) % 7) || 7;
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysToMonday);
  return [
    { label: 'Сегодня', date: base },
    { label: 'Завтра', date: tomorrow },
    { label: `С понедельника, ${monday.getDate()}.${String(monday.getMonth() + 1).padStart(2, '0')}`, date: monday },
  ];
}

export function StartProgramSheet({
  visible,
  onClose,
  profileId,
  plan,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  profileId: ProfileId;
  plan: PlanData;
  onDone: () => void;
}) {
  const options = startOptions(new Date());
  const [startIndex, setStartIndex] = useState(0);
  const [weekdays, setWeekdaysState] = useState(() => initialWeekdays(plan.workoutDays));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave = !isSaving && weekdays.length === plan.workoutDays.length && !!plan.program;

  async function handleStart() {
    if (!plan.program) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const today = new Date();
      const current = initialWeekdays(plan.workoutDays);
      if (current.join() !== weekdays.join()) await setWeekdays(profileId, plan.workoutDays, weekdays, today);
      await startProgram(profileId, plan.program.id, options[startIndex].date);
      onDone();
    } catch (err) {
      setSaveError(`Не получилось начать программу: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ThemedText type="smallBold">Когда начинаем</ThemedText>
      <View style={styles.row}>
        {options.map((option, i) => (
          <Chip key={option.label} label={option.label} selected={i === startIndex} onPress={() => setStartIndex(i)} />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Старт: {formatDayLabel(options[startIndex].date)}
      </ThemedText>

      <ThemedText type="smallBold">В какие дни тренируемся</ThemedText>
      <WeekdayPicker selected={weekdays} required={plan.workoutDays.length} onChange={setWeekdaysState} />

      <Pressable
        onPress={handleStart}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        style={[styles.action, !canSave && styles.disabled]}>
        <ThemedText type="linkPrimary">{isSaving ? 'Сохраняю…' : 'Начать программу'}</ThemedText>
      </Pressable>
      {saveError && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {saveError}
        </ThemedText>
      )}
      <Pressable onPress={onClose} style={styles.action} accessibilityRole="button">
        <ThemedText type="small" themeColor="textSecondary">
          Закрыть
        </ThemedText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  action: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
```

(`StartProgramSheet` монтировать только когда `visible`, чтобы начальное состояние бралось из свежего `plan`: `{isOpen && <StartProgramSheet visible … />}`.)

- [ ] **Step 4: `EditWeekdaysSheet`** — Create `src/components/program/edit-weekdays-sheet.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { initialWeekdays } from '@/components/program/start-program-sheet';
import { WeekdayPicker } from '@/components/program/weekday-picker';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import { countFutureExceptions, setWeekdays } from '@/lib/program-lifecycle';
import type { ProfileId } from '@/types/database';

export function EditWeekdaysSheet({
  visible,
  onClose,
  profileId,
  plan,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  profileId: ProfileId;
  plan: PlanData;
  onDone: () => void;
}) {
  const [weekdays, setWeekdaysState] = useState(() => initialWeekdays(plan.workoutDays));
  const [futureExceptions, setFutureExceptions] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave = !isSaving && weekdays.length === plan.workoutDays.length;

  useEffect(() => {
    countFutureExceptions(profileId, new Date())
      .then(setFutureExceptions)
      .catch((err) => console.error('Failed to count future reschedules:', err));
  }, [profileId]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await setWeekdays(profileId, plan.workoutDays, weekdays, new Date());
      onDone();
    } catch (err) {
      setSaveError(`Не получилось сохранить дни: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ThemedText type="smallBold">Дни тренировок</ThemedText>
      <WeekdayPicker selected={weekdays} required={plan.workoutDays.length} onChange={setWeekdaysState} />
      {futureExceptions > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Запланированные разовые переносы ({futureExceptions}) сбросятся — тренировки встанут по новым дням.
        </ThemedText>
      )}
      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        style={[styles.action, !canSave && styles.disabled]}>
        <ThemedText type="linkPrimary">{isSaving ? 'Сохраняю…' : 'Сохранить'}</ThemedText>
      </Pressable>
      {saveError && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {saveError}
        </ThemedText>
      )}
      <Pressable onPress={onClose} style={styles.action} accessibilityRole="button">
        <ThemedText type="small" themeColor="textSecondary">
          Закрыть
        </ThemedText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  action: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
```

- [ ] **Step 5: `ProgramControls`** — Create `src/components/program/program-controls.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EditWeekdaysSheet } from '@/components/program/edit-weekdays-sheet';
import { StartProgramSheet } from '@/components/program/start-program-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WEEKDAY_SHORT, formatDayLabel } from '@/lib/calendar-dates';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import { cancelScheduledStart, pauseProgram, resumeProgram, stopProgram } from '@/lib/program-lifecycle';
import { programState, type ProgramState } from '@/lib/program-schedule';
import type { ProfileId } from '@/types/database';

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function describeState(state: ProgramState): string {
  switch (state.kind) {
    case 'not_started':
      return 'Программа не запущена';
    case 'scheduled':
      return `Старт: ${formatDayLabel(isoToDate(state.startsOn))}`;
    case 'active':
      return `Идёт с ${formatDayLabel(isoToDate(state.since))}`;
    case 'paused':
      return `На паузе с ${formatDayLabel(isoToDate(state.since))}`;
    case 'stopped':
      return 'Программа завершена';
  }
}

export function ProgramControls({
  profileId,
  plan,
  onChanged,
}: {
  profileId: ProfileId;
  plan: PlanData;
  onChanged: () => void;
}) {
  const state = programState(plan.periods, new Date());
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const programId = plan.program?.id;
  const weekdaysLabel = [...new Set(plan.workoutDays.map((d) => d.weekday).filter((w): w is number => w !== null))]
    .sort((a, b) => a - b)
    .map((w) => WEEKDAY_SHORT[w])
    .join(', ');

  async function run(action: () => Promise<void>, failure: string) {
    setIsSaving(true);
    setActionError(null);
    try {
      await action();
      setConfirmStop(false);
      onChanged();
    } catch (err) {
      setActionError(`Не получилось ${failure}: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!programId) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{describeState(state)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Дни: {weekdaysLabel || 'не выбраны'}
      </ThemedText>

      <View style={styles.actions}>
        {(state.kind === 'not_started' || state.kind === 'stopped') && (
          <Action label={state.kind === 'stopped' ? 'Начать заново' : 'Начать'} primary disabled={isSaving} onPress={() => setIsStartOpen(true)} />
        )}
        {state.kind === 'paused' && (
          <Action
            label="Продолжить"
            primary
            disabled={isSaving}
            onPress={() => run(() => resumeProgram(profileId, programId, new Date()), 'продолжить программу')}
          />
        )}
        {state.kind === 'active' && (
          <Action
            label="Пауза"
            disabled={isSaving}
            onPress={() => run(() => pauseProgram(programId, new Date()), 'поставить на паузу')}
          />
        )}
        {state.kind === 'scheduled' && (
          <Action
            label="Отменить старт"
            disabled={isSaving}
            onPress={() => run(() => cancelScheduledStart(programId), 'отменить старт')}
          />
        )}
        {(state.kind === 'active' || state.kind === 'paused') && !confirmStop && (
          <Action label="Остановить" disabled={isSaving} onPress={() => setConfirmStop(true)} />
        )}
        <Action label="Изменить дни" disabled={isSaving} onPress={() => setIsDaysOpen(true)} />
      </View>

      {confirmStop && (
        <View style={styles.confirm}>
          <ThemedText type="small">
            Остановить программу? История тренировок сохранится, начать можно будет заново.
          </ThemedText>
          <View style={styles.actions}>
            <Action
              label="Да, остановить"
              primary
              disabled={isSaving}
              onPress={() => run(() => stopProgram(programId, new Date()), 'остановить программу')}
            />
            <Action label="Нет" disabled={isSaving} onPress={() => setConfirmStop(false)} />
          </View>
        </View>
      )}

      {actionError && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {actionError}
        </ThemedText>
      )}

      {isStartOpen && (
        <StartProgramSheet
          visible
          onClose={() => setIsStartOpen(false)}
          profileId={profileId}
          plan={plan}
          onDone={() => {
            setIsStartOpen(false);
            onChanged();
          }}
        />
      )}
      {isDaysOpen && (
        <EditWeekdaysSheet
          visible
          onClose={() => setIsDaysOpen(false)}
          profileId={profileId}
          plan={plan}
          onDone={() => {
            setIsDaysOpen(false);
            onChanged();
          }}
        />
      )}
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.action, disabled && styles.disabled]}>
      <ThemedText type={primary ? 'linkPrimary' : 'default'}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three },
  action: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  confirm: { gap: Spacing.one },
});
```

- [ ] **Step 6: Вкладка «Тренировки»** — в `src/app/(tabs)/workouts.tsx`:
  1. Перезагрузка при фокусе (данные меняются с других экранов). Импорт `useFocusEffect` из `expo-router`, `useCallback` из `react`. Заменить второй `useEffect` на:

  ```tsx
  const reload = useCallback(() => {
    if (!profileId) return;
    loadPlan(profileId)
      .then(setData)
      .catch((err) => setError(`Не получилось загрузить план: ${errorMessage(err, 'неизвестная ошибка')}`));
  }, [profileId]);

  useFocusEffect(reload);
  ```

  2. Импорт `ProgramControls` и `programState`. Внутри карточки программы сразу после `<ThemedText type="smallBold">{program.name}</ThemedText>` вставить:

  ```tsx
              {profileId && <ProgramControls profileId={profileId} plan={data} onChanged={reload} />}
  ```

  3. Над `ScaleSwitcher`, если `programState(periods, new Date()).kind === 'not_started'`, показать подсказку:

  ```tsx
              {programState(periods, new Date()).kind === 'not_started' && (
                <ThemedText type="small" themeColor="textSecondary">
                  Тренировки появятся в календаре после старта программы.
                </ThemedText>
              )}
  ```

- [ ] **Step 7: Правка спеки** — в `docs/superpowers/specs/2026-09-28-program-lifecycle-design.md`, раздел «Действия», пункт «Начать», заменить «дата старта (по умолчанию сегодня, можно выбрать будущую; прошедшую нельзя)» на «дата старта — «Сегодня» (по умолчанию), «Завтра» или «С понедельника»; прошедшую нельзя (уточнено в плане: три варианта вместо полного календаря — удобнее на телефоне)».

- [ ] **Step 8: Проверка**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: без ошибок, `fail 0`.

- [ ] **Step 9: Коммит**

```bash
git add src/components/sheet.tsx src/components/workout-day/reschedule-sheet.tsx src/components/program "src/app/(tabs)/workouts.tsx" docs/superpowers/specs/2026-09-28-program-lifecycle-design.md
git commit -m "feat(program): start/pause/resume/stop and weekday controls on the Workouts tab"
```

---

### Task 6: Главная по состояниям программы

**Files:**
- Modify: `src/app/(tabs)/home.tsx`

**Interfaces:**
- Consumes: `programState`, `workoutForDate`, `workoutStatus` (Task 1); `StartProgramSheet` (Task 5); `resumeProgram` (Task 3); `describeState` (Task 5, `program-controls.tsx`).
- Produces: —

- [ ] **Step 1: Перезагрузка при фокусе** — как в Task 5 Step 6.1 (`reload` + `useFocusEffect(reload)`).

- [ ] **Step 2: Состояния.** Импорты: `workoutForDate`, `workoutStatus`, `programState` из `@/lib/program-schedule` (убрать `findWorkoutForDate` из импорта `calendar-dates`), `StartProgramSheet` из `@/components/program/start-program-sheet`, `describeState` из `@/components/program/program-controls`, `resumeProgram` из `@/lib/program-lifecycle`. Состояния `const [isStartOpen, setIsStartOpen] = useState(false);`, `const [resumeError, setResumeError] = useState<string | null>(null);`.

Вычисления после `const { settings, program, workoutDays, exceptions } = data;` (добавить `periods`, `workoutLogs` в деструктуризацию):

```tsx
  const state = programState(periods, todayDate);
  const today = workoutForDate(workoutDays, todayDate, exceptions, periods);
  const todayStatus = today ? workoutStatus(todayDate, workoutLogs, todayDate) : null;
```

Заменить блок `{today ? (...) : program ? (...) : (...)}` на:

```tsx
          {!program ? (
            <ThemedText type="small" themeColor="textSecondary">
              План ещё не построен — пройди онбординг во вкладке «Профиль», чтобы получить
              программу.
            </ThemedText>
          ) : state.kind === 'not_started' || state.kind === 'stopped' ? (
            <ThemedView type="backgroundElement" style={styles.heroCard}>
              <ThemedText type="smallBold" themeColor="accentText">
                {state.kind === 'stopped' ? 'ПРОГРАММА ЗАВЕРШЕНА' : 'ПРОГРАММА ГОТОВА'}
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                {workoutDays.length} тренировки в неделю. Выбери дату старта и дни.
              </ThemedText>
              <Pressable onPress={() => setIsStartOpen(true)} accessibilityRole="button" style={styles.heroAction}>
                <ThemedText type="linkPrimary">{state.kind === 'stopped' ? 'Начать заново →' : 'Начать →'}</ThemedText>
              </Pressable>
            </ThemedView>
          ) : state.kind === 'paused' ? (
            <ThemedView type="backgroundElement" style={styles.heroCard}>
              <ThemedText type="smallBold" themeColor="accentText">
                НА ПАУЗЕ
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                {describeState(state)}
              </ThemedText>
              <Pressable
                onPress={() =>
                  resumeProgram(profileId as ProfileId, program.id, new Date())
                    .then(reload)
                    .catch((err) =>
                      setResumeError(`Не получилось продолжить программу: ${errorMessage(err, 'неизвестная ошибка')}`)
                    )
                }
                accessibilityRole="button"
                style={styles.heroAction}>
                <ThemedText type="linkPrimary">Продолжить →</ThemedText>
              </Pressable>
              {resumeError && (
                <ThemedText type="small" themeColor="error" accessibilityRole="alert">
                  {resumeError}
                </ThemedText>
              )}
            </ThemedView>
          ) : state.kind === 'scheduled' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {describeState(state)}. До старта тренировок нет.
            </ThemedText>
          ) : today ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/workout-day/[id]',
                  params: { id: today.id, date: toISODate(todayDate) },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Открыть тренировку: ${today.day_label}${todayStatus === 'done' ? ', выполнено' : ''}`}>
              <ThemedView type="backgroundElement" style={styles.heroCard}>
                <ThemedText type="smallBold" themeColor="accentText">
                  СЕГОДНЯ
                </ThemedText>
                <ThemedText type="subtitle">{today.day_label}</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  {today.target_muscle_groups.join(', ')} · {today.exercises.length} упражнений
                </ThemedText>
                {todayStatus === 'done' && (
                  <ThemedText type="smallBold" themeColor="accentText">
                    Выполнено ✓
                  </ThemedText>
                )}
                <ThemedText type="linkPrimary">Открыть тренировку →</ThemedText>
              </ThemedView>
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Сегодня тренировки нет — день отдыха.
            </ThemedText>
          )}
```

В конце `ScrollView` (перед `</ScrollView>`):

```tsx
          {isStartOpen && program && profileId && (
            <StartProgramSheet
              visible
              onClose={() => setIsStartOpen(false)}
              profileId={profileId}
              plan={data}
              onDone={() => {
                setIsStartOpen(false);
                reload();
              }}
            />
          )}
```

Стиль: `heroAction: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },`.

- [ ] **Step 3: Проверка**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint "src/app/(tabs)/home.tsx" && echo ok`
Expected: `ok`.

- [ ] **Step 4: Коммит**

```bash
git add "src/app/(tabs)/home.tsx"
git commit -m "feat(home): program-state aware Today card with start/resume"
```

---

### Task 7: Отметка «выполнено» на экране тренировки

**Files:**
- Modify: `src/app/workout-day/[id].tsx`

**Interfaces:**
- Consumes: `workoutStatus` (Task 1), `markWorkoutDone`, `unmarkWorkoutDone` (Task 3), `isScheduledOnOrigin` (Task 4).
- Produces: —

- [ ] **Step 1: Состояние и вычисления.** Импорты: `workoutStatus` из `@/lib/program-schedule`, `markWorkoutDone`, `unmarkWorkoutDone` из `@/lib/program-lifecycle`, `errorMessage` из `@/lib/error-message`. Добавить:

```tsx
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const today = new Date();
  const canMark = isScheduledOnOrigin && toISODate(originDate) <= toISODate(today);
  const status = planData && canMark ? workoutStatus(originDate, planData.workoutLogs, today) : null;

  const reloadPlan = useCallback(() => {
    if (!profileId) return;
    loadPlan(profileId)
      .then(setPlanData)
      .catch((err) => console.error('Failed to reload plan data:', err));
  }, [profileId]);

  async function toggleDone() {
    if (!profileId || !day) return;
    setIsMarking(true);
    setMarkError(null);
    try {
      if (status === 'done') {
        await unmarkWorkoutDone(profileId, day.id, originDate);
      } else {
        await markWorkoutDone({
          profileId,
          workoutDayId: day.id,
          date: originDate,
          dayLabel: day.day_label,
          contextUsed: activeContext,
        });
      }
      reloadPlan();
    } catch (err) {
      setMarkError(`Не получилось сохранить отметку: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsMarking(false);
    }
  }
```

(`reloadPlan` объявить до ранних `return`, вместе с остальными хуками; `today`/`canMark`/`status` — тоже до них. Существующий `useEffect` с `loadPlan(profileId)` заменить вызовом `useEffect(() => { reloadPlan(); }, [reloadPlan]);`, а в `onDone` у `RescheduleSheet` вместо повторного `loadPlan(...)` вызвать `reloadPlan()`.)

- [ ] **Step 2: Кнопка** — сразу после блока кнопки «Перенести»:

```tsx
          {canMark && status && (
            <View style={styles.markRow}>
              {status === 'done' && (
                <ThemedText type="smallBold" themeColor="accentText">
                  Выполнено ✓
                </ThemedText>
              )}
              <Pressable
                onPress={toggleDone}
                disabled={isMarking}
                accessibilityRole="button"
                accessibilityState={{ disabled: isMarking }}
                style={styles.rescheduleButton}>
                <ThemedText type={status === 'done' ? 'default' : 'linkPrimary'}>
                  {isMarking ? 'Сохраняю…' : status === 'done' ? 'Снять отметку' : 'Отметить выполненной'}
                </ThemedText>
              </Pressable>
            </View>
          )}
          {markError && (
            <ThemedText type="small" themeColor="error" accessibilityRole="alert">
              {markError}
            </ThemedText>
          )}
```

Стиль: `markRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },`.

- [ ] **Step 3: Проверка**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint "src/app/workout-day/[id].tsx" && echo ok`
Expected: `ok`.

- [ ] **Step 4: Коммит**

```bash
git add "src/app/workout-day/[id].tsx"
git commit -m "feat(workout-day): mark workout done / undo"
```

---

### Task 8: Разнос дней в заглушке, живая проверка, документация

**Files:**
- Modify: `src/lib/plan-stub.ts:168-180`
- Modify: `CLAUDE.md`, `roadmap-auth-ai-design.md`

**Interfaces:**
- Consumes: `defaultWeekdays` (Task 1).

- [ ] **Step 1: `plan-stub.ts`** — импорт `import { defaultWeekdays } from '@/lib/program-schedule';`; перед циклом `for (let day = 0; day < daysPerWeek; day++)` добавить `const weekdays = defaultWeekdays(daysPerWeek);`; в `insert` заменить `weekday: day % 7,` на `weekday: weekdays[day],`. Комментарий над циклом: `// Дни раскладываются равномерно (Пн/Ср/Пт для трёх), пользователь меняет их при старте программы.`

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint src/lib/plan-stub.ts && echo ok` → `ok`.

- [ ] **Step 2: Коммит**

```bash
git add src/lib/plan-stub.ts
git commit -m "feat(plan-stub): spread workout days evenly across the week"
```

- [ ] **Step 3: Живая проверка** (Claude in Chrome, `npx expo start --web --port 8081`, профиль Марии). Перед началом — снапшот через REST: `workout_days` (id, weekday) Марии, её `workout_day_exceptions`, `program_periods`, `workout_logs`. Сценарии (широкий экран 1454px; ключевые — повторить на 390px через iframe шириной 390px):
  1. Главная до старта — «ПРОГРАММА ГОТОВА»; календарь пустой, подсказка «появятся после старта».
  2. «Начать» с Главной: «Сегодня», дни по умолчанию = текущие (Пн–Сб у Марии) → календарь заполнен с сегодняшнего дня, прошлые недели пустые.
  3. Отметить сегодняшнюю тренировку → «Выполнено ✓» на экране, на Главной, галочка в Неделе/Месяце; «Снять отметку» → снова «впереди». Двойное быстрое нажатие — одна запись в `workout_logs`.
  4. Пауза сегодня → сегодняшняя тренировка и будущие исчезли, Главная «НА ПАУЗЕ»; «Продолжить» в тот же день → сегодня снова тренировка.
  5. «Изменить дни» (выбрать 6 других дней; если есть будущие исключения — видно предупреждение) → раскладка обновилась; меньше/больше N дней — сохранить нельзя.
  6. «Остановить» → подтверждение → «Да» → Главная «ПРОГРАММА ЗАВЕРШЕНА»; «Начать заново» → «С понедельника» → до понедельника тренировок нет, Главная «Старт: …»; «Отменить старт».
  7. Прошлая дата в активном периоде без отметки → «пропущено» в Неделе/Месяце (создать период с прошлым стартом через REST для проверки — только для профиля Марии, в снапшот).
  8. Перенос «Перенести» не показывается на паузе; показывается в активном периоде.
  9. Консоль без ошибок.
  По окончании — восстановить данные Марии по снапшоту (удаление созданных записей — **только с явного разрешения владельца**, предварительно показав список id), сверить.

- [ ] **Step 4: Документация** — `CLAUDE.md`: в «Готово и работает» пункт «Этап 1 roadmap — режим программы и факт тренировки» (что сделано, миграция `0008` применена, итоги живой проверки, известные ограничения); в «Roadmap дальше» — «Этап 1 — ГОТОВО, следующий — Этап 2 (дневник питания)». `roadmap-auth-ai-design.md`: пометить Этап 1 «ГОТОВО» со ссылкой на спеку и план.

- [ ] **Step 5: Коммит и push**

```bash
git add CLAUDE.md roadmap-auth-ai-design.md
git commit -m "docs: record roadmap Stage 1 (program lifecycle) as done"
git push origin main
```
