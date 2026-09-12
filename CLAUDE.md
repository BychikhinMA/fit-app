@AGENTS.md

В начале любой рабочей сессии с инструментами и результатом вызывай скилл
task-observer перед началом работы.

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
  заглушкой, а не настоящим ИИ (это Шаг в roadmap ниже, пока на паузе).
- Баги и дизайн-полировка (Roadmap Шаг 2.5, 2026-09-12): в библиотеке
  упражнений (`src/components/exercise-library-list.tsx`) чипы «Группа мышц»
  переведены с мульти-select по 17 анатомическим тегам на одиночный выбор
  из 5 макро-групп (`MUSCLE_GROUP_MAP` в `src/lib/muscle-group-map.ts`,
  `ALL_MUSCLE_TAGS` удалён как неиспользуемый) — теперь подсвечен ровно один
  чип, тот, что реально в фильтре. Убран «след ИИ» — визуальная иерархия
  через уже существующие `Radius`/`Elevation`/`accent`/`accentText`:
  `(tabs)/home.tsx` (хиро-карточка «Сегодня» с accent-подписью и CTA,
  компактные stat-тайлы ИМТ/калорий рядом, черновик-баннер на
  `backgroundSelected` без тени), `(tabs)/workouts.tsx` и
  `(tabs)/nutrition.tsx` (дни/приёмы пищи — строки с разделителем внутри
  одной карточки вместо списка мелких bullet-строк под каждым днём/приёмом),
  `(tabs)/profile.tsx` (два действия объединены в один сгруппированный
  список), `workout-day/[id].tsx` (карточки упражнений — было: N одинаковых
  elevated-карточек подряд; стало: один список с разделителями, подходы×
  повторы вынесены как отдельное значение справа). Проверено: `npx tsc
  --noEmit` и `eslint` чистые; живая проверка в браузере в этой сессии не
  выполнена — расширение Claude in Chrome не было подключено.
- Параллельная авторизация email+пароль (Roadmap Шаг 4, 2026-09-12):
  `supabase/migrations/0004_auth.sql` (применена владельцем вручную) —
  `profiles.owner_id uuid references auth.users(id)`, уникальный по
  непустому значению; политика `"anon full access"` на всех 15 таблицах
  сужена условием «профиль без owner_id» (гостевой режим Максим/Мария не
  задет), новая политика `"owner full access"` для роли `authenticated` —
  доступ только к своим данным (`owner_id = auth.uid()`, для таблиц без
  прямого `profile_id` — через цепочку `security definer`-функций
  `profile_owner_id`/`program_owner_id`/`phase_owner_id`/
  `workout_day_owner_id`/`meal_plan_owner_id`/`sample_day_plan_owner_id`,
  `EXECUTE` на них отозван у anon/authenticated). Рассчитано на любое число
  людей (не хардкожено под Максима/Марию) — `id` нового профиля это
  `auth.uid()`, `display_name` — часть email до «@».
  `src/lib/auth.ts` — обёртки `signUp`/`signInWithPassword`/`signOut`/
  `onAuthStateChange`, плюс `ensureOwnProfile()` (найти-или-создать профиль
  текущей сессии) и `getCurrentProfileId()` (сессия Supabase → фоллбэк на
  гостевой `profile-storage.ts`, который не тронут). Экраны `src/app/
  login.tsx` и `src/app/signup.tsx`, ссылка «Войти в свой аккаунт» на
  `src/app/index.tsx`. `ProfileId` (`src/types/database.ts`) расширен с
  `'maksim' | 'maria'` до `string`. `src/lib/supabase.ts` —
  `persistSession`/`autoRefreshToken` включены (были `false`, гостевой
  режим не нуждался в сессии; без этого вход разлогинивал бы при каждом
  перезапуске) — отклонение от буквального плана, см.
  `roadmap-auth-ai-design.md`, «Шаг 4». **2026-09-12, доп. фикс:** включение
  `persistSession` вскрыло краш `ReferenceError: window is not defined` на
  `npx expo start --web` (`web.output: "static"` в `app.json` — expo-router
  рендерит каждый роут на Node-стороне до гидратации, а web-версия
  `AsyncStorage` внутри читает `window.localStorage`). Починено передачей
  `storage: Platform.OS === 'web' ? undefined : AsyncStorage` — на вебе
  `@supabase/auth-js` сам определяет доступность `localStorage`
  (`supportsLocalStorage()`) и на Node-стороне использует свой безопасный
  in-memory фоллбэк, а в реальном браузере — настоящий `localStorage`;
  на native всегда явно `AsyncStorage`. Проверено: все ключевые роуты
  (`/`, `/login`, `/signup`, `/home`, `/onboarding`) отдают 200 без ошибок
  в логе `expo start --web`; `npx tsc --noEmit`/`eslint` чистые. По ходу
  найдены и починены два
  места с тем же хардкодом «только maksim/maria», что и в самом баге —
  `src/app/onboarding/index.tsx` (иначе онбординг реального пользователя
  зацикливался на экран выбора профиля) и все 4 таб-экрана (переведены на
  `getCurrentProfileId()` вместо голого `getStoredProfileId()`), а
  `(tabs)/profile.tsx` при «Сменить профиль» дополнительно делает
  `signOut()`, если есть активная сессия. `profile-storage.ts` не менялся.
  Проверено: `npx tsc --noEmit` и `eslint` чистые. **Не проверено вживую** —
  расширение Claude in Chrome не подключено; также не сделано вручную
  (нужно от владельца): в Dashboard → Authentication → Providers → Email
  отключить обязательное подтверждение почты (иначе `signUp` не выдаст
  сессию сразу — экран регистрации это отрабатывает, но полный флоу без
  этого не проверить).
- Impeccable-аудит и фиксы (2026-09-12): `/impeccable audit` (native/adaptive,
  source-only) дал 12/20 (Acceptable), затем применены все 5 пунктов
  Recommended Actions по порядку — `optimize` (`exercise-library-list.tsx`:
  `ScrollView`+`.map()` по 741 упражнению заменён на `FlatList` с
  `ListHeaderComponent`/`ItemSeparatorComponent`), `harden` (accessibility:
  `accessibilityRole`/`Label`/`State` на табах навигации (`tab-trigger-
  button.tsx`), чипах (`chip.tsx`), полях и кнопках входа/регистрации,
  фото техники упражнения; добавлен токен `error` в `Colors.light`/`dark`
  (`theme.ts`, с тем же комментарием про контраст, что и у остальных
  токенов) взамен хардкода `#D64545`, дублированного в `login.tsx`/
  `signup.tsx`/`onboarding/index.tsx`), `adapt` (`KeyboardAvoidingView` на
  `login.tsx`/`signup.tsx`; `Chip` получил `minHeight: 44` под touch-target;
  портрет-лок в `app.json` — намеренное решение: приложение используется
  во время тренировки, альбомная ориентация не нужна), `polish` дважды
  (новый `src/components/back-button.tsx` — Ionicons `chevron-back` +
  подпись вместо юникод-стрелки «← Назад» в тексте, на всех 5 экранах,
  где раньше была голая текстовая ссылка: `login.tsx`, `signup.tsx`,
  `workout-day/[id].tsx`, `exercise-library/[id].tsx`, список из
  `exercise-library-list.tsx`; финальный проход — `tsc`/`eslint` чистые).
  Живая проверка на устройстве/симуляторе не выполнена (нет доступа к
  simctl/adb в этой сессии) — accessibility (VoiceOver/TalkBack) и жест
  edge-swipe-back не перепроверены руками, только на уровне кода.

## Roadmap дальше

Подробный технический план — `roadmap-auth-ai-design.md` в корне репозитория.
Порядок: (1) адаптивная навигация — ГОТОВО (2026-09-01, «Шаг 1»);
(2) бело-оранжевая цветовая тема — ГОТОВО (2026-09-02, коммит `5e9e25e`,
«Шаг 2»); (2.5) баги и дизайн-полировка — ГОТОВО, влито в `main`
(2026-09-12, коммит `c2f4f0b`; живая проверка в браузере не была
выполнена в сессии реализации, частично перепроверена отдельно — экран
выбора профиля открывается и рендерится верно, дальше клик по профилю
не проверен из-за постороннего сетевого ограничения в тестовой среде, не
приложения — доверить финальную ручную проверку владельцу); (3) Supabase
Edge Function для реального ИИ через NVIDIA NIM вместо заглушки — ПОКА НА
ПАУЗЕ по решению владельца (план и выбор модели зафиксированы в
`roadmap-auth-ai-design.md`, «Шаг 3», ждёт отмашки на продолжение);
(4) параллельная email+пароль авторизация поверх гостевого режима
Максим/Мария — ГОТОВО в коде (2026-09-12, детали выше и в
`roadmap-auth-ai-design.md`, «Шаг 4»; живая проверка в браузере не
выполнена, плюс от владельца нужно вручную отключить обязательное
подтверждение email в Dashboard). Вход через Google/Apple и шеринг доступа
по приглашению остаются в бэклоге отдельно, не входили в этот шаг.

Перед началом любого шага — свериться с `roadmap-auth-ai-design.md`, там же
решения по каждому пункту.
