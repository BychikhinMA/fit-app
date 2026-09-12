-- Фикс бага из 0004_auth.sql: "permission denied for function ..." (42501).
-- Как применить: Supabase Dashboard -> SQL Editor -> вставить файл целиком -> Run.
-- НЕ переписывает 0004 (та миграция уже применена в проде) — это отдельная,
-- накатываемая поверх правка.
--
-- В чём был баг: 0004 создавал шесть security definer функций
-- (profile_owner_id и цепочка program_owner_id/phase_owner_id/
-- workout_day_owner_id/meal_plan_owner_id/sample_day_plan_owner_id) в схеме
-- public и сразу отзывал EXECUTE у anon/authenticated — расчёт был на то,
-- что это закроет их от прямого вызова через PostgREST RPC
-- (/rest/v1/rpc/...). Но те же самые функции вызываются внутри using/with
-- check RLS-политик на этих же таблицах, а Postgres проверяет право EXECUTE
-- у вызывающей роли даже внутри RLS-выражения — SECURITY DEFINER защищает
-- только то, что происходит ВНУТРИ функции (доступ к строкам profiles в
-- обход RLS на ней), а не право эту функцию вообще вызвать. В итоге любой
-- запрос от anon или authenticated к таблице, чья политика использует такую
-- функцию, падал с "permission denied for function ..." — подтверждено
-- вживую (клик на гостевой профиль "Максим" на /).
--
-- Правильный паттерн для "вспомогательная функция только для RLS, не для
-- публичного API" — по документации Supabase (Database -> Row Level
-- Security -> "Avoid recursive policies" в разделе про SECURITY DEFINER
-- функции): не revoke execute у самой функции в public-схеме (это ломает её
-- вызываемость внутри RLS), а держать её в отдельной схеме, которая НЕ
-- входит в список "Exposed schemas" в настройках Data API (по умолчанию туда
-- входит только public) — тогда PostgREST в принципе не создаёт для неё
-- /rest/v1/rpc/... эндпоинт, независимо от прав на EXECUTE, а
-- grant execute нужным ролям при этом не открывает её наружу, а лишь
-- разрешает ссылаться на неё внутри RLS-политик на публичных таблицах.
--
-- Что делает этот файл:
-- 1. Схема private (create schema if not exists — не входит в Exposed
--    schemas по умолчанию, там и должна оставаться; ничего дополнительно
--    настраивать в Dashboard не нужно, если список Exposed schemas не
--    менялся).
-- 2. Те же шесть функций пересозданы в private с теми же именами и
--    сигнатурами, что и в 0004 — search_path выставлен в '' (пусто, а не
--    public, как было в 0004) и все ссылки на таблицы/функции внутри тел
--    полностью квалифицированы (public.profiles, private.profile_owner_id
--    и т.д.) — это дополнительно защищает от search_path hijacking,
--    актуальная рекомендация Supabase для security definer функций.
-- 3. EXECUTE отозван у public, затем явно выдан anon и authenticated (и
--    usage на саму схему private) — именно это и чинит permission denied,
--    не открывая функции как RPC.
-- 4. Все RLS-политики, использовавшие функции из public, пересозданы на
--    ссылки на private.* — сами условия (owner_id is null / = auth.uid())
--    не меняются, меняются только имена функций.
-- 5. Старые функции в public (созданные в 0004) удалены — они больше не
--    используются ни одной политикой и как отдельный публичный RPC
--    открывать их не нужно (собственно то, что 0004 и пыталось сделать
--    revoke'ом, только неправильным способом).

-- ============ 1. Схема private ============

create schema if not exists private;

-- ============ 2. Функции в private, search_path = '', полная квалификация ============

create or replace function private.profile_owner_id(p_profile_id text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select owner_id from public.profiles where id = p_profile_id;
$$;

create or replace function private.program_owner_id(p_program_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select private.profile_owner_id(profile_id) from public.programs where id = p_program_id;
$$;

create or replace function private.phase_owner_id(p_phase_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select private.program_owner_id(program_id) from public.phases where id = p_phase_id;
$$;

create or replace function private.workout_day_owner_id(p_workout_day_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select private.phase_owner_id(phase_id) from public.workout_days where id = p_workout_day_id;
$$;

create or replace function private.meal_plan_owner_id(p_meal_plan_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select private.profile_owner_id(profile_id) from public.meal_plans where id = p_meal_plan_id;
$$;

create or replace function private.sample_day_plan_owner_id(p_sample_day_plan_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select private.meal_plan_owner_id(meal_plan_id) from public.sample_day_plans where id = p_sample_day_plan_id;
$$;

-- ============ 3. Права: usage на схему + execute на функции ============
-- Именно это (а не revoke) чинит "permission denied for function": роли
-- должны иметь право ВЫЗВАТЬ функцию внутри RLS-выражения. От публичного
-- RPC это не защищает через grant/revoke — защищает то, что схема private
-- не входит в Exposed schemas Data API, поэтому PostgREST не создаёт для
-- неё /rest/v1/rpc/... эндпоинты вообще.

revoke execute on function private.profile_owner_id(text) from public;
revoke execute on function private.program_owner_id(uuid) from public;
revoke execute on function private.phase_owner_id(uuid) from public;
revoke execute on function private.workout_day_owner_id(uuid) from public;
revoke execute on function private.meal_plan_owner_id(uuid) from public;
revoke execute on function private.sample_day_plan_owner_id(uuid) from public;

grant usage on schema private to anon, authenticated;

grant execute on function private.profile_owner_id(text) to anon, authenticated;
grant execute on function private.program_owner_id(uuid) to anon, authenticated;
grant execute on function private.phase_owner_id(uuid) to anon, authenticated;
grant execute on function private.workout_day_owner_id(uuid) to anon, authenticated;
grant execute on function private.meal_plan_owner_id(uuid) to anon, authenticated;
grant execute on function private.sample_day_plan_owner_id(uuid) to anon, authenticated;

-- ============ 4. Политики: переключить на private.* ============

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
      'create policy "anon full access" on %I for all to anon using (private.profile_owner_id(profile_id) is null) with check (private.profile_owner_id(profile_id) is null)',
      t
    );
    execute format('drop policy if exists "owner full access" on %I', t);
    execute format(
      'create policy "owner full access" on %I for all to authenticated using (private.profile_owner_id(profile_id) = auth.uid()) with check (private.profile_owner_id(profile_id) = auth.uid())',
      t
    );
  end loop;
end $$;

drop policy if exists "anon full access" on phases;
create policy "anon full access" on phases for all to anon
  using (private.program_owner_id(program_id) is null) with check (private.program_owner_id(program_id) is null);
drop policy if exists "owner full access" on phases;
create policy "owner full access" on phases for all to authenticated
  using (private.program_owner_id(program_id) = auth.uid()) with check (private.program_owner_id(program_id) = auth.uid());

drop policy if exists "anon full access" on workout_days;
create policy "anon full access" on workout_days for all to anon
  using (private.phase_owner_id(phase_id) is null) with check (private.phase_owner_id(phase_id) is null);
drop policy if exists "owner full access" on workout_days;
create policy "owner full access" on workout_days for all to authenticated
  using (private.phase_owner_id(phase_id) = auth.uid()) with check (private.phase_owner_id(phase_id) = auth.uid());

drop policy if exists "anon full access" on exercises;
create policy "anon full access" on exercises for all to anon
  using (private.workout_day_owner_id(workout_day_id) is null) with check (private.workout_day_owner_id(workout_day_id) is null);
drop policy if exists "owner full access" on exercises;
create policy "owner full access" on exercises for all to authenticated
  using (private.workout_day_owner_id(workout_day_id) = auth.uid()) with check (private.workout_day_owner_id(workout_day_id) = auth.uid());

drop policy if exists "anon full access" on sample_day_plans;
create policy "anon full access" on sample_day_plans for all to anon
  using (private.meal_plan_owner_id(meal_plan_id) is null) with check (private.meal_plan_owner_id(meal_plan_id) is null);
drop policy if exists "owner full access" on sample_day_plans;
create policy "owner full access" on sample_day_plans for all to authenticated
  using (private.meal_plan_owner_id(meal_plan_id) = auth.uid()) with check (private.meal_plan_owner_id(meal_plan_id) = auth.uid());

drop policy if exists "anon full access" on meals;
create policy "anon full access" on meals for all to anon
  using (private.sample_day_plan_owner_id(sample_day_plan_id) is null) with check (private.sample_day_plan_owner_id(sample_day_plan_id) is null);
drop policy if exists "owner full access" on meals;
create policy "owner full access" on meals for all to authenticated
  using (private.sample_day_plan_owner_id(sample_day_plan_id) = auth.uid()) with check (private.sample_day_plan_owner_id(sample_day_plan_id) = auth.uid());

-- ============ 5. Старые public-функции из 0004 больше не нужны ============
-- К этому моменту ни одна политика на них не ссылается (все переключены на
-- private.* выше), поэтому drop проходит без cascade.

drop function if exists public.profile_owner_id(text);
drop function if exists public.program_owner_id(uuid);
drop function if exists public.phase_owner_id(uuid);
drop function if exists public.workout_day_owner_id(uuid);
drop function if exists public.meal_plan_owner_id(uuid);
drop function if exists public.sample_day_plan_owner_id(uuid);
