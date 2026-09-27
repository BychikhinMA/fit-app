# Workout Reschedule — Stage 1 (core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user move a single workout occurrence to another calendar date — either "just this once" (the weekly grid snaps back next week) or "from now on" (the workout's `weekday` changes permanently) — entirely through a button on the workout-day screen, with conflict handling when the target date already has something scheduled.

**Architecture:** A new `workout_day_exceptions` table holds per-date overrides (`scheduled` / `cancelled`) that `findWorkoutForDate` consults before falling back to the existing `weekday`-based weekly match. Permanent moves need no new table — they're a direct `UPDATE workout_days SET weekday = ...`. All five calendar views (day/week/month/quarter/year) and the workout-day screen read the same `PlanData.exceptions` array, loaded once in `loadPlan`. The reschedule UI is a self-contained modal (React Native's built-in `Modal`, no new dependency) with three internal steps: pick a date → choose once/forever → resolve a conflict if one exists.

**Tech Stack:** Expo Router ~57, React Native 0.86, TypeScript (no test runner in this repo — verification is `tsc --noEmit` + `eslint` + a throwaway `npx tsx` script for pure-logic checks + live browser QA via `expo start --web`, matching how every prior roadmap step in this project was verified), Supabase (manual SQL Editor migrations, hand-maintained types, no CLI).

**Spec:** `docs/superpowers/specs/2026-09-22-workout-reschedule-design.md` (approved; this plan implements only "Этап 1" from its "Этапы" section — drag-n-drop is Stage 2, out of scope here).

## Global Constraints

- New table is `workout_day_exceptions`, columns exactly as the spec's "Модель данных" section: `id uuid pk`, `profile_id text references profiles(id) on delete cascade`, `date date`, `kind text check (kind in ('scheduled','cancelled'))`, `workout_day_id uuid references workout_days(id) on delete cascade` (null iff `kind='cancelled'`, required iff `kind='scheduled'`), `created_at timestamptz default now()`. Unique `(profile_id, date)`. Index `(profile_id, date)`.
- Permanent reschedule = `UPDATE workout_days SET weekday = <target weekday>` — no new table, no new column.
- RLS on the new table must give guest profiles (`owner_id is null`) and authenticated owners (`owner_id = auth.uid()`) the same access `training_contexts` has today. **Deviation from the spec's literal SQL snippet, verified against the actual current migrations:** the spec's prose shows an inline `profile_id in (select id from profiles where owner_id is null)` subquery, but `supabase/migrations/0005_fix_owner_functions_schema.sql` already rewrote every direct-`profile_id` table (including `training_contexts`) to go through the existing `private.profile_owner_id(profile_id)` security-definer function instead of an inline subquery. The spec explicitly says "same pattern as training_contexts, no **new** security-definer function" — reusing the already-existing `private.profile_owner_id` satisfies that intent exactly, while the literal inline-subquery text would silently diverge from how every other table in this schema actually enforces RLS today. This plan uses the function-call form. Flagged for visibility, not asking for sign-off — it's the only reading consistent with "same pattern as training_contexts."
- Post-migration verification is mandatory per spec, in this exact order: `NOTIFY pgrst, 'reload schema';` in the same SQL Editor run → confirm `public` is listed under Dashboard → Project Settings → API → Exposed schemas → direct `GET {SUPABASE_URL}/rest/v1/workout_day_exceptions?limit=1` with the anon key returns `200` (not `PGRST205`) → only if still failing, Restart Project in Dashboard (warn the user first — brief API downtime).
- `plan-stub.ts` regeneration must delete `workout_day_exceptions` rows for the profile, placed near the existing `programs` delete (line ~134), so stale `cancelled` exceptions don't silently eat workouts in a freshly regenerated plan.
- `findWorkoutForDate` must check the exact-date exception first; only fall back to `weekday` matching when no exception exists for that date. `cancelled` → return `undefined`. `scheduled` → return the referenced workout day looked up by id (must exist in the already-loaded `workoutDays` array).
- Conflict UI copy: "На {дата} уже стоит {день}. Поменять местами? / Отменить перенос?" — swap produces only `scheduled`-kind rows (or, for "forever", two `weekday` updates) on both dates; never writes a `cancelled` row as part of a swap.
- Once/forever choice is asked every time — never remembered between reschedules.
- The reschedule button lives once, on `workout-day/[id].tsx` — day/week/month/quarter/year views keep navigating to that same screen, no per-scale duplicate UI.
- Drag-and-drop, standalone cancel-without-move, and unplanned-workout-without-cancel are explicitly out of scope for this plan (Stage 2 / backlog per spec).
- `workout_logs` is never touched by any part of this feature (it snapshots its own `date`/`day_label`).
- No new npm dependency is introduced for the modal/sheet UI — the codebase has zero existing `Modal`/bottom-sheet usage to copy (verified: no matches for `Modal`, `BottomSheet`, `Sheet`, `Alert.alert`, or `presentation:` anywhere in `src/`), and `@expo/ui`'s native `BottomSheet` does not render on web, which would break this project's established live-QA workflow (`npx expo start --web` + Claude in Chrome, used for every prior roadmap step per `CLAUDE.md`). The plan instead hand-builds a themed slide-up panel with React Native's built-in `Modal`, using existing tokens (`Radius.card`, `Elevation.card`, `Spacing`) — consistent with how every other "new" UI element in this app (e.g. `Chip`, `BackButton`) was hand-rolled rather than pulling in a library.
- `src/components/calendar/month-mini.tsx` is **not** modified or reused as-is for the date picker: it only supports whole-month-tap navigation (no per-day press handler, no cross-month navigation), so it cannot serve as a target-date picker without changing its contract for its two existing call sites (`quarter-view.tsx`, `year-view.tsx`). This plan builds a new, separate `reschedule-date-picker.tsx` that reuses the same underlying math (`getMonthGrid`, `findWorkoutForDate`) and the same dot-per-workout visual language, but is its own component with per-day selection and month pagination. `month-mini.tsx` itself is only touched to thread the new `exceptions` prop through to `findWorkoutForDate` (see Task 5).

---

## Discovered issue requiring your decision before Task 10

While tracing the four `router.push('/workout-day/[id]', ...)` call sites, `src/app/(tabs)/home.tsx:57` computes the "Сегодня" (Today) hero card as `const today = workoutDays[0]` — the first workout in program order, **not** the workout whose `weekday` actually matches today via `findWorkoutForDate`. This is a pre-existing bug, unrelated to this feature, but it directly affects Task 6 (passing a `date` route param) and Task 10 (the reschedule button): if Home's card doesn't actually represent today's real workout, then "reschedule this" from Home would silently apply to the wrong workout/date pairing.

This plan (Task 6) proposes fixing it as a one-line change — `const today = findWorkoutForDate(workoutDays, new Date(), exceptions)` — since it's required for the reschedule entry point on Home to be correct, and it's a natural side-effect of a line I already have to touch to add the `date` param. If you'd rather this plan not touch `home.tsx`'s existing card logic at all, tell me and Task 6 will only add the `date` param (using `new Date()` regardless of whether `workoutDays[0]` is the real "today" match), leaving the pre-existing bug for separate handling.

---

## File Structure

**New files:**
- `supabase/migrations/0007_workout_day_exceptions.sql` — table, index, RLS, `NOTIFY`.
- `src/lib/reschedule.ts` — pure conflict-detection + Supabase mutation functions, no UI.
- `src/components/workout-day/reschedule-date-picker.tsx` — paginated month grid, per-day selection, dot indicators, disables past dates and the origin date.
- `src/components/workout-day/reschedule-sheet.tsx` — orchestrates the 3-step flow (pick date → once/forever → conflict) as a slide-up `Modal`, calls into `reschedule.ts`.

**Modified files:**
- `src/lib/calendar-dates.ts` — add `toISODate`, `WorkoutDayException` type, exception-aware `findWorkoutForDate`.
- `src/lib/load-plan.ts` — add `exceptions` to `PlanData` + its query.
- `src/types/database.ts` — add `workout_day_exceptions` table type.
- `src/lib/plan-stub.ts` — delete exceptions on regeneration.
- `src/components/calendar/day-view.tsx`, `week-view.tsx`, `month-view.tsx`, `month-mini.tsx`, `quarter-view.tsx`, `year-view.tsx` — thread `exceptions` prop through to `findWorkoutForDate`.
- `src/app/(tabs)/workouts.tsx`, `src/app/(tabs)/home.tsx` — pass `data.exceptions` down; add `date` param to route pushes.
- `src/app/workout-day/[id].tsx` — add "Перенести" button, load `profileId` + sibling `PlanData` (for conflict detection) + `originDate` from the route, mount `RescheduleSheet`.

---

### Task 1: Migration `0007` + hand-maintained types

**Files:**
- Create: `supabase/migrations/0007_workout_day_exceptions.sql`
- Modify: `src/types/database.ts` (add `workout_day_exceptions` table type inside `Database['public']['Tables']`, alongside `training_contexts`)

**Interfaces:**
- Produces: `Database['public']['Tables']['workout_day_exceptions']` with `Row = { id: string; profile_id: ProfileId; date: string; kind: 'scheduled' | 'cancelled'; workout_day_id: string | null; created_at: string }` and `Insert = { id?: string; profile_id: ProfileId; date: string; kind: 'scheduled' | 'cancelled'; workout_day_id?: string | null }`.

- [ ] **Step 1: Write the migration file**

```sql
-- Перенос тренировок (Roadmap: разовый/навсегда reschedule). Дизайн:
-- docs/superpowers/specs/2026-09-22-workout-reschedule-design.md.
-- Как применить: Supabase Dashboard -> SQL Editor -> вставить файл целиком -> Run.
--
-- Одна строка = одно исключение из недельной сетки (workout_days.weekday)
-- на конкретную календарную дату:
--   kind = 'scheduled'  — в эту дату показываем workout_day_id, даже если
--                         по weekday там должно быть другое/ничего;
--   kind = 'cancelled'  — в эту дату не показываем ничего, даже если по
--                         weekday должна быть тренировка (workout_day_id
--                         обязан быть null).
-- Постоянный перенос (weekday меняется навсегда) не использует эту таблицу —
-- прямой UPDATE workout_days SET weekday = ... поверх колонки из
-- 0006_workout_day_weekday.sql.

create table if not exists workout_day_exceptions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('scheduled', 'cancelled')),
  workout_day_id uuid references workout_days(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint workout_day_exceptions_kind_workout_day_id_check check (
    (kind = 'scheduled' and workout_day_id is not null) or
    (kind = 'cancelled' and workout_day_id is null)
  ),
  constraint workout_day_exceptions_profile_date_unique unique (profile_id, date)
);

create index if not exists workout_day_exceptions_profile_date_idx
  on workout_day_exceptions(profile_id, date);

alter table workout_day_exceptions enable row level security;

drop policy if exists "anon full access" on workout_day_exceptions;
create policy "anon full access" on workout_day_exceptions
  for all
  to anon
  using (private.profile_owner_id(profile_id) is null)
  with check (private.profile_owner_id(profile_id) is null);

drop policy if exists "owner full access" on workout_day_exceptions;
create policy "owner full access" on workout_day_exceptions
  for all
  to authenticated
  using (private.profile_owner_id(profile_id) = auth.uid())
  with check (private.profile_owner_id(profile_id) = auth.uid());

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply it by hand**

Open Supabase Dashboard → SQL Editor → paste the whole file → Run. This must be done by you (the owner) — this session has no Supabase CLI/direct DB access, matching every prior migration in this project.

- [ ] **Step 3: Verify the PostgREST schema cache picked up the new table**

In order:
1. Confirm the `NOTIFY pgrst, 'reload schema';` at the end of the file above ran as part of Step 2 (it's inside the same paste, so it did).
2. Dashboard → Project Settings → API → Exposed schemas → confirm `public` is listed.
3. Run this from your terminal (replace the two placeholders with your actual project URL and anon key from `.env`/`app.json`):
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     "https://<PROJECT_REF>.supabase.co/rest/v1/workout_day_exceptions?limit=1" \
     -H "apikey: <ANON_KEY>"
   ```
   Expected: `200`. If you get a body instead of just the status code and want to see it, drop the `-o /dev/null -w ...` part.
4. If it's still `PGRST205 — Could not find the table 'public.workout_day_exceptions' in the schema cache`, use Dashboard → Restart Project as a last resort. **Tell me before you do this** — it causes brief API downtime for the whole app.

- [ ] **Step 4: Add the hand-maintained type to `database.ts`**

Read `src/types/database.ts` first (it changes between sessions), then add this entry inside `Database['public']['Tables']`, next to `training_contexts`, following the exact same `Table<Row, Insert>` two-generic pattern already used by every other table in the file:

```ts
    workout_day_exceptions: Table<
      {
        id: string;
        profile_id: ProfileId;
        /** YYYY-MM-DD, дата в локальном календаре (не UTC) — см. calendar-dates.ts toISODate. */
        date: string;
        kind: 'scheduled' | 'cancelled';
        /** null при kind = 'cancelled', обязателен при kind = 'scheduled'. */
        workout_day_id: string | null;
        created_at: string;
      },
      {
        id?: string;
        profile_id: ProfileId;
        date: string;
        kind: 'scheduled' | 'cancelled';
        workout_day_id?: string | null;
      }
    >;
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (the type isn't consumed by anything yet, so this just confirms the addition itself is syntactically valid).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_workout_day_exceptions.sql src/types/database.ts
git commit -m "feat: add workout_day_exceptions table for reschedule feature"
```

---

### Task 2: `calendar-dates.ts` — exception-aware `findWorkoutForDate`

**Files:**
- Modify: `src/lib/calendar-dates.ts`

**Interfaces:**
- Consumes: nothing new from other tasks (pure module).
- Produces: `toISODate(date: Date): string` (local `YYYY-MM-DD`, used everywhere a JS `Date` must be compared against or written to a Postgres `date` column). `WorkoutDayException = { date: string; kind: 'scheduled' | 'cancelled'; workout_day_id: string | null }`. `findWorkoutForDate<T extends { id: string; weekday: number | null }>(workoutDays: T[], date: Date, exceptions?: WorkoutDayException[]): T | undefined` — new required generic constraint adds `id: string` (needed to resolve a `scheduled` exception's `workout_day_id` back to a workout day), and a new optional third parameter defaulting to `[]` so existing callers keep compiling before Task 5 updates them.

- [ ] **Step 1: Write a throwaway verification script**

This repo has no test runner (`package.json` has no jest/vitest — confirmed). Following this project's own established convention (`tsc --noEmit` + `eslint` + manual/scripted checks, no framework), write a temporary script — not committed — that exercises the new logic before it exists, so you can watch it fail first:

Create `/tmp/verify-find-workout.mts` (adjust path to your scratch dir) with:

```ts
import { findWorkoutForDate, type WorkoutDayException } from '../Users/maksimbycihin/Desktop/fit-app/src/lib/calendar-dates';

type Day = { id: string; weekday: number | null };

const days: Day[] = [
  { id: 'monday-day', weekday: 0 },
  { id: 'wednesday-day', weekday: 2 },
];

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`, ok ? '' : `(got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

// A Monday with no exception: falls back to weekday match.
const plainMonday = new Date(2026, 8, 28); // 2026-09-28 is a Monday
assertEqual(findWorkoutForDate(days, plainMonday)?.id, 'monday-day', 'no exception -> weekday match');

// A Monday with a 'cancelled' exception: returns undefined even though weekday matches.
const exceptions: WorkoutDayException[] = [
  { date: '2026-09-28', kind: 'cancelled', workout_day_id: null },
];
assertEqual(findWorkoutForDate(days, plainMonday, exceptions)?.id, undefined, 'cancelled exception -> undefined');

// A Tuesday (no normal workout) with a 'scheduled' exception: returns the moved-in day.
const plainTuesday = new Date(2026, 8, 29);
const scheduledExceptions: WorkoutDayException[] = [
  { date: '2026-09-29', kind: 'scheduled', workout_day_id: 'monday-day' },
];
assertEqual(findWorkoutForDate(days, plainTuesday, scheduledExceptions)?.id, 'monday-day', 'scheduled exception -> moved-in day');

// A different date entirely: exceptions for other dates are ignored.
assertEqual(findWorkoutForDate(days, new Date(2026, 8, 30), scheduledExceptions)?.id, undefined, 'exception on a different date is ignored');
```

- [ ] **Step 2: Run it to confirm it fails (function doesn't accept exceptions yet)**

Run: `npx tsx /tmp/verify-find-workout.mts`
Expected: TypeScript error or `FAIL` lines — `findWorkoutForDate` doesn't yet know about a third parameter, so passing `exceptions` either won't compile or will be silently ignored (both are acceptable "it fails" signals here; if `tsx` isn't available it will download it via npx on first run — that's fine).

- [ ] **Step 3: Implement `toISODate` and the exception-aware `findWorkoutForDate`**

In `src/lib/calendar-dates.ts`, add `toISODate` near `isSameDay` (after line 51):

```ts
/** `YYYY-MM-DD` в локальном календаре виджета — не `date.toISOString()`, который сдвигает дату на границе часовых поясов (UTC). Формат совпадает с тем, как Postgres `date` возвращается через supabase-js. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

Replace the existing `findWorkoutForDate` (lines 126-133) with:

```ts
export type WorkoutDayException = {
  date: string;
  kind: 'scheduled' | 'cancelled';
  workout_day_id: string | null;
};

/**
 * Тренировочный день на конкретную дату. Сначала смотрит, есть ли исключение
 * на точную дату (перенос/отмена) — если есть, оно побеждает; если нет,
 * откатывается на еженедельный weekday-матч (программа считается бессрочной).
 */
export function findWorkoutForDate<T extends { id: string; weekday: number | null }>(
  workoutDays: T[],
  date: Date,
  exceptions: WorkoutDayException[] = []
): T | undefined {
  const iso = toISODate(date);
  const exception = exceptions.find((e) => e.date === iso);
  if (exception) {
    if (exception.kind === 'cancelled') return undefined;
    return workoutDays.find((d) => d.id === exception.workout_day_id);
  }
  const idx = mondayIndex(date);
  return workoutDays.find((d) => d.weekday === idx);
}
```

- [ ] **Step 4: Run the verification script again**

Run: `npx tsx /tmp/verify-find-workout.mts`
Expected: four `PASS` lines, no `FAIL`.

- [ ] **Step 5: Delete the throwaway script and type-check the real change**

```bash
rm /tmp/verify-find-workout.mts
npx tsc --noEmit
```
Expected: new errors at every existing call site of `findWorkoutForDate` are **not** expected yet (the new `id: string` constraint is satisfied by every real `WorkoutDayException`-adjacent type already having `id`, and the third param is optional) — but confirm no unrelated regressions. If `tsc` reports errors in `day-view.tsx`/`week-view.tsx`/`month-view.tsx`/`month-mini.tsx` about the generic constraint, note them; Task 5 fixes those call sites regardless.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calendar-dates.ts
git commit -m "feat: make findWorkoutForDate exception-aware"
```

---

### Task 3: `load-plan.ts` — load exceptions

**Files:**
- Modify: `src/lib/load-plan.ts`

**Interfaces:**
- Consumes: `Database['public']['Tables']['workout_day_exceptions']['Row']` (Task 1).
- Produces: `PlanData.exceptions: WorkoutDayException[]` (structurally matches `calendar-dates.ts`'s `WorkoutDayException` — same three fields — so it can be passed straight into `findWorkoutForDate` without mapping).

- [ ] **Step 1: Add the query and field**

Read `src/lib/load-plan.ts` first, then apply:

```ts
type WorkoutDayExceptionRow = Database['public']['Tables']['workout_day_exceptions']['Row'];
```

next to the other `type X = Database[...]` aliases at the top, then extend `PlanData`:

```ts
export type PlanData = {
  settings: ProfileSettings;
  program: Program | null;
  workoutDays: (WorkoutDay & { exercises: Exercise[] })[];
  exceptions: WorkoutDayExceptionRow[];
  mealPlan: MealPlan | null;
  meals: Meal[];
};
```

and inside `loadPlan`, right after the `settings` query (before the `program` query), add:

```ts
  const { data: exceptions } = await supabase
    .from('workout_day_exceptions')
    .select('*')
    .eq('profile_id', profileId);
```

then include it in the final return:

```ts
  return {
    settings,
    program: program ?? null,
    workoutDays,
    exceptions: exceptions ?? [],
    mealPlan: mealPlan ?? null,
    meals,
  };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from this file (its only consumers so far — `home.tsx`, `workouts.tsx` — destructure specific fields off `PlanData` and won't break from an added field).

- [ ] **Step 3: Commit**

```bash
git add src/lib/load-plan.ts
git commit -m "feat: load workout_day_exceptions in loadPlan"
```

---

### Task 4: `plan-stub.ts` — clear exceptions on regeneration

**Files:**
- Modify: `src/lib/plan-stub.ts:134` (the `programs` delete)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new (side-effect only).

- [ ] **Step 1: Add the delete call**

Read `src/lib/plan-stub.ts` first (confirm the exact current line numbers around the comment `// 5. Черновая программа тренировок`), then add immediately above the existing `programs` delete:

```ts
  // Исключения переноса тренировок — без этого старые cancelled-записи
  // переживут пересборку плана и молча погасят тренировки в новом плане
  // на тех же датах (см. docs/superpowers/specs/2026-09-22-workout-reschedule-design.md).
  await supabase.from('workout_day_exceptions').delete().eq('profile_id', profileId);

  // 5. Черновая программа тренировок (заглушка вместо плана от Claude).
  await supabase.from('programs').delete().eq('profile_id', profileId);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification (requires Task 1's migration already applied)**

Run the app (`npx expo start --web`), open a profile, use the reschedule flow once Task 10 exists to create at least one exception row (you can re-run this manual check after Task 10 is done, or check it now via the Supabase Table Editor by inserting a dummy row directly), then re-run onboarding for that profile and confirm the `workout_day_exceptions` table is empty for that `profile_id` afterward (Dashboard → Table Editor, filter by `profile_id`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/plan-stub.ts
git commit -m "fix: clear workout_day_exceptions when regenerating a plan"
```

---

### Task 5: Thread `exceptions` through the calendar views

**Files:**
- Modify: `src/components/calendar/day-view.tsx`, `src/components/calendar/week-view.tsx`, `src/components/calendar/month-view.tsx`, `src/components/calendar/month-mini.tsx`, `src/components/calendar/quarter-view.tsx`, `src/components/calendar/year-view.tsx`, `src/app/(tabs)/workouts.tsx`

**Interfaces:**
- Consumes: `PlanData['exceptions']` (Task 3), exception-aware `findWorkoutForDate` (Task 2).
- Produces: every view now correctly reflects reschedules once Task 10 starts writing exception rows.

- [ ] **Step 1: `day-view.tsx`**

Read the file first, then change the props and the `findWorkoutForDate` call:

```ts
export function DayView({
  anchor,
  workoutDays,
  exceptions,
}: {
  anchor: Date;
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
}) {
  const theme = useTheme();
  const day = findWorkoutForDate(workoutDays, anchor, exceptions);
```

- [ ] **Step 2: `week-view.tsx`**

Same pattern — add `exceptions: PlanData['exceptions']` to the props type and pass it as the third argument: `findWorkoutForDate(workoutDays, date, exceptions)`.

- [ ] **Step 3: `month-view.tsx`**

Same pattern — add `exceptions` prop, pass as third argument: `findWorkoutForDate(workoutDays, date, exceptions)`.

- [ ] **Step 4: `month-mini.tsx`**

Add `exceptions: PlanData['exceptions']` to its props type (alongside `monthStart`, `workoutDays`, `onSelect`), and update its call: `findWorkoutForDate(workoutDays, date, exceptions)` (still only when `inMonth` is true, unchanged).

- [ ] **Step 5: `quarter-view.tsx` and `year-view.tsx`**

Both currently just forward `workoutDays` to `MonthMini` — add `exceptions: PlanData['exceptions']` to their own props types and forward it the same way: `<MonthMini ... exceptions={exceptions} />`.

- [ ] **Step 6: `workouts.tsx`**

Read the file first, then destructure `exceptions` alongside `program, workoutDays` (line 72) and pass it to every view:

```tsx
const { program, workoutDays, exceptions } = data;
...
{scale === 'day' && <DayView anchor={anchor} workoutDays={workoutDays} exceptions={exceptions} />}
{scale === 'week' && <WeekView anchor={anchor} workoutDays={workoutDays} exceptions={exceptions} />}
{scale === 'month' && <MonthView anchor={anchor} workoutDays={workoutDays} exceptions={exceptions} />}
{scale === 'quarter' && (
  <QuarterView anchor={anchor} workoutDays={workoutDays} exceptions={exceptions} onSelectMonth={handleSelectMonth} />
)}
{scale === 'year' && (
  <YearView anchor={anchor} workoutDays={workoutDays} exceptions={exceptions} onSelectMonth={handleSelectMonth} />
)}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/calendar src/app/\(tabs\)/workouts.tsx`
Expected: clean. This is the point where the `id: string` generic constraint from Task 2 either already passed or now needs `WorkoutDayEntry` (which is `PlanData['workoutDays'][number]`, i.e. a `workout_days` row — already has `id`) to satisfy it — it does, no extra work needed.

- [ ] **Step 8: Live QA**

Run `npx expo start --web`, open the Тренировки tab, cycle through День/Неделя/Месяц/Квартал/Год — confirm rendering is unchanged from before this task (no exceptions exist yet, so behavior must be identical to pre-Task-5). Check the browser console for errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/calendar src/app/\(tabs\)/workouts.tsx
git commit -m "feat: thread workout_day_exceptions through calendar views"
```

---

### Task 6: Carry the viewed date to `workout-day/[id]`

**Files:**
- Modify: `src/app/(tabs)/home.tsx:57,83`, `src/components/calendar/day-view.tsx:24`, `src/components/calendar/week-view.tsx:43`, `src/components/calendar/month-view.tsx:54`

**Interfaces:**
- Consumes: `toISODate` (Task 2).
- Produces: `workout-day/[id]` now receives a `date` route param (`YYYY-MM-DD`) alongside `id`, needed by Task 10 to know which specific occurrence is being rescheduled.

- [ ] **Step 1: `day-view.tsx`**

Change the push to include the date already in scope (`anchor`):

```tsx
onPress={() =>
  router.push({ pathname: '/workout-day/[id]', params: { id: day.id, date: toISODate(anchor) } })
}
```
(add `toISODate` to the existing `@/lib/calendar-dates` import.)

- [ ] **Step 2: `week-view.tsx`**

The date is the per-cell `date` variable already in the `.map`:

```tsx
onPress={() =>
  router.push({ pathname: '/workout-day/[id]', params: { id: day.id, date: toISODate(date) } })
}
```
(add `toISODate` to the existing import.)

- [ ] **Step 3: `month-view.tsx`**

Same — the per-cell `date`:

```tsx
onPress={() =>
  router.push({ pathname: '/workout-day/[id]', params: { id: day.id, date: toISODate(date) } })
}
```
(add `toISODate` to the existing import.)

- [ ] **Step 4: `home.tsx`**

Read the file first. Per the "Discovered issue" section above — apply the agreed fix (see that section for the alternative if you decline it). With the fix:

```tsx
import { findWorkoutForDate, toISODate } from '@/lib/calendar-dates';
...
const { settings, program, workoutDays, exceptions } = data;
const isStub = program?.generation_source === 'stub';
const todayDate = new Date();
const today = findWorkoutForDate(workoutDays, todayDate, exceptions);
...
onPress={() =>
  router.push({ pathname: '/workout-day/[id]', params: { id: today.id, date: toISODate(todayDate) } })
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/\(tabs\)/home.tsx src/components/calendar`
Expected: clean.

- [ ] **Step 6: Live QA**

`npx expo start --web` — tap into a workout from Home, from Day view, from Week view, and from Month view; confirm the workout-day screen still loads correctly each time (it ignores the new `date` param until Task 10, so this only checks nothing broke).

- [ ] **Step 7: Commit**

```bash
git add src/app/\(tabs\)/home.tsx src/components/calendar/day-view.tsx src/components/calendar/week-view.tsx src/components/calendar/month-view.tsx
git commit -m "feat: pass viewed date to workout-day screen"
```

---

### Task 7: `reschedule.ts` — conflict detection and mutations

**Files:**
- Create: `src/lib/reschedule.ts`

**Interfaces:**
- Consumes: `findWorkoutForDate`, `toISODate`, `mondayIndex` (Task 2); `PlanData['workoutDays'][number]`, `PlanData['exceptions']` (Task 3); `ProfileId` (`@/types/database`).
- Produces: `type RescheduleScope = 'once' | 'forever'`; `findConflict(workoutDays, exceptions, targetDate, movingDayId): WorkoutDayEntry | null`; `rescheduleOnce(profileId, movingDayId, originDate, targetDate): Promise<void>`; `rescheduleForever(movingDayId, targetDate): Promise<void>`; `swapOnce(profileId, movingDayId, originDate, targetDate, conflictingDayId): Promise<void>`; `swapForever(movingDayId, originDate, targetDate, conflictingDayId): Promise<void>`. These five names and signatures are exactly what `reschedule-sheet.tsx` (Task 9) calls.

- [ ] **Step 1: Write a throwaway verification script for `findConflict`**

Create `/tmp/verify-reschedule.mts`:

```ts
import { findConflict } from '/Users/maksimbycihin/Desktop/fit-app/src/lib/reschedule';

type Day = { id: string; weekday: number | null };
const days: Day[] = [
  { id: 'monday-day', weekday: 0 },
  { id: 'tuesday-day', weekday: 1 },
];

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`, ok ? '' : `(got ${JSON.stringify(actual)})`);
}

const targetTuesday = new Date(2026, 8, 29); // Tuesday
// Moving 'monday-day' onto a Tuesday that already has 'tuesday-day' -> conflict.
assertEqual(
  findConflict(days, [], targetTuesday, 'monday-day')?.id,
  'tuesday-day',
  'occupied target date -> conflict with the occupying day'
);
// Moving 'tuesday-day' onto its own current date -> no conflict (no-op guard is the picker's job, not this function's).
assertEqual(
  findConflict(days, [], targetTuesday, 'tuesday-day'),
  null,
  'moving a day onto the date it already occupies -> no conflict'
);
// Empty target date -> no conflict.
const targetSunday = new Date(2026, 9, 4); // Sunday, nothing scheduled
assertEqual(findConflict(days, [], targetSunday, 'monday-day'), null, 'empty target date -> no conflict');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx /tmp/verify-reschedule.mts`
Expected: import error — `src/lib/reschedule.ts` doesn't exist yet.

- [ ] **Step 3: Implement `src/lib/reschedule.ts`**

```ts
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
```

- [ ] **Step 4: Run the verification script again**

Run: `npx tsx /tmp/verify-reschedule.mts`
Expected: three `PASS` lines.

- [ ] **Step 5: Clean up and type-check**

```bash
rm /tmp/verify-reschedule.mts
npx tsc --noEmit
```
Expected: clean (this file has no consumers yet, so no ripple errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/reschedule.ts
git commit -m "feat: add reschedule conflict-detection and mutation functions"
```

---

### Task 8: `reschedule-date-picker.tsx` — target date picker

**Files:**
- Create: `src/components/workout-day/reschedule-date-picker.tsx`

**Interfaces:**
- Consumes: `getMonthGrid`, `shiftAnchor`, `formatMonthLabel`, `isSameDay`, `findWorkoutForDate`, `toISODate`, `WEEKDAY_SHORT` (`@/lib/calendar-dates`); `PlanData['workoutDays']`, `PlanData['exceptions']` (Task 3).
- Produces: `<RescheduleDatePicker workoutDays exceptions originDate onSelectDate />` where `onSelectDate: (date: Date) => void` fires once per tap on a selectable day cell. Consumed by `reschedule-sheet.tsx` (Task 9).

- [ ] **Step 1: Implement the component**

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  WEEKDAY_SHORT,
  findWorkoutForDate,
  formatMonthLabel,
  getMonthGrid,
  isSameDay,
  shiftAnchor,
  toISODate,
} from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function RescheduleDatePicker({
  workoutDays,
  exceptions,
  originDate,
  onSelectDate,
}: {
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
  originDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const theme = useTheme();
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const today = new Date();
  const weeks = getMonthGrid(monthAnchor);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setMonthAnchor((prev) => shiftAnchor(prev, 'month', -1))}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          hitSlop={8}
          style={styles.navButton}>
          <ThemedText type="default">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{formatMonthLabel(monthAnchor)}</ThemedText>
        <Pressable
          onPress={() => setMonthAnchor((prev) => shiftAnchor(prev, 'month', 1))}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          hitSlop={8}
          style={styles.navButton}>
          <ThemedText type="default">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_SHORT.map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.weekdayCell}>
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            const inMonth = date.getMonth() === monthAnchor.getMonth();
            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isOrigin = isSameDay(date, originDate);
            const disabled = isPast || isOrigin;
            const hasWorkout = inMonth && findWorkoutForDate(workoutDays, date, exceptions) !== undefined;

            return (
              <Pressable
                key={di}
                disabled={disabled}
                onPress={() => onSelectDate(date)}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                accessibilityLabel={`${date.getDate()} ${formatMonthLabel(date)}${hasWorkout ? ', уже есть тренировка' : ''}`}
                style={[
                  styles.dayCell,
                  !inMonth && styles.outOfMonth,
                  disabled && styles.disabledCell,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="small" themeColor={disabled ? 'textSecondary' : 'text'}>
                  {date.getDate()}
                </ThemedText>
                {hasWorkout && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekdayRow: { flexDirection: 'row' },
  weekdayCell: { flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row', gap: Spacing.half },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    minHeight: 44,
    borderRadius: Radius.row,
  },
  outOfMonth: { opacity: 0.4 },
  disabledCell: { opacity: 0.3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
```

Note: `toISODate` is imported but not directly called in this file's body — the `date` values are compared with `isSameDay`/plain `Date` math, matching every other calendar view's convention (`month-view.tsx` does the same). Remove the unused import if `eslint` flags it in Step 2.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/workout-day/reschedule-date-picker.tsx`
Expected: clean. If `toISODate` is reported unused, delete that import.

- [ ] **Step 3: Commit**

```bash
git add src/components/workout-day/reschedule-date-picker.tsx
git commit -m "feat: add reschedule target-date picker"
```

---

### Task 9: `reschedule-sheet.tsx` — the 3-step flow

**Files:**
- Create: `src/components/workout-day/reschedule-sheet.tsx`

**Interfaces:**
- Consumes: `RescheduleDatePicker` (Task 8); `findConflict`, `rescheduleOnce`, `rescheduleForever`, `swapOnce`, `swapForever` (Task 7); `Chip` (`@/components/onboarding/chip`); `formatDayLabel` (`@/lib/calendar-dates`).
- Produces: `<RescheduleSheet visible onClose profileId movingDay originDate workoutDays exceptions onDone />` where `movingDay: PlanData['workoutDays'][number]`, `onDone: () => void` fires after a successful mutation so the caller can reload its data. Consumed by `workout-day/[id].tsx` (Task 10).

- [ ] **Step 1: Implement the component**

```tsx
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { RescheduleDatePicker } from '@/components/workout-day/reschedule-date-picker';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';
import {
  findConflict,
  rescheduleForever,
  rescheduleOnce,
  swapForever,
  swapOnce,
  type RescheduleScope,
} from '@/lib/reschedule';
import type { ProfileId } from '@/types/database';

type WorkoutDayEntry = PlanData['workoutDays'][number];
type Step = 'pick-date' | 'choose-scope' | 'conflict';

export function RescheduleSheet({
  visible,
  onClose,
  profileId,
  movingDay,
  originDate,
  workoutDays,
  exceptions,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  profileId: ProfileId;
  movingDay: WorkoutDayEntry;
  originDate: Date;
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
  onDone: () => void;
}) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('pick-date');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [scope, setScope] = useState<RescheduleScope | null>(null);
  const [conflictingDay, setConflictingDay] = useState<WorkoutDayEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function reset() {
    setStep('pick-date');
    setTargetDate(null);
    setScope(null);
    setConflictingDay(null);
    setSaveError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelectDate(date: Date) {
    setTargetDate(date);
    setStep('choose-scope');
  }

  function handleChooseScope(chosenScope: RescheduleScope) {
    if (!targetDate) return;
    setScope(chosenScope);
    const conflict = findConflict(workoutDays, exceptions, targetDate, movingDay.id);
    if (conflict) {
      setConflictingDay(conflict);
      setStep('conflict');
    } else {
      void commit(chosenScope, null);
    }
  }

  async function commit(chosenScope: RescheduleScope, conflict: WorkoutDayEntry | null) {
    if (!targetDate) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (conflict) {
        if (chosenScope === 'once') {
          await swapOnce(profileId, movingDay.id, originDate, targetDate, conflict.id);
        } else {
          await swapForever(movingDay.id, originDate, targetDate, conflict.id);
        }
      } else if (chosenScope === 'once') {
        await rescheduleOnce(profileId, movingDay.id, originDate, targetDate);
      } else {
        await rescheduleForever(movingDay.id, targetDate);
      }
      reset();
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  function handleConfirmSwap() {
    if (!scope) return;
    void commit(scope, conflictingDay);
  }

  function handleCancelConflict() {
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Закрыть" />
      <View style={[styles.sheet, { backgroundColor: theme.background }, Elevation.card]}>
        {step === 'pick-date' && (
          <>
            <ThemedText type="smallBold">Выбери новую дату</ThemedText>
            <RescheduleDatePicker
              workoutDays={workoutDays}
              exceptions={exceptions}
              originDate={originDate}
              onSelectDate={handleSelectDate}
            />
          </>
        )}

        {step === 'choose-scope' && targetDate && (
          <>
            <ThemedText type="smallBold">Перенести на {formatDayLabel(targetDate)}</ThemedText>
            <View style={styles.chipRow}>
              <Chip label="Только в этот раз" selected={false} onPress={() => handleChooseScope('once')} />
              <Chip label="Теперь всегда" selected={false} onPress={() => handleChooseScope('forever')} />
            </View>
          </>
        )}

        {step === 'conflict' && targetDate && conflictingDay && (
          <>
            <ThemedText type="smallBold">
              На {formatDayLabel(targetDate)} уже стоит {conflictingDay.day_label}. Поменять местами?
            </ThemedText>
            <View style={styles.chipRow}>
              <Pressable onPress={handleConfirmSwap} style={styles.actionButton} accessibilityRole="button">
                <ThemedText type="linkPrimary">Поменять местами</ThemedText>
              </Pressable>
              <Pressable onPress={handleCancelConflict} style={styles.actionButton} accessibilityRole="button">
                <ThemedText type="default">Отменить перенос</ThemedText>
              </Pressable>
            </View>
          </>
        )}

        {isSaving && <ThemedText type="small" themeColor="textSecondary">Сохраняю…</ThemedText>}
        {saveError && (
          <ThemedText type="small" themeColor="error">
            {saveError}
          </ThemedText>
        )}

        <Pressable onPress={handleClose} style={styles.actionButton} accessibilityRole="button">
          <ThemedText type="small" themeColor="textSecondary">
            Закрыть
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: { minHeight: 44, justifyContent: 'center' },
});
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/workout-day/reschedule-sheet.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/workout-day/reschedule-sheet.tsx
git commit -m "feat: add reschedule sheet (date picker + scope + conflict)"
```

---

### Task 10: Wire the "Перенести" button into `workout-day/[id].tsx`

**Files:**
- Modify: `src/app/workout-day/[id].tsx`

**Interfaces:**
- Consumes: `RescheduleSheet` (Task 9); `loadPlan` (`@/lib/load-plan`); `getCurrentProfileId` (`@/lib/auth`); route params `{ id: string; date?: string }`.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Read the current file, then add state and data loading**

Change the existing React import (line 2) to add `useEffect`, which isn't imported yet:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
```

Add new imports:

```ts
import { getCurrentProfileId } from '@/lib/auth';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import { RescheduleSheet } from '@/components/workout-day/reschedule-sheet';
import type { ProfileId } from '@/types/database';
```

Change the params destructure and add new state, right after the existing `useState` calls:

```ts
const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
const originDate = useMemo(() => {
  if (!dateParam) return new Date();
  const [y, m, d] = dateParam.split('-').map(Number);
  return new Date(y, m - 1, d);
}, [dateParam]);
const [profileId, setProfileId] = useState<ProfileId | null>(null);
const [planData, setPlanData] = useState<PlanData | null>(null);
const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
```

`originDate` deliberately parses `YYYY-MM-DD` with `new Date(y, m - 1, d)` (local calendar date), not `new Date(dateParam)` — the latter parses date-only ISO strings as UTC midnight, which shifts to the previous day in any timezone west of UTC. This mirrors why `toISODate` exists in `calendar-dates.ts`.

Add a `useEffect` to load `profileId` and the sibling `PlanData` (needed for conflict detection — this screen otherwise only loads the single `workout_days` row by `id`, which has no visibility into the rest of the program):

```ts
useEffect(() => {
  getCurrentProfileId().then((current) => {
    if (current) setProfileId(current);
  });
}, []);

useEffect(() => {
  if (!profileId) return;
  loadPlan(profileId).then(setPlanData);
}, [profileId]);
```

- [ ] **Step 2: Add the button and the sheet to the render**

Place the button right after the existing context-switcher block (after line 125's closing `)}`), before the warmup card:

```tsx
{day && profileId && planData && (
  <Pressable
    onPress={() => setIsRescheduleOpen(true)}
    accessibilityRole="button"
    accessibilityLabel="Перенести тренировку на другую дату"
    style={styles.rescheduleButton}>
    <ThemedText type="linkPrimary">Перенести</ThemedText>
  </Pressable>
)}
```

Add `Pressable` to the existing `react-native` import if not already there (it already is, used by `replaceExercise`'s button).

At the end of the component, right before the closing `</ThemedView>` of the whole screen (after the `</ScrollView>` inside `SafeAreaView`, as a sibling — `Modal`-based components must render outside the `ScrollView`, not inside it), add:

```tsx
{day && profileId && planData && (
  <RescheduleSheet
    visible={isRescheduleOpen}
    onClose={() => setIsRescheduleOpen(false)}
    profileId={profileId}
    movingDay={{ ...day, exercises }}
    originDate={originDate}
    workoutDays={planData.workoutDays}
    exceptions={planData.exceptions}
    onDone={() => {
      setIsRescheduleOpen(false);
      load();
      loadPlan(profileId).then(setPlanData);
    }}
  />
)}
```

`movingDay={{ ...day, exercises }}` — `RescheduleSheet` expects `PlanData['workoutDays'][number]` which is `WorkoutDay & { exercises: Exercise[] }`; this screen's own `day` state is a bare `WorkoutDay` row plus a separate `exercises` array, so they're combined at the call site rather than changing this screen's existing state shape.

Add the new style:

```ts
rescheduleButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/workout-day/\[id\].tsx`
Expected: clean.

- [ ] **Step 4: Live QA — full flow, no conflict, once**

1. `npx expo start --web`, open a profile with an active program.
2. Navigate to a workout day (from Home or the Тренировки tab), note its day label and current weekday.
3. Tap "Перенести" → pick an empty date a week or two out → "Только в этот раз".
4. Confirm the sheet closes and the screen still shows the same workout (unaffected — you're still viewing the origin day's own screen).
5. Go to the Тренировки tab, navigate to the original date in Week/Month view → confirm it now shows "Тренировки нет" (or whatever else's weekday match, if any) on that date.
6. Navigate to the target date → confirm the moved workout now appears there.
7. Navigate to the *following* week's occurrence of the original weekday → confirm the workout is back (the exception was date-specific, not permanent).

- [ ] **Step 5: Live QA — no conflict, forever**

Repeat steps 1-3 with "Теперь всегда" on a different empty target date. Confirm: the original weekday now shows nothing, the new weekday shows the workout, and it stays that way on *every* future week (check two weeks out in Month view), not just once.

- [ ] **Step 6: Live QA — conflict, swap, once**

Reschedule a workout onto a date that already has a different workout scheduled, choose "Только в этот раз", confirm the conflict dialog text names the correct existing workout, tap "Поменять местами", and confirm both dates now show each other's workout (only for that date — check the following week reverts both to their original weekdays).

- [ ] **Step 7: Live QA — conflict, cancel**

Repeat step 6 but tap "Отменить перенос" — confirm no rows were written (Table Editor: `workout_day_exceptions` unchanged, `workout_days.weekday` unchanged for both) and the sheet returns to the date-picker step (per the reset in `handleCancelConflict`).

- [ ] **Step 8: Accessibility spot-check**

With the browser's accessibility tree inspector (or VoiceOver if on macOS/Safari), confirm the "Перенести" button, both once/forever chips, and both conflict-dialog buttons are all reachable and have non-empty accessible names — this flow has no drag gesture yet (Stage 2), so the button path is the *only* path and must work standalone.

- [ ] **Step 9: Commit**

```bash
git add src/app/workout-day/\[id\].tsx
git commit -m "feat: add reschedule button and flow to workout-day screen"
```

---

## Final integration check

- [ ] Run `npx tsc --noEmit` across the whole repo — zero errors.
- [ ] Run `npx eslint .` — zero errors/warnings.
- [ ] Re-read the spec (`docs/superpowers/specs/2026-09-22-workout-reschedule-design.md`) top to bottom and confirm every "Этап 1" bullet has a corresponding completed task above: migration ✓ (Task 1), `plan-stub.ts` fix ✓ (Task 4), types ✓ (Task 1), `findWorkoutForDate` with exceptions ✓ (Task 2), "Перенести" button + mini-calendar + once/forever sheet + conflict dialog ✓ (Tasks 8-10).
- [ ] Update `CLAUDE.md`'s "Текущее состояние проекта" section with a dated entry describing what shipped, any live-QA gaps, and that Stage 2 (drag-n-drop, `week-view.tsx` only) remains — per this project's session-handoff convention.
