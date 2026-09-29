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
