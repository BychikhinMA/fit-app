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
