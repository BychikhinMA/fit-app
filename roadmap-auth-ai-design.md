# Roadmap: логин, реальный ИИ, новая навигация и цвета

Создано 2026-09-01, обновлено вечером того же дня (смена порядка шагов +
Apple-style навигация + баг с пустым экраном упражнения). Порядок ниже —
рекомендованный порядок выполнения. Каждый шаг можно отдать в работу
отдельной сессией Claude Code, начиная с `Read` этого файла целиком.

## Принятые решения

1. **Навигация**: адаптивная, как в официальных приложениях Apple
   (Music/Podcasts/Settings на iPad и Mac) — САЙДБАР слева на широком
   экране (веб, планшет), НИЖНИЙ таб-бар на узком (телефон). Это не
   компромисс, а именно то, как выглядят сами эти приложения — Apple не
   делает постоянный сайдбар на iPhone-ширине, только на iPad/Mac/вебе.
   5 разделов: Главная / Тренировки / Питание / Библиотека (отдельно) /
   Профиль.
2. **Цвета**: бело-оранжевая — светлый фон как основа, один яркий
   оранжевый акцент для CTA, активного пункта навигации, прогресса,
   выбранных чипов. Плюс общая visual-полировка (см. Шаг 1 ниже) — сейчас
   экраны выглядят «слишком иишно» (плоско, без иерархии) — это отдельно
   от цвета, чинится теми же средствами, что и переход на новую навигацию.
3. **Авторизация**: email + пароль через Supabase Auth (MVP; magic
   link/OTP можно добавить потом поверх той же схемы). Временно ОБА
   режима одновременно — старый гостевой вход (`profiles.id = 'maksim' |
   'maria'`, без пароля) продолжает работать как есть, логин добавляется
   параллельно как новый способ входа. Не ломаем то, что уже работает.

## Порядок работ

### Шаг 0 (сначала) — закрыть хвост из прошлой сессии + баг с пустым экраном упражнения

Библиотека упражнений уже описана в `CLAUDE.md`, раздел «В процессе прямо
сейчас» — применить `0002_exercise_library.sql`, прогнать
`scripts/import-exercise-library.js`, живьём проверить экраны. Проверено
(2026-09-01), что `data/exercise_library.json` содержит полные данные
(картинки — валидные https-ссылки на raw.githubusercontent.com,
`instructions_ru` заполнены) — то есть если экран упражнения показывает
пустоту, дело не в исходных данных, а в одном из:

- миграция/импорт ещё не выполнялись на этой конкретной базе (проверить в
  Dashboard → Table Editor → `exercise_library`, должно быть 741 строка;
  открыть любую строку и убедиться, что `instructions_ru`/`images`
  непустые);
- `.single()` в `src/app/exercise-library/[id].tsx` не находит строку по
  `id` (тогда должна была бы показаться текстовая ошибка PostgREST — если
  вместо этого вечный спиннер, смотреть Network tab в браузере на запрос к
  `exercise_library?id=eq....`, должен быть 200 с непустым телом);
- RLS: политика `"anon read access" for select to anon` должна быть
  применена вместе с миграцией — если миграцию катили руками по частям, а
  не файлом целиком, могли пропустить блок с `alter table ... enable row
  level security` / `create policy`.

Не строить новую навигацию поверх экрана, который не показывает данные —
починить это первым, иначе непонятно, что именно чинить дальше.

### Шаг 1 — Новая навигация (адаптивный сайдбар/таб-бар, Apple-style) + visual-полировка

**СТАТУС: РЕАЛИЗОВАНО** (2026-09-01, ветка `step1-adaptive-navigation`).
Готова route-группа `src/app/(tabs)/` с адаптивным `_layout.tsx`
(`<Sidebar>` при `width >= 768`, иначе `<BottomBar>`) и 5 именованными
экранами; компоненты навигации в `src/components/navigation/`
(`nav-items.ts`, `tab-trigger-button.tsx`, `sidebar.tsx`, `bottom-bar.tsx`);
общий код вынесен в `src/lib/load-plan.ts` и
`src/components/exercise-library-list.tsx`; `plan-ready.tsx` удалён, вход
ведёт на `/home`; в `src/constants/theme.ts` добавлены токены
`Radius`/`Elevation`, панели навигации на `expo-blur`.

Отклонения от плана ниже (согласованы в ходе реализации):

1. **Кастомные табы на `expo-router/ui`** вместо ручного свапа `<Tabs>` —
   `_layout.tsx` рендерит `<Tabs>` из `expo-router/ui` со скрытым
   `<TabList>` и сам выбирает `<Sidebar>`/`<BottomBar>` по ширине окна.
2. **Иконки — `@expo/vector-icons` (Ionicons)** вместо `expo-symbols`:
   у `expo-symbols` нет кроссплатформенного фолбэка (нужен на Android и
   вебе). Нативные SF Symbols на iOS остаются в бэклоге.
3. **Именованные экраны таб-группы** (`home.tsx`, `workouts.tsx`,
   `nutrition.tsx`, `library.tsx`, `profile.tsx`) вместо `(tabs)/index.tsx`
   — файл `(tabs)/index.tsx` дал бы URL `/` и столкнулся бы с корневым
   `src/app/index.tsx` (экран выбора профиля).

Это отвечает сразу на «дизайн не поменялся» и «выглядит слишком иишно» —
сейчас всё ещё старый плоский роутинг и монохромная тема, ни то ни другое
не переносилось никаким шагом раньше. Технически:

1. `expo-router` tabs-группа для основных 5 разделов:
   ```
   src/app/(tabs)/_layout.tsx      — адаптивный layout (см. ниже)
   src/app/(tabs)/index.tsx        — Главная (ИМТ, калории, план на сегодня — часть текущего plan-ready.tsx)
   src/app/(tabs)/workouts.tsx     — Тренировки (программа/фазы/дни)
   src/app/(tabs)/nutrition.tsx    — Питание (meal plan + лог еды)
   src/app/(tabs)/library.tsx      — Библиотека упражнений (сегодняшний src/app/exercise-library/index.tsx)
   src/app/(tabs)/profile.tsx      — Профиль (настройки, повторный онбординг, логин/логаут, переключение профиля)
   ```
   `workout-day/[id].tsx` и `exercise-library/[id].tsx` остаются
   модальными/stack-экранами поверх этой группы (регистрируются вне
   `(tabs)` в корневом `_layout.tsx`, как сейчас).
2. Адаптивность: `useWindowDimensions()` (или `react-native`'s
   `Platform.OS === 'web' && width >= 768` как порог) — на широком экране
   рендерить кастомный `Sidebar` компонент слева (список из 5 пунктов,
   иконка + подпись, текущий раздел — оранжевая подложка-пилюля), на
   узком — обычный `<Tabs>` с нижним таб-баром. Можно сделать одним общим
   компонентом `AppShell`, который решает, что рендерить, и прокидывает
   `children`/`Slot`.
3. Иконки — `expo-symbols` (SF Symbols, уже установлен в package.json) на
   iOS, с фолбэком для Android/веб (у Expo Symbols есть кроссплатформенный
   фолбэк, проверить актуальный API в `docs.expo.dev` для установленной
   версии — в `AGENTS.md` этого проекта явно указано сверяться с версией
   Expo 57 перед написанием кода).
4. Общая полировка «чтобы не было иишно» — это не про новую библиотеку
   компонентов, а про то, что сейчас вообще нет визуальной иерархии:
   - лёгкая тень/поднятие (`shadowOpacity`/`elevation`) на карточках
     (`backgroundElement`) вместо плоской заливки;
   - скругления ближе к iOS-масштабу (16–20 вместо текущих `Spacing.three`
     = 16, уже близко — проверить, что везде одинаково, не вперемешку);
   - использовать акцент точечно (как Apple — один tint-цвет на всё
     приложение), а не заливать оранжевым всё подряд;
   - в сайдбаре/таб-баре — полупрозрачный фон с блюром на вебе/iOS
     (`expo-blur`, ещё не в зависимостях — добавить), это то самое
     ощущение «родного» интерфейса, а не веб-страницы.

### Шаг 2 — Цветовая тема: бело-оранжевая

`src/constants/theme.ts`:

```ts
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F5F5F5',
    backgroundSelected: '#FFE4CC',   // светло-оранжевая подложка выбранного состояния
    textSecondary: '#60646C',
    accent: '#FF7A1A',               // основной оранжевый акцент — CTA, активный пункт навигации, прогресс
    onAccent: '#ffffff',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#3A2412',
    textSecondary: '#B0B4BA',
    accent: '#FF8A3D',
    onAccent: '#000000',
  },
} as const;
```

Пройтись по `chip.tsx`, кнопкам выбора профиля/цели в онбординге, кнопке
«Заменить» на экране дня тренировки, активному пункту навигации из Шага 1
— заменить точечные `backgroundElement`/чёрный текст на
`accent`/`onAccent` там, где сейчас нет явного выделения состояния.

### Шаг 3 — Supabase Edge Function вместо заглушки (реальный ИИ)

Сейчас `src/lib/plan-stub.ts` генерирует план по фиксированным шаблонам и
пишет в базу напрямую из клиента через anon-ключ. `ANTHROPIC_API_KEY` в
`.env` уже размечен правильно — БЕЗ префикса `EXPO_PUBLIC_`, то есть он и
так не должен попасть в клиентский бандл. Проблема не в текущей разметке
ключа, а в том, что настоящий вызов Claude API из мобильного/веб-клиента
в принципе не может быть безопасным — оттуда ключ так или иначе
перехватывается. Решение — Supabase Edge Function (Deno, выполняется на
сервере Supabase, ключ живёт только там):

1. `supabase/functions/generate-plan/index.ts` — принимает `{ profileId,
   answers }`, валидирует, зовёт Anthropic Messages API с
   `Deno.env.get('ANTHROPIC_API_KEY')`, просит вернуть JSON строго по схеме
   из `workout_prompt.md` (Этап 2C — та же схема, что уже отражена в
   таблицах `programs/phases/workout_days/exercises/meal_plans/...`).
2. Функция сама пишет результат в базу через `service_role` ключ (тоже
   переменная окружения функции, не клиента) — так безопаснее, чем
   возвращать сырой JSON клиенту и писать оттуда. Помечает
   `generation_source = 'claude'`.
3. Секреты задаются в Dashboard → Edge Functions → Manage secrets.
   Проверить прямо в Dashboard, можно ли там же и написать/задеплоить код
   функции в браузере — если нет, единственный вариант деплоя —
   подключить Supabase CLI хотя бы для `supabase functions deploy`
   (миграции при этом всё равно можно продолжать катить руками через SQL
   Editor, это не связанные вещи).
4. На клиенте: `src/lib/plan-stub.ts` оставить как ручной fallback,
   добавить `src/lib/plan-ai.ts` с вызовом
   `supabase.functions.invoke('generate-plan', { body: { profileId, answers } })`.
5. Убрать плашку «Это черновик, не настоящий ИИ-план» в `plan-ready.tsx`
   как только `generation_source === 'claude'` — код для этого уже готов
   (`isStub` уже проверяется).

### Шаг 4 — Параллельная авторизация

Новая миграция `0004_auth.sql`:

```sql
alter table profiles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create unique index if not exists profiles_owner_id_key on profiles(owner_id) where owner_id is not null;

create policy "owner full access" on profiles for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```

Дальше по каждой таблице, которая ссылается на `profiles` через
`profile_id` (`profile_settings`, `onboarding_responses`,
`training_contexts`, `programs`, `meal_plans`, `food_log_entries`,
`workout_logs`, `nutrition_logs`, `progress_metrics`) — аналогичная
политика для `authenticated`:

```sql
create policy "owner full access" on profile_settings for all to authenticated
  using (exists (select 1 from profiles p where p.id = profile_settings.profile_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = profile_settings.profile_id and p.owner_id = auth.uid()));
```

Для `phases`/`workout_days`/`exercises`/`sample_day_plans`/`meals` — та же
идея, но через цепочку `join` до `profiles`.

Код:

1. Включить Email-провайдер в Dashboard → Authentication → Providers (для
   семейного MVP можно отключить обязательное подтверждение email —
   отметить это как сознательный компромисс).
2. `src/lib/auth.ts` — обёртки над `supabase.auth.signUp` /
   `signInWithPassword` / `signOut` / `onAuthStateChange`.
3. Новые экраны `src/app/login.tsx` и `src/app/signup.tsx`.
4. `src/app/index.tsx` (или новый вход в Профиль-таб после Шага 1) — под
   карточками Максим/Мария добавить ссылку «Войти в свой аккаунт»; после
   успешного входа — проверка `profiles` по `owner_id = auth.uid()`, если
   нет — создать новую строку и вести на онбординг, если есть — на
   главный экран.
5. `ProfileId` в `src/types/database.ts` сейчас жёстко `'maksim' |
   'maria'` — расширить до `string`, это заденет все места, где тип
   используется как union — `npx tsc --noEmit` после правки покажет все
   точки.
6. `profile-storage.ts` для гостевого режима не трогать; для логина
   источник правды — сессия Supabase (`supabase.auth.getSession()`).

## Что сказать Claude Code, чтобы начать

В терминале, в папке `fit-app`: «Прочитай CLAUDE.md и
`roadmap-auth-ai-design.md` целиком. Сначала разберись, почему на экране
упражнения (`exercise-library/[id].tsx`) не отображаются ни описание, ни
картинка — проверь, применена ли миграция 0002 и запущен ли импорт, и
проверь Network tab в браузере на реальный ответ запроса. Как только это
починено — начни Шаг 1 (адаптивная навигация: сайдбар на широком экране,
таб-бар на узком, плюс общая visual-полировка)».
