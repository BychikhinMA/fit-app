# Adaptive Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Stack router and the single `plan-ready.tsx`
screen with an adaptive 5-section navigation shell — sidebar on wide
screens, bottom tab bar on narrow — plus baseline visual polish (shadows,
unified corner radii, blurred nav bars).

**Architecture:** One `<Tabs>` from `expo-router/ui` in
`src/app/(tabs)/_layout.tsx` with a hidden `<TabList>` for route config and
a custom bar rendered next to `<TabSlot>`. `useWindowDimensions().width >=
768` picks `<Sidebar>` vs `<BottomBar>`; both map a shared `NAV_ITEMS`
array and wrap a single `<TabTriggerButton>` in `<TabTrigger asChild>`,
styling the active item via the forwarded `isFocused` prop. The tab group
uses **named** screens (`home.tsx`, `workouts.tsx`, …) because a
`(tabs)/index.tsx` would collide with the root `index.tsx` profile picker
at URL `/`. Data loading moves from `plan-ready.tsx` into a shared
`src/lib/load-plan.ts`; the exercise-library list body moves into a shared
`src/components/exercise-library-list.tsx` with a `browse | pick` mode.

**Tech Stack:** Expo SDK 57, expo-router v57 (`expo-router/ui` custom
tabs), React Native 0.86, `expo-blur`, `@expo/vector-icons` (Ionicons),
`expo-image`, Supabase JS, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-01-adaptive-navigation-design.md`

## Global Constraints

- **Expo docs must be checked against SDK 57 exactly:**
  `https://docs.expo.dev/versions/v57.0.0/` (repo `AGENTS.md`). Do not rely
  on memory of older expo-router APIs.
- **No unit-test framework exists in this repo** (no `test` script, no
  jest). The per-task test cycle is: `npx tsc --noEmit` clean, then
  `npx expo lint` clean, then the task's explicit manual browser check
  against the running dev server (`npx expo start --web`, port 8081).
  Adding a test framework is out of scope.
- **Colour theme stays monochrome.** Use only existing `Colors` keys
  (`text`, `background`, `backgroundElement`, `backgroundSelected`,
  `textSecondary`). The orange accent is Roadmap Step 2 — do not add
  `accent`/`onAccent` here.
- **No new component library.** Normalize existing inline `styles.card`
  StyleSheets in place; the only new shared style source is `Radius` /
  `Elevation` in `src/constants/theme.ts`. Do not introduce a generic
  `<Card>`.
- **Migrations are applied by hand** via Supabase Dashboard. This plan
  touches no SQL and no `src/types/database.ts`.
- Every commit message ends with the two trailer lines used in this repo:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q`.
- Work happens on branch `step1-adaptive-navigation` (already created).
- Content of the 5 tabs comes verbatim from the current `plan-ready.tsx`
  blocks; no new data shapes, no food-log UI, no auth UI.

---

## File Structure

**Create:**
- `src/lib/load-plan.ts` — `PlanData` type + `loadPlan(profileId)`; moved
  verbatim from `plan-ready.tsx`.
- `src/components/exercise-library-list.tsx` — `<ExerciseLibraryList
  mode="browse" | "pick" />`; filter chips + Supabase query + result list,
  moved from `exercise-library/index.tsx`.
- `src/components/navigation/nav-items.ts` — `NAV_ITEMS` constant.
- `src/components/navigation/tab-trigger-button.tsx` — `TabTriggerButton`
  (`forwardRef`), one pressable used by both bars.
- `src/components/navigation/sidebar.tsx` — `Sidebar` (wide screens).
- `src/components/navigation/bottom-bar.tsx` — `BottomBar` (narrow screens).
- `src/app/(tabs)/_layout.tsx` — adaptive shell.
- `src/app/(tabs)/home.tsx` — Главная.
- `src/app/(tabs)/workouts.tsx` — Тренировки.
- `src/app/(tabs)/nutrition.tsx` — Питание.
- `src/app/(tabs)/library.tsx` — Библиотека.
- `src/app/(tabs)/profile.tsx` — Профиль.

**Modify:**
- `src/constants/theme.ts` — add `Radius`, `Elevation`.
- `src/app/_layout.tsx` — register `(tabs)`, drop `plan-ready`.
- `src/app/index.tsx` — redirect to `/home` instead of `/plan-ready`.
- `src/app/onboarding/index.tsx` — redirect to `/home` instead of
  `/plan-ready`.
- `src/app/exercise-library/index.tsx` — becomes a thin wrapper around
  `<ExerciseLibraryList mode="pick" />`.
- `src/app/workout-day/[id].tsx` — apply `Radius` / `Elevation` to cards.
- `src/app/exercise-library/[id].tsx` — apply `Radius` / `Elevation` to
  cards.

**Delete:**
- `src/app/plan-ready.tsx` (Task 11, after its content is absorbed).

---

## Task 1: Theme tokens — `Radius` and `Elevation`

**Files:**
- Modify: `src/constants/theme.ts` (after the `Spacing` block, ~line 62)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const Radius: { readonly card: 20; readonly row: 14; readonly pill: 999 }`
  - `export const Elevation: { readonly card: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number } }`

- [ ] **Step 1: Add the constants**

In `src/constants/theme.ts`, immediately after the `Spacing` object and
before `export const BottomTabInset`, add:

```ts
/** Corner radii. Cards/large blocks use `card`; menu rows and small pills use `row`. */
export const Radius = {
  card: 20,
  row: 14,
  pill: 999,
} as const;

/** Soft, low-contrast lift for raised surfaces (cards, nav bars). */
export const Elevation = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no output, exit 0).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: PASS (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/constants/theme.ts
git commit -m "Add Radius and Elevation theme tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 2: Install `expo-blur` and `@expo/vector-icons`

**Files:**
- Modify: `package.json`, `package-lock.json` (via installer)

**Interfaces:**
- Consumes: nothing.
- Produces: `import { BlurView } from 'expo-blur'` and
  `import { Ionicons } from '@expo/vector-icons'` resolve at build time.

- [ ] **Step 1: Install**

Run: `npx expo install expo-blur @expo/vector-icons`
Expected: both added to `package.json` `dependencies` with `~57.x` /
compatible ranges; `package-lock.json` updated.

- [ ] **Step 2: Verify both resolve**

Run: `node -e "require.resolve('expo-blur'); require.resolve('@expo/vector-icons'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add expo-blur and @expo/vector-icons

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 3: Extract `loadPlan` into `src/lib/load-plan.ts`

**Files:**
- Create: `src/lib/load-plan.ts`
- Modify: `src/app/plan-ready.tsx` (remove local `loadPlan` + `PlanData`,
  import them instead)

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`; `Database`, `ProfileId` from
  `@/types/database`.
- Produces:
  - `export type PlanData = { settings: ProfileSettings; program: Program | null; workoutDays: (WorkoutDay & { exercises: Exercise[] })[]; mealPlan: MealPlan | null; meals: Meal[] }`
  - `export async function loadPlan(profileId: ProfileId): Promise<PlanData>`
  - Row type aliases are internal to the module (not exported).

- [ ] **Step 1: Create `src/lib/load-plan.ts`**

Move the row-type aliases, `PlanData`, and the `loadPlan` function out of
`src/app/plan-ready.tsx` verbatim. Full file:

```ts
import { supabase } from '@/lib/supabase';
import type { Database, ProfileId } from '@/types/database';

type ProfileSettings = Database['public']['Tables']['profile_settings']['Row'];
type Program = Database['public']['Tables']['programs']['Row'];
type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];
type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
type Meal = Database['public']['Tables']['meals']['Row'];

export type PlanData = {
  settings: ProfileSettings;
  program: Program | null;
  workoutDays: (WorkoutDay & { exercises: Exercise[] })[];
  mealPlan: MealPlan | null;
  meals: Meal[];
};

export async function loadPlan(profileId: ProfileId): Promise<PlanData> {
  const { data: settings, error: settingsError } = await supabase
    .from('profile_settings')
    .select('*')
    .eq('profile_id', profileId)
    .single();
  if (settingsError) throw settingsError;

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle();

  let workoutDays: (WorkoutDay & { exercises: Exercise[] })[] = [];
  if (program) {
    const { data: phases } = await supabase
      .from('phases')
      .select('id')
      .eq('program_id', program.id);
    const phaseIds = (phases ?? []).map((p) => p.id);

    const { data: days } = await supabase
      .from('workout_days')
      .select('*')
      .in('phase_id', phaseIds.length > 0 ? phaseIds : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order');

    const dayIds = (days ?? []).map((d) => d.id);
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('workout_day_id', dayIds.length > 0 ? dayIds : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order');

    workoutDays = (days ?? []).map((day) => ({
      ...day,
      exercises: (exercises ?? []).filter((ex) => ex.workout_day_id === day.id),
    }));
  }

  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle();

  let meals: Meal[] = [];
  if (mealPlan) {
    const { data: sampleDays } = await supabase
      .from('sample_day_plans')
      .select('id')
      .eq('meal_plan_id', mealPlan.id);
    const sampleDayIds = (sampleDays ?? []).map((d) => d.id);

    const { data: mealsData } = await supabase
      .from('meals')
      .select('*')
      .in('sample_day_plan_id', sampleDayIds.length > 0 ? sampleDayIds : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order');
    meals = mealsData ?? [];
  }

  return { settings, program: program ?? null, workoutDays, mealPlan: mealPlan ?? null, meals };
}
```

- [ ] **Step 2: Update `src/app/plan-ready.tsx` to import from the new module**

- Delete the local `type ProfileSettings … type Meal =` aliases, the
  `type PlanData = { … }` block, and the whole `async function loadPlan(…)
  { … }` definition (currently lines ~15-28 and ~172-238).
- Keep the aliases that the JSX still needs. After the edit, the component
  body still references `settings`, `program`, `workoutDays`, `mealPlan`,
  `meals` via destructuring `const { settings, program, workoutDays,
  mealPlan, meals } = data;` — those come from `data: PlanData`, so no
  local alias is needed there.
- Add to the imports block:

```ts
import { loadPlan, type PlanData } from '@/lib/load-plan';
```

- Remove the now-unused `import { supabase } from '@/lib/supabase';` and
  the `Database` import **only if** nothing else in `plan-ready.tsx` uses
  them (it uses `ProfileId` — keep that). Let `npx tsc` and `npx expo
  lint` (`no-unused-vars`) tell you exactly what to drop.
- `const [data, setData] = useState<PlanData | null>(null);` stays and now
  refers to the imported type.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `npx expo lint`
Expected: PASS (in particular, no `no-unused-vars` for `supabase`/`Database`
in `plan-ready.tsx`).

- [ ] **Step 5: Manual browser check**

With the dev server running, open `http://localhost:8081`, pick the
**Максим** profile. Expected: `plan-ready` screen still renders the ИМТ,
calories, program days, and meal example exactly as before (behaviour
unchanged; only the code moved).

- [ ] **Step 6: Commit**

```bash
git add src/lib/load-plan.ts src/app/plan-ready.tsx
git commit -m "Extract plan data loading into src/lib/load-plan.ts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 4: Extract `<ExerciseLibraryList>` component

**Files:**
- Create: `src/components/exercise-library-list.tsx`
- Modify: `src/app/exercise-library/index.tsx` (becomes a thin wrapper)

**Interfaces:**
- Consumes: `Chip` from `@/components/onboarding/chip`; `ThemedText`,
  `ThemedView`; `MaxContentWidth`, `Spacing`, `Radius`, `Elevation` from
  `@/constants/theme`; `useTheme`; `ALL_EQUIPMENT_TAGS`, `ALL_MUSCLE_TAGS`,
  `MUSCLE_GROUP_MAP` from `@/lib/muscle-group-map`; `supabase`;
  `Database`; `expo-image` `Image`; `expo-router` `router`,
  `useLocalSearchParams`.
- Produces:
  - `export function ExerciseLibraryList(props: { mode: 'browse' | 'pick' }): JSX.Element`
  - In `pick` mode the component itself reads
    `useLocalSearchParams<{ pickForExerciseId?: string; oldExerciseName?:
    string; muscleGroup?: string }>()`.

- [ ] **Step 1: Create `src/components/exercise-library-list.tsx`**

Move the body of the current `ExerciseLibraryScreen` into this component.
Changes from the original:
- Component signature: `export function ExerciseLibraryList({ mode }: {
  mode: 'browse' | 'pick' })`.
- `const isPickMode = mode === 'pick';` (replaces the
  `Boolean(params.pickForExerciseId)` derivation). Still call
  `useLocalSearchParams` unconditionally; just gate its use on
  `isPickMode`.
- Render the `← Назад` `Pressable` and the `headerTitle` block **only when
  `isPickMode`**. In `browse` mode render a plain
  `<ThemedText type="title">Библиотека упражнений</ThemedText>` and no back
  button (the tab bar is the navigation).
- `openExercise` unchanged (in `browse` mode `isPickMode` is false so no
  `pickForExerciseId` param is forwarded — correct).
- Card styling: change `borderRadius: Spacing.three` → `borderRadius:
  Radius.card` and spread `...Elevation.card` into the `card` style. Change
  `thumb` `borderRadius: Spacing.two` → `borderRadius: Radius.row`.
- Add `Radius, Elevation` to the `@/constants/theme` import.

Full file:

```tsx
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALL_EQUIPMENT_TAGS, ALL_MUSCLE_TAGS, MUSCLE_GROUP_MAP } from '@/lib/muscle-group-map';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type LibraryExercise = Pick<
  Database['public']['Tables']['exercise_library']['Row'],
  'id' | 'name_ru' | 'category_ru' | 'level_ru' | 'equipment_ru' | 'primary_muscles_ru' | 'images'
>;

export function ExerciseLibraryList({ mode }: { mode: 'browse' | 'pick' }) {
  const theme = useTheme();
  const isPickMode = mode === 'pick';
  const params = useLocalSearchParams<{
    pickForExerciseId?: string;
    oldExerciseName?: string;
    muscleGroup?: string;
  }>();

  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(
    () => (isPickMode ? MUSCLE_GROUP_MAP[params.muscleGroup ?? ''] ?? [] : [])
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [exercises, setExercises] = useState<LibraryExercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setExercises(null);
      let query = supabase
        .from('exercise_library')
        .select('id, name_ru, category_ru, level_ru, equipment_ru, primary_muscles_ru, images')
        .order('name_ru');
      if (selectedMuscles.length > 0) query = query.overlaps('primary_muscles_ru', selectedMuscles);
      if (selectedEquipment.length > 0) query = query.in('equipment_ru', selectedEquipment);

      const { data, error: loadError } = await query;
      if (cancelled) return;
      if (loadError) setError(loadError.message);
      else setExercises(data ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedMuscles, selectedEquipment]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function openExercise(exerciseId: string) {
    router.push({
      pathname: '/exercise-library/[id]',
      params: {
        id: exerciseId,
        ...(isPickMode ? { pickForExerciseId: params.pickForExerciseId! } : {}),
      },
    });
  }

  const headerTitle = useMemo(() => {
    if (isPickMode) {
      return params.oldExerciseName
        ? `Выбери замену для «${params.oldExerciseName}»`
        : 'Выбери замену';
    }
    return 'Библиотека упражнений';
  }, [isPickMode, params.oldExerciseName]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={isPickMode ? ['top', 'bottom'] : ['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isPickMode && (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ThemedText type="link" themeColor="textSecondary">
                ← Назад
              </ThemedText>
            </Pressable>
          )}

          <ThemedText type="title" style={styles.title}>
            {headerTitle}
          </ThemedText>

          <ThemedText type="smallBold">Группа мышц</ThemedText>
          <View style={styles.chipsRow}>
            {ALL_MUSCLE_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={selectedMuscles.includes(tag)}
                onPress={() => toggle(selectedMuscles, setSelectedMuscles, tag)}
              />
            ))}
          </View>

          <ThemedText type="smallBold">Оборудование</ThemedText>
          <View style={styles.chipsRow}>
            {ALL_EQUIPMENT_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={selectedEquipment.includes(tag)}
                onPress={() => toggle(selectedEquipment, setSelectedEquipment, tag)}
              />
            ))}
          </View>

          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {!exercises && !error && <ActivityIndicator color={theme.text} style={styles.loader} />}

          {exercises && exercises.length === 0 && (
            <ThemedText themeColor="textSecondary">Ничего не найдено под эти фильтры.</ThemedText>
          )}

          <View style={styles.list}>
            {exercises?.map((ex) => (
              <Pressable
                key={ex.id}
                onPress={() => openExercise(ex.id)}
                style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                {ex.images[0] && (
                  <Image source={{ uri: ex.images[0] }} style={styles.thumb} contentFit="cover" />
                )}
                <View style={styles.cardText}>
                  <ThemedText type="smallBold">{ex.name_ru}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[ex.category_ru, ex.level_ru, ex.equipment_ru].filter(Boolean).join(' · ')}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  title: {
    marginBottom: Spacing.one,
    fontSize: 28,
    lineHeight: 34,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  loader: {
    marginTop: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Radius.card,
    padding: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
    ...Elevation.card,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.row,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
});
```

- [ ] **Step 2: Replace `src/app/exercise-library/index.tsx` with a wrapper**

Full new file:

```tsx
import { ExerciseLibraryList } from '@/components/exercise-library-list';

export default function ExerciseLibraryPickScreen() {
  return <ExerciseLibraryList mode="pick" />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 5: Manual browser check**

Dev server running. Go to `http://localhost:8081`, pick **Максим** →
`plan-ready` → tap "День 1 · Ноги · Дом" → on the day screen tap
**Заменить** under any exercise. Expected: the library opens in pick mode —
title "Выбери замену для «…»", muscle chips pre-selected for the day's
group, `← Назад` present. Tap a result → detail screen → **Выбрать это
упражнение** → returns to the day screen with the new name. (This is the
unchanged pick flow, now served by the extracted component.)

Also open `http://localhost:8081/exercise-library` directly: still works
(pick mode with no params → generic "Выбери замену" title, no pre-filter).

- [ ] **Step 6: Commit**

```bash
git add src/components/exercise-library-list.tsx src/app/exercise-library/index.tsx
git commit -m "Extract ExerciseLibraryList component with browse/pick modes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 5: Navigation primitives — `NAV_ITEMS` and `TabTriggerButton`

**Files:**
- Create: `src/components/navigation/nav-items.ts`
- Create: `src/components/navigation/tab-trigger-button.tsx`

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `ThemedText`;
  `Spacing`, `Radius` from `@/constants/theme`; `useTheme`.
- Produces:
  - `export type NavItem = { name: string; href: string; label: string; icon: keyof typeof Ionicons.glyphMap }`
  - `export const NAV_ITEMS: readonly NavItem[]` — 5 entries, order:
    home, workouts, nutrition, library, profile.
  - `export const TabTriggerButton: React.ForwardRefExoticComponent<
    TabTriggerButtonProps & React.RefAttributes<View>>` where
    `TabTriggerButtonProps = { icon: keyof typeof Ionicons.glyphMap;
    label: string; variant: 'sidebar' | 'bottom'; isFocused?: boolean;
    onPress?: (e: GestureResponderEvent) => void; onLongPress?: (e:
    GestureResponderEvent) => void }` (plus any other props spread through
    from `TabTrigger asChild`).

- [ ] **Step 1: Create `src/components/navigation/nav-items.ts`**

```ts
import { Ionicons } from '@expo/vector-icons';

export type NavItem = {
  /** Stable id, matches the <TabTrigger name> in the hidden TabList. */
  name: string;
  /** Route the TabList trigger points at. */
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { name: 'home', href: '/(tabs)/home', label: 'Главная', icon: 'home-outline' },
  { name: 'workouts', href: '/(tabs)/workouts', label: 'Тренировки', icon: 'barbell-outline' },
  { name: 'nutrition', href: '/(tabs)/nutrition', label: 'Питание', icon: 'restaurant-outline' },
  { name: 'library', href: '/(tabs)/library', label: 'Библиотека', icon: 'library-outline' },
  { name: 'profile', href: '/(tabs)/profile', label: 'Профиль', icon: 'person-outline' },
] as const;
```

Note: all five icon names (`home-outline`, `barbell-outline`,
`restaurant-outline`, `library-outline`, `person-outline`) exist in
Ionicons — `keyof typeof Ionicons.glyphMap` will fail the typecheck if any
is wrong.

- [ ] **Step 2: Create `src/components/navigation/tab-trigger-button.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TabTriggerButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: 'sidebar' | 'bottom';
  isFocused?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
};

export const TabTriggerButton = forwardRef<View, TabTriggerButtonProps>(function TabTriggerButton(
  { icon, label, variant, isFocused, onPress, onLongPress },
  ref
) {
  const theme = useTheme();
  const active = isFocused ?? false;
  const tint = active ? theme.text : theme.textSecondary;

  if (variant === 'sidebar') {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[
          styles.sidebarРow,
          active && { backgroundColor: theme.backgroundSelected },
        ]}>
        <Ionicons name={icon} size={22} color={tint} />
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.bottomItem}>
      <Ionicons name={icon} size={24} color={tint} />
      <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'} style={styles.bottomLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  sidebarРow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.row,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
  },
  bottomLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
```

Rename the `sidebarРow` key to `sidebarRow` (ASCII) when typing this — the
Cyrillic `Р` above is a transcription artifact. Use plain ASCII
identifiers.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If an icon name is rejected, pick the nearest valid
Ionicons name (check `node_modules/@expo/vector-icons/build/Ionicons.d.ts`).

- [ ] **Step 4: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation/nav-items.ts src/components/navigation/tab-trigger-button.tsx
git commit -m "Add NAV_ITEMS and shared TabTriggerButton

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 6: `Sidebar` and `BottomBar`

**Files:**
- Create: `src/components/navigation/sidebar.tsx`
- Create: `src/components/navigation/bottom-bar.tsx`

**Interfaces:**
- Consumes: `Tabs`, `TabList`, `TabTrigger`, `TabSlot` — no; **only**
  `TabTrigger` from `expo-router/ui`; `NAV_ITEMS`; `TabTriggerButton`;
  `BlurView` from `expo-blur`; `useTheme`; `Spacing`, `Radius` from
  `@/constants/theme`; `useSafeAreaInsets` from
  `react-native-safe-area-context`; `ThemedText`.
- Produces:
  - `export function Sidebar(): JSX.Element`
  - `export function BottomBar(): JSX.Element`
- Both render, for each `NAV_ITEMS` entry:
  `<TabTrigger name={item.name} asChild><TabTriggerButton icon={item.icon}
  label={item.label} variant=… /></TabTrigger>`. `TabTrigger` forwards
  `isFocused`, `onPress`, `onLongPress`, `ref` into `TabTriggerButton`.

- [ ] **Step 1: Confirm the `expo-router/ui` export surface for SDK 57**

Run: `node -e "console.log(Object.keys(require('expo-router/ui')))"`
Expected: includes `Tabs`, `TabList`, `TabTrigger`, `TabSlot`. If the
import path differs, check
`https://docs.expo.dev/router/advanced/custom-tabs/` for SDK 57 and adjust
all `expo-router/ui` imports in this task and Task 7.

- [ ] **Step 2: Create `src/components/navigation/sidebar.tsx`**

```tsx
import { TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabTriggerButton } from '@/components/navigation/tab-trigger-button';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Sidebar() {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left']}
      style={[styles.container, { borderRightColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold" style={styles.brand}>
        fit-app
      </ThemedText>
      <View style={styles.list}>
        {NAV_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} asChild>
            <TabTriggerButton icon={item.icon} label={item.label} variant="sidebar" />
          </TabTrigger>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  brand: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  list: {
    gap: Spacing.one,
  },
});
```

Note on blur: `BlurView` as a full-height sidebar background on web is
visually marginal and can trap layout height. For the sidebar, a solid
`theme.background` (via `SafeAreaView` default from `ThemedView`? no —
`SafeAreaView` here has no bg) — add `backgroundColor: theme.background` to
the container style inline. Blur is applied to the **BottomBar** only,
where the "floating over content" effect matters. Update the container
`style` array to include `{ backgroundColor: theme.background,
borderRightColor: theme.backgroundSelected }`.

- [ ] **Step 3: Create `src/components/navigation/bottom-bar.tsx`**

```tsx
import { BlurView } from 'expo-blur';
import { TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabTriggerButton } from '@/components/navigation/tab-trigger-button';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function BottomBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const tint = scheme === 'dark' ? 'dark' : 'light';

  return (
    <BlurView
      intensity={40}
      tint={tint}
      style={[styles.container, { borderTopColor: theme.backgroundSelected, paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {NAV_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} asChild>
            <TabTriggerButton icon={item.icon} label={item.label} variant="bottom" />
          </TabTrigger>
        ))}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
});
```

If `useColorScheme` from `@/hooks/use-color-scheme` can return
`'unspecified'` (it can — see `src/hooks/use-theme.ts`), the `scheme ===
'dark' ? 'dark' : 'light'` fallback above already handles it.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/navigation/sidebar.tsx src/components/navigation/bottom-bar.tsx
git commit -m "Add Sidebar and BottomBar navigation components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 7: Adaptive shell `(tabs)/_layout.tsx` + placeholder tab screens

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/home.tsx`, `src/app/(tabs)/workouts.tsx`,
  `src/app/(tabs)/nutrition.tsx`, `src/app/(tabs)/library.tsx`,
  `src/app/(tabs)/profile.tsx` (minimal stubs)
- Modify: `src/app/_layout.tsx` (register `(tabs)`)

**Interfaces:**
- Consumes: `Tabs`, `TabList`, `TabTrigger`, `TabSlot` from
  `expo-router/ui`; `Sidebar`, `BottomBar`; `NAV_ITEMS`;
  `useWindowDimensions` from `react-native`.
- Produces: routes `/home`, `/workouts`, `/nutrition`, `/library`,
  `/profile` rendered inside the shell; the group has **no** `index` route.

- [ ] **Step 1: Create the 5 stub screens**

Each file, substituting the label:

`src/app/(tabs)/home.tsx`:

```tsx
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeTab() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.inner}>
        <ThemedText type="title">Главная</ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four },
});
```

Repeat for `workouts.tsx` (`WorkoutsTab`, "Тренировки"), `nutrition.tsx`
(`NutritionTab`, "Питание"), `library.tsx` (`LibraryTab`, "Библиотека"),
`profile.tsx` (`ProfileTab`, "Профиль"). Real content lands in Tasks 8-9.

- [ ] **Step 2: Create `src/app/(tabs)/_layout.tsx`**

```tsx
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { BottomBar } from '@/components/navigation/bottom-bar';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { Sidebar } from '@/components/navigation/sidebar';

const WIDE_BREAKPOINT = 768;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  return (
    <Tabs>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide ? <Sidebar /> : null}
        <View style={{ flex: 1 }}>
          <TabSlot />
        </View>
        {wide ? null : <BottomBar />}
      </View>
      <TabList style={{ display: 'none' }}>
        {NAV_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} href={item.href} />
        ))}
      </TabList>
    </Tabs>
  );
}
```

Leave the unused `useEffect`/`useState` import out — they are not needed
here (the no-profile guard lives in Task 10, added to `home.tsx`). If you
pasted them, delete them so lint passes.

- [ ] **Step 3: Register `(tabs)` in `src/app/_layout.tsx`**

Add one line inside the `<Stack>`, after the existing screens and before
the closing tag:

```tsx
<Stack.Screen name="(tabs)" />
```

Do **not** remove `plan-ready` yet (Task 11 does that). Full `<Stack>` now:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="onboarding/index" />
  <Stack.Screen name="plan-ready" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="workout-day/[id]" />
  <Stack.Screen name="exercise-library/index" />
  <Stack.Screen name="exercise-library/[id]" />
</Stack>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. Typed routes regenerate; if `href={item.href}` (a plain
`string`) is rejected by typed routes, change `NavItem.href`'s type to
`import('expo-router').Href` in `nav-items.ts`, or cast at the call site
`href={item.href as never}` as a last resort and leave a `// TODO: typed
route` comment.

- [ ] **Step 5: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 6: Manual browser check**

Dev server running. Open `http://localhost:8081/home`.
- Wide window (default ~1568px): sidebar on the left with 5 items, "Главная"
  visible in the content area, the active row highlighted.
- Click each of Тренировки / Питание / Библиотека / Профиль — content
  swaps, highlight moves, URL changes to `/workouts` etc.
- Narrow the browser window below 768px: sidebar disappears, a bottom bar
  with 5 icons+labels appears; tapping switches tabs; active icon uses the
  full-contrast colour.
- No horizontal page scroll at any width.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(tabs)" src/app/_layout.tsx
git commit -m "Add adaptive tab shell with sidebar/bottom-bar and stub screens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 8: Fill Главная / Тренировки / Питание content

**Files:**
- Modify: `src/app/(tabs)/home.tsx`, `src/app/(tabs)/workouts.tsx`,
  `src/app/(tabs)/nutrition.tsx`

**Interfaces:**
- Consumes: `loadPlan`, `PlanData` from `@/lib/load-plan`;
  `getStoredProfileId` from `@/lib/profile-storage`; `BMI_DISCLAIMER` from
  `@/lib/health-calc`; `router` from `expo-router`; `ThemedText`,
  `ThemedView`; `Elevation`, `MaxContentWidth`, `Radius`, `Spacing` from
  `@/constants/theme`; `useTheme`.
- Produces: nothing consumed by later tasks.

Shared pattern for all three (mirrors the old `plan-ready.tsx`): local
state `data: PlanData | null`, `error: string | null`, `profileId:
ProfileId | null`; `useEffect` resolves `profileId` via
`getStoredProfileId()` (redirect to `/` if absent — see Task 10 note, but
include it now), second `useEffect` calls `loadPlan(profileId)`.

- [ ] **Step 1: `src/app/(tabs)/home.tsx`**

```tsx
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BMI_DISCLAIMER } from '@/lib/health-calc';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import { getStoredProfileId } from '@/lib/profile-storage';
import type { ProfileId } from '@/types/database';

export default function HomeTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);
  const [data, setData] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStoredProfileId().then((stored) => {
      if (stored) setProfileId(stored);
      else router.replace('/');
    });
  }, []);

  useEffect(() => {
    if (!profileId) return;
    loadPlan(profileId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [profileId]);

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText>{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { settings, program, workoutDays } = data;
  const isStub = program?.generation_source === 'stub';
  const today = workoutDays[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Главная
          </ThemedText>

          {isStub && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Это черновик, не настоящий ИИ-план</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ключ Claude API ещё не подключён, поэтому программа тренировок и питания —
                упрощённая заглушка. ИМТ и норма калорий посчитаны по-настоящему. Как только
                появится ключ, план перегенерируется настоящим ИИ по тем же ответам.
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">ИМТ</ThemedText>
            <ThemedText type="subtitle">
              {settings.bmi_value} · {settings.bmi_category}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {BMI_DISCLAIMER}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Норма калорий и БЖУ</ThemedText>
            <ThemedText type="subtitle">{settings.recommended_calories} ккал/день</ThemedText>
            <ThemedText type="default">
              Белки {settings.calorie_protein_g} г · Жиры {settings.calorie_fat_g} г · Углеводы{' '}
              {settings.calorie_carbs_g} г
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {settings.calorie_method}
            </ThemedText>
          </ThemedView>

          {today ? (
            <Pressable
              onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: today.id } })}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">План на сегодня</ThemedText>
                <ThemedText type="default">
                  {today.day_label} · {today.target_muscle_groups.join(', ')} · {today.default_context}
                </ThemedText>
                {today.exercises.map((ex) => (
                  <ThemedText key={ex.id} type="small" themeColor="textSecondary">
                    • {ex.exercise} — {ex.sets}×{ex.reps_or_time}
                  </ThemedText>
                ))}
              </ThemedView>
            </Pressable>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">План ещё не построен</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Пройди онбординг во вкладке «Профиль», чтобы получить программу.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: { gap: Spacing.three, paddingVertical: Spacing.four },
  title: { marginBottom: Spacing.two },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Elevation.card,
  },
});
```

- [ ] **Step 2: `src/app/(tabs)/workouts.tsx`**

Same scaffold (profileId + data + error + the two `useEffect`s + the
`error` / `!data` early returns + the same `styles`). Body:

```tsx
  const { program, workoutDays } = data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Тренировки
          </ThemedText>

          {program ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{program.name}</ThemedText>
              {workoutDays.map((day) => (
                <Pressable
                  key={day.id}
                  onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: day.id } })}
                  style={styles.dayBlock}>
                  <ThemedText type="default">
                    {day.day_label} · {day.target_muscle_groups.join(', ')} · {day.default_context}
                  </ThemedText>
                  {day.exercises.map((ex) => (
                    <ThemedText key={ex.id} type="small" themeColor="textSecondary">
                      • {ex.exercise} — {ex.sets}×{ex.reps_or_time}
                    </ThemedText>
                  ))}
                </Pressable>
              ))}
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Программа ещё не построена</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Пройди онбординг во вкладке «Профиль».
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
```

Add `dayBlock: { gap: Spacing.half, marginTop: Spacing.two }` to `styles`.

- [ ] **Step 3: `src/app/(tabs)/nutrition.tsx`**

Same scaffold. Body:

```tsx
  const { mealPlan, meals } = data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Питание
          </ThemedText>

          {mealPlan ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Пример дня питания</ThemedText>
              {meals.map((meal) => (
                <ThemedText key={meal.id} type="small" themeColor="textSecondary">
                  • {meal.name} — {meal.calories} ккал (Б{meal.protein_g}/Ж{meal.fat_g}/У{meal.carbs_g})
                </ThemedText>
              ))}
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">План питания ещё не построен</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Пройди онбординг во вкладке «Профиль».
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 6: Manual browser check**

Dev server running. `http://localhost:8081/home` with Максим selected
(pick the profile first at `/` if needed — it will land on `plan-ready`
still; then navigate to `/home` manually).
- Главная: draft notice + ИМТ card + calories card + "План на сегодня"
  (День 1), each card visibly raised (soft shadow), radius 20. Tapping the
  today card opens the workout-day screen.
- `/workouts`: program name + all 4 days, each row opens its day.
- `/nutrition`: meal example list.
- Resize narrow: content stays single-column under a bottom bar, no
  horizontal scroll.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(tabs)/home.tsx" "src/app/(tabs)/workouts.tsx" "src/app/(tabs)/nutrition.tsx"
git commit -m "Fill Home/Workouts/Nutrition tab content from plan-ready

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 9: Библиотека and Профиль tabs

**Files:**
- Modify: `src/app/(tabs)/library.tsx`, `src/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `ExerciseLibraryList` from `@/components/exercise-library-list`;
  `clearStoredProfileId`, `getStoredProfileId` from `@/lib/profile-storage`;
  `router` from `expo-router`; `ThemedText`, `ThemedView`; theme tokens;
  `useTheme`.
- Produces: nothing consumed later.

- [ ] **Step 1: `src/app/(tabs)/library.tsx`**

```tsx
import { ExerciseLibraryList } from '@/components/exercise-library-list';

export default function LibraryTab() {
  return <ExerciseLibraryList mode="browse" />;
}
```

- [ ] **Step 2: `src/app/(tabs)/profile.tsx`**

```tsx
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearStoredProfileId, getStoredProfileId } from '@/lib/profile-storage';
import type { ProfileId } from '@/types/database';

const DISPLAY_NAME: Record<ProfileId, string> = { maksim: 'Максим', maria: 'Мария' };

export default function ProfileTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);

  useEffect(() => {
    getStoredProfileId().then((stored) => {
      if (stored) setProfileId(stored);
      else router.replace('/');
    });
  }, []);

  async function switchProfile() {
    await clearStoredProfileId();
    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Профиль
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Сейчас занимается</ThemedText>
            <ThemedText type="subtitle">
              {profileId ? DISPLAY_NAME[profileId] : '—'}
            </ThemedText>
          </ThemedView>

          <Pressable
            onPress={switchProfile}
            style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Сменить профиль</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/onboarding')}
            style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Пройти онбординг заново</ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Вход по email и паролю появится позже — пока приложение работает в
            гостевом режиме (Максим / Мария).
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: { gap: Spacing.three, paddingVertical: Spacing.four },
  title: { marginBottom: Spacing.two },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Elevation.card,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  note: { marginTop: Spacing.two },
});
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 5: Manual browser check**

Dev server running.
- `/library`: the full filter UI + exercise list, **no** `← Назад`, title
  "Библиотека упражнений". Tapping a card opens the detail screen with no
  "Выбрать это упражнение" button (browse mode — no `pickForExerciseId`).
- `/profile`: shows "Максим", "Сменить профиль" → returns to `/` picker,
  "Пройти онбординг заново" → onboarding screen, and the note text.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(tabs)/library.tsx" "src/app/(tabs)/profile.tsx"
git commit -m "Wire Library and Profile tab content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 10: Entry-flow redirects into the tab shell

**Files:**
- Modify: `src/app/index.tsx:38` (the `router.replace` in `selectProfile`)
- Modify: `src/app/onboarding/index.tsx:68` (the `router.replace` after
  `generateStubPlan`)

**Interfaces:**
- Consumes: nothing new.
- Produces: after profile-pick (existing profile) and after onboarding,
  the app lands on `/home`.

- [ ] **Step 1: `src/app/index.tsx`**

In `selectProfile`, change:

```tsx
      if (data) {
        router.replace({ pathname: '/plan-ready', params: { profile: id } });
      } else {
        router.replace({ pathname: '/onboarding', params: { profile: id } });
      }
```

to:

```tsx
      if (data) {
        router.replace('/home');
      } else {
        router.replace({ pathname: '/onboarding', params: { profile: id } });
      }
```

- [ ] **Step 2: `src/app/onboarding/index.tsx`**

In `handleNext`, change:

```tsx
      await generateStubPlan(profileId, answers);
      router.replace({ pathname: '/plan-ready', params: { profile: profileId } });
```

to:

```tsx
      await generateStubPlan(profileId, answers);
      router.replace('/home');
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If typed routes reject the bare `'/home'` string, use
`router.replace({ pathname: '/home' })` or the `/(tabs)/home` form
consistent with what worked in Task 7 Step 4.)

- [ ] **Step 4: Lint**

Run: `npx expo lint`
Expected: PASS. `plan-ready.tsx` still exists and is still registered, so
no dangling reference yet.

- [ ] **Step 5: Manual browser check**

Dev server running. Fully reload `http://localhost:8081`.
- Pick **Максим** (has settings) → lands directly on `/home` with the tab
  shell (not `plan-ready`).
- "Сменить профиль" in Профиль → picker → pick again → `/home`.
- (Optional, destructive) To test the onboarding redirect without wiping
  real data: skip. The code path is a one-line change mirrored from the
  picker and is covered by tsc.

- [ ] **Step 6: Commit**

```bash
git add src/app/index.tsx src/app/onboarding/index.tsx
git commit -m "Redirect profile-pick and onboarding into the tab shell

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 11: Delete `plan-ready.tsx`; polish remaining stack screens

**Files:**
- Delete: `src/app/plan-ready.tsx`
- Modify: `src/app/_layout.tsx` (remove the `plan-ready` screen line)
- Modify: `src/app/workout-day/[id].tsx` (card radius + elevation)
- Modify: `src/app/exercise-library/[id].tsx` (card/image radius +
  elevation)

**Interfaces:**
- Consumes: `Radius`, `Elevation` from `@/constants/theme`.
- Produces: nothing consumed later.

- [ ] **Step 1: Delete the screen and unregister it**

```bash
git rm src/app/plan-ready.tsx
```

In `src/app/_layout.tsx` remove the line `<Stack.Screen name="plan-ready" />`.

- [ ] **Step 2: `src/app/workout-day/[id].tsx` polish**

Read the file first. In its `StyleSheet.create`, for every style object
that is used as a card/blocked surface with `borderRadius: Spacing.three`
(the warm-up / cooldown / exercise blocks — currently the `card` style),
change `borderRadius: Spacing.three` → `borderRadius: Radius.card` and add
`...Elevation.card`. Add `Elevation, Radius` to the `@/constants/theme`
import. Leave the `← Назад` link, the pill-shaped "Заменить" button
(`borderRadius: 999` → `Radius.pill`), and layout spacing untouched
otherwise.

- [ ] **Step 3: `src/app/exercise-library/[id].tsx` polish**

Read the file first. In its `StyleSheet.create`:
- `image` `borderRadius: Spacing.three` → `Radius.card`.
- `card` (the "Техника выполнения" block) `borderRadius: Spacing.three` →
  `Radius.card`, add `...Elevation.card`.
- `confirmButton` `borderRadius: Spacing.three` → `Radius.card`.
Add `Elevation, Radius` to the `@/constants/theme` import.

- [ ] **Step 4: Grep for stragglers**

Run: `grep -rn "borderRadius: Spacing" src/`
Expected: no remaining matches in `src/app/**` or
`src/components/exercise-library-list.tsx` card/image styles. `Chip`
(`borderRadius: 999`) and any intentionally-pill controls may stay, but
switch literal `999` → `Radius.pill` where you see it for consistency.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — and critically, this catches any lingering import of
`plan-ready` or `./plan-ready` anywhere.

- [ ] **Step 6: Lint**

Run: `npx expo lint`
Expected: PASS.

- [ ] **Step 7: Manual browser check**

Dev server running.
- `http://localhost:8081/` → pick Максим → `/home`. Navigating to
  `/plan-ready` now 404s / shows the not-found screen (expected — it is
  gone).
- Open a workout day and an exercise detail (via `/workouts` → day →
  card): cards have the same soft shadow + radius-20 as the tab screens;
  no visual regression; no horizontal scroll.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove plan-ready screen; apply radius/shadow polish to stack screens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

---

## Task 12: Full verification pass and docs update

**Files:**
- Modify: `CLAUDE.md` (mark Step 1 done)
- Modify: `roadmap-auth-ai-design.md` (mark Step 1 done, note the deviations)

**Interfaces:** none.

- [ ] **Step 1: Clean typecheck + lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: both exit 0, no output of concern.

- [ ] **Step 2: Full manual runthrough (dev server on web)**

Walk the spec's testing checklist end to end:
1. Wide screen → sidebar; resize < 768px → bottom bar; no content jump, no
   horizontal scroll.
2. All 5 tabs load their real content for the Максим profile.
3. Active nav item highlighted, moves on switch.
4. `/workouts` → day → `workout-day/[id]` opens over the shell; `← Назад`
   returns into the tab.
5. Replace flow: `/workouts` → day → "Заменить" → `exercise-library` pick
   mode, muscle pre-filter → detail → "Выбрать это упражнение" → back on
   the day, exercise name updated.
6. `/library` (browse) opens without the pick button.
7. `/profile`: "Сменить профиль" → `/` picker; "Пройти онбординг заново" →
   onboarding.
8. From `/` picking Максим lands on `/home` (not `plan-ready`).

Record any failure and fix before proceeding; re-run tsc + lint after any
fix.

- [ ] **Step 3: Update `CLAUDE.md`**

In the "Готово и работает" list add a bullet noting the adaptive
navigation shell (`src/app/(tabs)/`), the 5 tabs, the shared
`src/lib/load-plan.ts` and `src/components/exercise-library-list.tsx`, and
that `plan-ready.tsx` was removed. In "Roadmap дальше" mark step (1) done
and make step (2) — the white/orange theme — the next step.

- [ ] **Step 4: Update `roadmap-auth-ai-design.md`**

Under "Шаг 1" note it is implemented, and record the two deviations:
`expo-router/ui` custom tabs instead of a manual `<Tabs>` swap; icons via
`@expo/vector-icons` (Ionicons) instead of `expo-symbols`
(`expo-symbols` has no cross-platform fallback). Note the tab group uses
named screens (`home.tsx` …) because `(tabs)/index.tsx` would collide with
the root profile-picker `index.tsx` at URL `/`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md roadmap-auth-ai-design.md
git commit -m "Document adaptive navigation as complete (Roadmap Step 1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmfgX5wjWHGZkHNHU7No4Q"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin step1-adaptive-navigation
```

Then report to the user for review / merge decision (do not merge to
`main` without the user's say-so).

---

## Self-Review

**Spec coverage:**
- Route structure (`(tabs)` group, modals stay stack, `plan-ready`
  removed) → Tasks 7, 11. Named-screen deviation documented in the plan
  header + Task 12.
- `plan-ready.tsx` deleted, redirect to tab shell → Tasks 10, 11.
- Picker + onboarding stay outside tabs → unchanged; redirects only →
  Task 10.
- `exercise-library/index.tsx` stays for pick mode; list body extracted →
  Task 4.
- Adaptive shell with `expo-router/ui`, hidden `TabList`, `width >= 768`
  → Task 7.
- `NAV_ITEMS`, `Sidebar`, `BottomBar`, `TabTriggerButton` with `isFocused`
  → Tasks 5, 6.
- `loadPlan` + `PlanData` → `src/lib/load-plan.ts` → Task 3.
- Content mapping table (Home / Workouts / Nutrition / Library / Profile)
  → Tasks 8, 9. Empty states included.
- `Radius` + `Elevation` in `theme.ts`; cards normalized; blur on bars;
  no new component library → Tasks 1, 4, 6, 8, 9, 11.
- Deps `expo-blur` + `@expo/vector-icons` → Task 2.
- Error handling model per screen (`error` text / spinner / null-program
  empty states / no-profile redirect) → Tasks 8, 9.
- Testing = tsc + lint + manual (no unit framework) → every task + Task 12.
- Out of scope (orange theme, food log, AI, auth, SF Symbols, load cache)
  → not implemented; noted in plan header Global Constraints and Task 12
  docs update.

**Placeholder scan:** No "TBD"/"TODO" left as work items. The two
`// TODO` mentions are conditional fallbacks (typed-route cast; Android
blur) with concrete instructions, not deferred work. Icon-name and
shadow-value "adjust if…" notes carry the exact file to check.

**Type consistency:**
- `loadPlan(profileId: ProfileId): Promise<PlanData>` — defined Task 3,
  consumed Tasks 8-9 with the same signature and destructured fields
  (`settings`, `program`, `workoutDays`, `mealPlan`, `meals`) that match
  the `PlanData` shape.
- `ExerciseLibraryList({ mode: 'browse' | 'pick' })` — defined Task 4,
  consumed Task 4 (`pick`) and Task 9 (`browse`).
- `NAV_ITEMS` item shape `{ name, href, label, icon }` — defined Task 5,
  consumed Tasks 6, 7 with those exact keys.
- `TabTriggerButton` props `{ icon, label, variant, isFocused?, onPress?,
  onLongPress? }` — defined Task 5, consumed Task 6 passing `icon`,
  `label`, `variant`; `isFocused`/`onPress`/`onLongPress` injected by
  `TabTrigger asChild`.
- `Radius` (`card`/`row`/`pill`) and `Elevation` (`card`) — defined
  Task 1, consumed Tasks 4, 6, 8, 9, 11 with those keys.
