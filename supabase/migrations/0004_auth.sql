-- Шаг 4: параллельная авторизация email+пароль поверх гостевого режима.
-- Как применить: Supabase Dashboard -> SQL Editor -> вставить файл целиком -> Run.
--
-- Что делает:
-- 1. profiles.owner_id — необязательная ссылка на auth.users(id). Гостевые
--    профили (maksim/maria) остаются без owner_id, как сейчас. Новый
--    авторизованный пользователь получает свою строку profiles с
--    owner_id = его собственный auth.uid() — рассчитано на любое число
--    людей (отец, друзья, ...), а не только на Максима/Марию.
-- 2. Существующая политика "anon full access" (раньше полностью открытая —
--    using (true) — под гостевой режим без пароля) сужается условием
--    owner_id is null: гостевые профили остаются доступны анонимному ключу
--    как раньше, а профили авторизованных пользователей для anon становятся
--    невидимы.
-- 3. Новая политика "owner full access" для роли authenticated — доступ
--    только к своим собственным данным (owner_id = auth.uid(), либо по
--    цепочке join до profiles для таблиц без прямого profile_id).
--
-- Важно про пункт 2: без него пункт 3 ничего бы не защищал — anon-ключ
-- (публичный, зашитый в клиент) как и раньше видел бы вообще все строки во
-- всех таблицах, включая данные авторизованных пользователей, независимо от
-- того, что для них отдельно добавлена authenticated-политика. Это ровно та
-- дыра, которую сам roadmap отмечал в разделе "Бэклог" ("ВНИМАНИЕ: ...
-- Шаг 4 пересмотреть до начала работы").

-- ============ profiles.owner_id ============

alter table profiles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create unique index if not exists profiles_owner_id_key on profiles(owner_id) where owner_id is not null;

-- ============ Вспомогательные security definer функции ============
-- RLS-политики на дочерних таблицах не могут напрямую сделать join до
-- profiles.owner_id, если у самой anon/authenticated роли нет доступа к
-- нужной строке profiles по её собственной RLS-политике (а после пункта 2
-- выше он как раз ограничен owner_id is null / = auth.uid()). SECURITY
-- DEFINER выполняет запрос от имени владельца функции (роли, которой
-- применяется эта миграция) и поэтому не зависит от RLS на profiles — это
-- стандартный паттерн Supabase для подобных проверок. EXECUTE на них отозван
-- у anon/authenticated ниже, чтобы их нельзя было дёрнуть напрямую через
-- PostgREST RPC (/rest/v1/rpc/...) и получить чужой owner_id.

create or replace function profile_owner_id(p_profile_id text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select owner_id from profiles where id = p_profile_id;
$$;

create or replace function program_owner_id(p_program_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select profile_owner_id(profile_id) from programs where id = p_program_id;
$$;

create or replace function phase_owner_id(p_phase_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select program_owner_id(program_id) from phases where id = p_phase_id;
$$;

create or replace function workout_day_owner_id(p_workout_day_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select phase_owner_id(phase_id) from workout_days where id = p_workout_day_id;
$$;

create or replace function meal_plan_owner_id(p_meal_plan_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select profile_owner_id(profile_id) from meal_plans where id = p_meal_plan_id;
$$;

create or replace function sample_day_plan_owner_id(p_sample_day_plan_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select meal_plan_owner_id(meal_plan_id) from sample_day_plans where id = p_sample_day_plan_id;
$$;

revoke all on function profile_owner_id(text) from public, anon, authenticated;
revoke all on function program_owner_id(uuid) from public, anon, authenticated;
revoke all on function phase_owner_id(uuid) from public, anon, authenticated;
revoke all on function workout_day_owner_id(uuid) from public, anon, authenticated;
revoke all on function meal_plan_owner_id(uuid) from public, anon, authenticated;
revoke all on function sample_day_plan_owner_id(uuid) from public, anon, authenticated;

-- ============ profiles: сузить anon, добавить authenticated ============

drop policy if exists "anon full access" on profiles;
create policy "anon full access" on profiles for all to anon
  using (owner_id is null) with check (owner_id is null);

drop policy if exists "owner full access" on profiles;
create policy "owner full access" on profiles for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============ Таблицы с прямым profile_id ============

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profile_settings', 'onboarding_responses', 'training_contexts',
    'programs', 'meal_plans', 'food_log_entries', 'workout_logs',
    'nutrition_logs', 'progress_metrics'
  ])
  loop
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format(
      'create policy "anon full access" on %I for all to anon using (profile_owner_id(profile_id) is null) with check (profile_owner_id(profile_id) is null)',
      t
    );
    execute format('drop policy if exists "owner full access" on %I', t);
    execute format(
      'create policy "owner full access" on %I for all to authenticated using (profile_owner_id(profile_id) = auth.uid()) with check (profile_owner_id(profile_id) = auth.uid())',
      t
    );
  end loop;
end $$;

-- ============ Таблицы, привязанные к профилю через цепочку join ============

drop policy if exists "anon full access" on phases;
create policy "anon full access" on phases for all to anon
  using (program_owner_id(program_id) is null) with check (program_owner_id(program_id) is null);
drop policy if exists "owner full access" on phases;
create policy "owner full access" on phases for all to authenticated
  using (program_owner_id(program_id) = auth.uid()) with check (program_owner_id(program_id) = auth.uid());

drop policy if exists "anon full access" on workout_days;
create policy "anon full access" on workout_days for all to anon
  using (phase_owner_id(phase_id) is null) with check (phase_owner_id(phase_id) is null);
drop policy if exists "owner full access" on workout_days;
create policy "owner full access" on workout_days for all to authenticated
  using (phase_owner_id(phase_id) = auth.uid()) with check (phase_owner_id(phase_id) = auth.uid());

drop policy if exists "anon full access" on exercises;
create policy "anon full access" on exercises for all to anon
  using (workout_day_owner_id(workout_day_id) is null) with check (workout_day_owner_id(workout_day_id) is null);
drop policy if exists "owner full access" on exercises;
create policy "owner full access" on exercises for all to authenticated
  using (workout_day_owner_id(workout_day_id) = auth.uid()) with check (workout_day_owner_id(workout_day_id) = auth.uid());

drop policy if exists "anon full access" on sample_day_plans;
create policy "anon full access" on sample_day_plans for all to anon
  using (meal_plan_owner_id(meal_plan_id) is null) with check (meal_plan_owner_id(meal_plan_id) is null);
drop policy if exists "owner full access" on sample_day_plans;
create policy "owner full access" on sample_day_plans for all to authenticated
  using (meal_plan_owner_id(meal_plan_id) = auth.uid()) with check (meal_plan_owner_id(meal_plan_id) = auth.uid());

drop policy if exists "anon full access" on meals;
create policy "anon full access" on meals for all to anon
  using (sample_day_plan_owner_id(sample_day_plan_id) is null) with check (sample_day_plan_owner_id(sample_day_plan_id) is null);
drop policy if exists "owner full access" on meals;
create policy "owner full access" on meals for all to authenticated
  using (sample_day_plan_owner_id(sample_day_plan_id) = auth.uid()) with check (sample_day_plan_owner_id(sample_day_plan_id) = auth.uid());
