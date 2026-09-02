@AGENTS.md

# Текущее состояние проекта (обновлено 2026-09-02)

## Готово и работает

- Схема Supabase (`supabase/migrations/0001_init.sql`): профили без
  аутентификации (`maksim`/`maria`), онбординг, программа тренировок
  (programs/phases/workout_days/exercises), план питания, логи и прогресс.
  RLS открыт для anon (осознанное решение — семейное приложение без пароля).
- Экраны: выбор профиля (`src/app/index.tsx`) → онбординг
  (`src/app/onboarding/index.tsx`) → генерация чернового плана-заглушки
  (`src/lib/plan-stub.ts`, `generation_source = 'stub'`, ИМТ и калории
  считаются по-настоящему) → `router.replace('/home')`, дальше — адаптивная
  навигация-оболочка (см. ниже).
- Библиотека упражнений (741 упражнение из free-exercise-db, рус. перевод):
  таблица `exercise_library` (`supabase/migrations/0002_exercise_library.sql`,
  применена), импорт выполнен (`scripts/import-exercise-library.js`, 741/741),
  экран списка с фильтрами (`src/app/exercise-library/index.tsx`), карточка
  упражнения с фото и техникой (`src/app/exercise-library/[id].tsx`), замена
  упражнения в программе на аналог из библиотеки (`src/app/workout-day/[id].tsx`).
  Весь флоу проверен вживую 2026-09-01, работает.
- Адаптивная навигация-оболочка (`src/app/(tabs)/`): кастомные табы на
  `expo-router/ui`, на широком экране (`width >= 768`) — `<Sidebar>` слева,
  на узком — `<BottomBar>` снизу. 5 разделов: Главная / Тренировки / Питание
  / Библиотека / Профиль (`home.tsx` / `workouts.tsx` / `nutrition.tsx` /
  `library.tsx` / `profile.tsx`), компоненты в `src/components/navigation/`.
  Общий код вынесен: `src/lib/load-plan.ts` (`loadPlan` + `PlanData`) и
  `src/components/exercise-library-list.tsx`
  (`<ExerciseLibraryList mode="browse"|"pick">`). Экран `plan-ready.tsx`
  удалён — выбор профиля и онбординг ведут сразу на `/home`. Базовая
  visual-полировка: токены `Radius`/`Elevation` в `src/constants/theme.ts`,
  карточки на табах и в stack-экранах используют их, панели навигации —
  `expo-blur`. Новые зависимости: `expo-blur` (~57.0.2) и
  `@expo/vector-icons` (Ionicons).
- Бело-оранжевая цветовая тема (Roadmap Шаг 2, коммит `5e9e25e`, в `main`):
  токены `accent` / `onAccent` / `accentText` в `src/constants/theme.ts`
  (`onAccent` в светлой теме тёмный — белый на оранжевом не проходит по
  контрасту; `accentText` = `#C2410C` для акцентного текста на светлом
  фоне), `backgroundSelected` — светло-оранжевая подложка выбранного
  состояния, `backgroundElement` осветлён до `#F5F5F5`. Применено точечно:
  выбранный чип, главная кнопка онбординга, тинт иконки активного пункта
  навигации, `linkPrimary` в `ThemedText`, CTA выбора упражнения.
  Проверено вживую 2026-09-02.
- CLI Supabase не подключён — миграции применяются руками через
  Supabase Dashboard → SQL Editor. Типы `Database` в `src/types/database.ts`
  поддерживаются руками, синхронно с миграциями.
- Ключ `ANTHROPIC_API_KEY` ещё не подключён — программа и питание генерируются
  заглушкой, а не настоящим ИИ (это Шаг в roadmap ниже, ещё не начат).

## Roadmap дальше

Подробный технический план — `roadmap-auth-ai-design.md` в корне репозитория.
Порядок: (1) адаптивная навигация (сайдбар на широком экране/таб-бар на
узком, как в официальных приложениях Apple) + общая visual-полировка —
ГОТОВО (2026-09-01; отклонения от исходного плана записаны в
`roadmap-auth-ai-design.md`, «Шаг 1»); (2) бело-оранжевая цветовая тема —
ГОТОВО (2026-09-02, коммит `5e9e25e`, влита в `main`; отклонения ради
контраста по WCAG записаны в `roadmap-auth-ai-design.md`, «Шаг 2»);
(3) Supabase Edge Function для реального ИИ вместо заглушки — СЛЕДУЮЩИЙ
шаг, ещё не начат; (4) параллельная email+пароль авторизация поверх
гостевого режима Максим/Мария.

Перед началом любого шага — свериться с `roadmap-auth-ai-design.md`, там же
решения по каждому пункту.
