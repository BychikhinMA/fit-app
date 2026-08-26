-- Библиотека упражнений fit-app.
-- Как применить: открой в Supabase Dashboard -> SQL Editor -> вставь весь файл -> Run.
--
-- exercise_library — общая справочная база упражнений (сейчас загружается из
-- data/exercise_library.json скриптом scripts/import-exercise-library.js).
-- Одна строка = одно упражнение, НЕ привязана к профилю/программе.
-- В отличие от остальных таблиц (0001_init.sql) это read-only для приложения:
-- пишет в неё только скрипт импорта через service_role, поэтому anon-политика
-- ниже разрешает только select.

create table if not exists exercise_library (
  id text primary key,
  name_ru text not null,
  category_ru text,
  level_ru text,
  equipment_ru text,
  primary_muscles_ru text[] not null default '{}',
  secondary_muscles_ru text[] not null default '{}',
  -- null у части упражнений — в таком случае UI показывает instructions_en.
  instructions_ru text[],
  instructions_en text[] not null default '{}',
  images text[] not null default '{}'
);

create index if not exists exercise_library_primary_muscles_idx
  on exercise_library using gin (primary_muscles_ru);
create index if not exists exercise_library_equipment_idx
  on exercise_library (equipment_ru);

alter table exercise_library enable row level security;
drop policy if exists "anon read access" on exercise_library;
create policy "anon read access" on exercise_library for select to anon using (true);

-- Ссылка на упражнение библиотеки, из которого была сделана замена в личной
-- программе (см. экран "Библиотека упражнений" и кнопку "Заменить").
alter table exercises add column if not exists exercise_library_id text
  references exercise_library(id) on delete set null;
