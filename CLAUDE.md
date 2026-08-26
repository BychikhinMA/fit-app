@AGENTS.md

# Текущее состояние проекта (обновлено 2026-08-26)

## Готово и работает

- Схема Supabase (`supabase/migrations/0001_init.sql`): профили без
  аутентификации (`maksim`/`maria`), онбординг, программа тренировок
  (programs/phases/workout_days/exercises), план питания, логи и прогресс.
  RLS открыт для anon (осознанное решение — семейное приложение без пароля).
- Экраны: выбор профиля (`src/app/index.tsx`) → онбординг
  (`src/app/onboarding/index.tsx`) → генерация чернового плана-заглушки
  (`src/lib/plan-stub.ts`, `generation_source = 'stub'`, ИМТ и калории
  считаются по-настоящему) → экран плана (`src/app/plan-ready.tsx`).
- CLI Supabase не подключён — миграции применяются руками через
  Supabase Dashboard → SQL Editor (см. комментарий в начале каждого файла
  миграции и в `src/types/database.ts`). Типы `Database` поддерживаются
  руками, синхронно с миграциями.
- Ключ `ANTHROPIC_API_KEY` ещё не подключён — программа и питание генерируются
  заглушкой, а не настоящим ИИ.

## В процессе прямо сейчас: библиотека упражнений + замена в программе

Задача: в проект добавили `data/exercise_library.json` (741 упражнение из
free-exercise-db, с русским переводом полей). Нужно было завести таблицу,
загрузить данные, дать экран библиотеки с фильтрами и разрешить заменять
упражнение в личной программе на упражнение из библиотеки той же группы мышц.

Полный план (контекст, обоснование решений, все файлы) лежит в
`/Users/maksimbycihin/.claude/plans/glowing-seeking-reddy.md` — если он ещё
существует, стоит перечитать перед продолжением.

**Что уже сделано и закоммичено** (коммит "Add exercise library and
workout-day exercise replacement flow", запушен в `origin/main`):

1. `supabase/migrations/0002_exercise_library.sql` — новая таблица
   `exercise_library` (id, name_ru, category_ru, level_ru, equipment_ru,
   primary_muscles_ru[], secondary_muscles_ru[], instructions_ru[] nullable,
   instructions_en[] как фолбэк, images[]), GIN-индекс по мышцам, RLS
   read-only для anon (пишет только скрипт импорта через service_role).
   Плюс `alter table exercises add column exercise_library_id` — ссылка на
   то, из какого упражнения библиотеки сделана замена.
2. `src/types/database.ts` — добавлены типы `exercise_library` и
   `exercise_library_id` в `exercises`.
3. `src/lib/muscle-group-map.ts` — маппинг крупных ярлыков программы
   (Ноги/Спина/Грудь и руки/Кор/Всё тело) на анатомические теги библиотеки
   (квадрицепс, ягодицы, широчайшие и т.д. — 17 значений), плюс списки всех
   тегов мышц и оборудования (12 значений) для фильтров UI.
4. `scripts/import-exercise-library.js` — разовый CommonJS-скрипт импорта
   JSON в таблицу (upsert по id, батчами по 200, через
   `SUPABASE_SERVICE_ROLE_KEY`). **Написан, но ещё НЕ запущен** — потому что
   миграция `0002` ещё не применена к живой базе (её нужно применить руками
   через Supabase Dashboard → SQL Editor, как и `0001`).
5. Новый экран `src/app/workout-day/[id].tsx` — детальная страница дня
   тренировки (разминка/заминка/упражнения), у каждого упражнения кнопка
   «Заменить», ведёт на `/exercise-library` с параметрами
   `pickForExerciseId`/`oldExerciseName`/`muscleGroup`.
6. Новый экран `src/app/exercise-library/index.tsx` — список упражнений с
   чипами-фильтрами (группа мышц + оборудование, мультивыбор,
   `.overlaps()`/`.in()` в запросе к Supabase). В режиме «выбор замены»
   сразу проставляет фильтр через `MUSCLE_GROUP_MAP`.
7. Новый экран `src/app/exercise-library/[id].tsx` — карточка упражнения:
   фото (`expo-image`), техника по шагам (`instructions_ru`, а если `null` —
   `instructions_en` с пометкой «техника на английском»). В режиме выбора —
   кнопка «Выбрать это упражнение», которая обновляет `exercises.exercise` и
   `exercises.exercise_library_id` в Supabase и делает `router.dismiss(2)`
   (возврат на экран дня).
8. `src/app/plan-ready.tsx` — день теперь `Pressable`, ведёт на
   `/workout-day/[id]`; добавлена кнопка «Библиотека упражнений» (обычный
   просмотр без предвыбранного фильтра).
9. `src/app/_layout.tsx` — зарегистрированы новые маршруты.
10. `npx tsc --noEmit` и `npx expo lint` — оба чистые (0 ошибок).

**Что НЕ сделано — следующие шаги по порядку:**

1. Применить `supabase/migrations/0002_exercise_library.sql` в Supabase
   Dashboard → SQL Editor (руками, как обычно в этом проекте).
2. Запустить импорт: `node --env-file=.env scripts/import-exercise-library.js`
   (нужен `SUPABASE_SERVICE_ROLE_KEY` — уже есть в `.env`). Проверить в
   Table Editor, что в `exercise_library` ровно 741 строка.
3. Живьём проверить флоу в приложении (`npx expo start`):
   - `plan-ready` → тап по дню → открывается `/workout-day/[id]` со списком
     упражнений;
   - тап «Заменить» → библиотека открывается уже отфильтрованной по группе
     мышц дня; чипы переключаются, список обновляется;
   - тап на карточку → карточка упражнения с фото и шагами (отдельно
     проверить случай `instructions_ru = null` → должен показаться
     английский текст с пометкой, это ~46% упражнений);
   - «Выбрать это упражнение» → возврат на экран дня, видно новое название;
     в Supabase проверить, что `exercise_library_id` проставился;
   - отдельно проверить вход «Библиотека упражнений» с `plan-ready` без
     параметров (без предвыбранного фильтра, без кнопки выбора).
4. Скрипт импорта и сами новые экраны ещё ни разу не запускались/не
   открывались в реальном приложении — только протипчекано и пролинчено.
   Возможны мелкие баги при первом живом прогоне (особенно вокруг
   `expo-image` и параметров маршрутов expo-router v57 typed routes).

## Прочее, о чём стоит помнить

- В рабочей копии до этой задачи были незакоммиченные правки
  `package.json`/`package-lock.json` (`allowScripts`) и
  `src/hooks/use-color-scheme.web.ts` (переписан на `useSyncExternalStore`) —
  не из этой сессии, но были закоммичены вместе одним общим коммитом по
  просьбе пользователя.
- Файл `.claude/settings.local 2.json` в корне — похоже, случайный дубликат
  (пробел и "2" в имени), в git не добавлен и не удалён — стоит спросить
  пользователя, что с ним делать, если он попадётся на глаза.
