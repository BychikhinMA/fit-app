-- Схема данных fit-app.
-- Как применить: открой в Supabase Dashboard -> SQL Editor -> вставь весь файл -> Run.
--
-- Таблицы соответствуют сущностям из workout_prompt.md (JSON-схема в Этапе 2C):
-- User -> profiles + profile_settings
-- TrainingContext -> training_contexts
-- Program/Phase/WorkoutDay/Exercise -> programs/phases/workout_days/exercises
-- MealPlan/Meal -> meal_plans/sample_day_plans/meals
-- FoodLogEntry -> food_log_entries
-- WorkoutLog -> workout_logs
-- NutritionLog -> nutrition_logs
-- ProgressMetric -> progress_metrics
--
-- Профилей два, без аутентификации (семейное приложение) — profiles.id это простой
-- слаг ('maksim' | 'maria'), а не auth.users.id. RLS включён на всех таблицах, но
-- политики открыты для anon-ключа: это осознанное решение под "без пароля",
-- см. обсуждение с пользователем.

create extension if not exists "pgcrypto";

-- ============ Профили ============

create table if not exists profiles (
  id text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

insert into profiles (id, display_name) values
  ('maksim', 'Максим'),
  ('maria', 'Мария')
on conflict (id) do nothing;

-- Текущее состояние и настройки профиля — соответствует объекту user_profile
-- из JSON-схемы (без вложенных массивов contexts/логов, они в своих таблицах).
create table if not exists profile_settings (
  profile_id text primary key references profiles(id) on delete cascade,

  goal text,
  custom_goals text[] not null default '{}',
  level text,
  constraints text[] not null default '{}',

  gender text,
  age int,
  height_cm numeric,
  weight_kg numeric,
  activity_level text,

  bmi_value numeric,
  bmi_category text,
  bmi_calculated_at timestamptz,

  calorie_method text,
  recommended_calories int,
  calorie_protein_g int,
  calorie_fat_g int,
  calorie_carbs_g int,
  calorie_calculated_at timestamptz,

  days_per_week int,
  session_minutes int,
  time_variability_notes text,

  diet_constraints text[] not null default '{}',

  estimated_timeframe_min_weeks int,
  estimated_timeframe_max_weeks int,
  estimated_timeframe_basis text,

  updated_at timestamptz not null default now()
);

-- ============ Онбординг ============

create table if not exists onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  answers jsonb not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'generating', 'completed', 'failed')),
  generation_source text
    check (generation_source in ('stub', 'claude')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_responses_profile_idx on onboarding_responses(profile_id);

create table if not exists training_contexts (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  context_name text not null,
  equipment text[] not null default '{}',
  typical_frequency text,
  created_at timestamptz not null default now(),
  unique (profile_id, context_name)
);

-- ============ Программа тренировок ============

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  onboarding_response_id uuid references onboarding_responses(id) on delete set null,
  name text not null,
  duration_weeks int,
  generation_source text not null default 'stub'
    check (generation_source in ('stub', 'claude')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists programs_profile_idx on programs(profile_id);

create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  phase_name text not null,
  week_start int,
  week_end int,
  goal text,
  sort_order int not null default 0
);

create index if not exists phases_program_idx on phases(program_id);

create table if not exists workout_days (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  day_label text not null,
  default_context text,
  target_muscle_groups text[] not null default '{}',
  warmup jsonb not null default '[]',
  cooldown jsonb not null default '[]',
  sort_order int not null default 0
);

create index if not exists workout_days_phase_idx on workout_days(phase_id);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  exercise text not null,
  muscle_group text,
  sets int,
  reps_or_time text,
  rest_seconds int,
  progression_note text,
  -- [{ context_name, equipment_used, exercise_variant }]
  context_variants jsonb not null default '[]',
  short_on_time_alternative text,
  sort_order int not null default 0
);

create index if not exists exercises_workout_day_idx on exercises(workout_day_id);

-- ============ Питание ============

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  onboarding_response_id uuid references onboarding_responses(id) on delete set null,
  daily_calories int,
  protein_g int,
  fat_g int,
  carbs_g int,
  cook_from_ingredients_enabled boolean not null default true,
  cook_from_ingredients_instructions text,
  generation_source text not null default 'stub'
    check (generation_source in ('stub', 'claude')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists meal_plans_profile_idx on meal_plans(profile_id);

create table if not exists sample_day_plans (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  sample_day_plan_id uuid not null references sample_day_plans(id) on delete cascade,
  name text not null,
  ingredients text[] not null default '{}',
  calories int,
  protein_g int,
  fat_g int,
  carbs_g int,
  sort_order int not null default 0
);

-- ============ Логи и прогресс ============

create table if not exists food_log_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  date date not null,
  item_name text not null,
  quantity text,
  estimated_calories numeric,
  estimated_protein_g numeric,
  estimated_fat_g numeric,
  estimated_carbs_g numeric,
  source text not null default 'estimate'
    check (source in ('estimate', 'label', 'user_corrected')),
  created_at timestamptz not null default now()
);

create index if not exists food_log_entries_profile_date_idx on food_log_entries(profile_id, date);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  workout_day_id uuid references workout_days(id) on delete set null,
  date date not null,
  day_label text,
  context_used text,
  completed boolean not null default false,
  exercises_performance jsonb not null default '[]',
  perceived_effort text,
  adapted_notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_profile_date_idx on workout_logs(profile_id, date);

create table if not exists nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  date date not null,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  adherence_notes text,
  unique (profile_id, date)
);

create table if not exists progress_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg numeric,
  waist_cm numeric,
  hips_cm numeric,
  photo_url text,
  bmi numeric,
  created_at timestamptz not null default now()
);

create index if not exists progress_metrics_profile_date_idx on progress_metrics(profile_id, date);

-- ============ RLS ============
-- Приложение работает без логина (anon-ключ), поэтому политики открыты на чтение/запись.
-- Это осознанное решение для семейного приложения без пароля.

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles', 'profile_settings', 'onboarding_responses', 'training_contexts',
    'programs', 'phases', 'workout_days', 'exercises',
    'meal_plans', 'sample_day_plans', 'meals',
    'food_log_entries', 'workout_logs', 'nutrition_logs', 'progress_metrics'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format(
      'create policy "anon full access" on %I for all to anon using (true) with check (true)',
      t
    );
  end loop;
end $$;
