import { computeBmi, computeCalorieRecommendation } from '@/lib/health-calc';
import type { OnboardingAnswers } from '@/lib/onboarding-types';
import { supabase } from '@/lib/supabase';
import type { ExerciseContextVariant, ProfileId } from '@/types/database';

// Заглушка вместо вызова Claude API (Этап 2b по плану). ИМТ и норма калорий
// считаются по-настоящему (health-calc.ts, та же формула, что будет
// использовать и Claude). Программа тренировок и питания — минимальный
// черновой план, чтобы экраны 3-6 было на чём тестировать, пока нет ключа
// ANTHROPIC_API_KEY. Помечена generation_source = 'stub' в базе, чтобы потом
// было легко найти и заменить на настоящую генерацию.

const MUSCLE_GROUP_CYCLE = ['Ноги', 'Спина', 'Грудь и руки', 'Кор', 'Всё тело'] as const;

const EXERCISE_POOL: Record<(typeof MUSCLE_GROUP_CYCLE)[number], string[]> = {
  Ноги: ['Приседания', 'Выпады', 'Ягодичный мостик'],
  Спина: ['Супермен', 'Обратные разведения руками', 'Планка с тягой руки'],
  'Грудь и руки': ['Отжимания', 'Отжимания с колен', 'Разведения руками с бутылками воды'],
  Кор: ['Планка', 'Скручивания', 'Боковая планка'],
  'Всё тело': ['Берпи', 'Приседания с выпрыгиванием', 'Альпинист'],
};

const SETS_BY_LEVEL: Record<string, number> = { beginner: 2, intermediate: 3, advanced: 4 };
const REPS_BY_LEVEL: Record<string, string> = {
  beginner: '12 повторений',
  intermediate: '12 повторений',
  advanced: '10 повторений',
};

function requireAnswer<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Не заполнено обязательное поле: ${label}`);
  }
  return value;
}

export async function generateStubPlan(profileId: ProfileId, answers: OnboardingAnswers) {
  const gender = requireAnswer(answers.gender, 'Пол');
  const age = requireAnswer(answers.age, 'Возраст');
  const heightCm = requireAnswer(answers.heightCm, 'Рост');
  const weightKg = requireAnswer(answers.weightKg, 'Вес');
  const dailyActivity = requireAnswer(answers.dailyActivity, 'Активность вне тренировок');
  const goal = requireAnswer(answers.goal, 'Главная цель');
  const trainingLevel = requireAnswer(answers.trainingLevel, 'Уровень подготовки');
  const daysPerWeek = Math.min(6, Math.max(2, requireAnswer(answers.daysPerWeek, 'Дней в неделю')));
  const sessionMinutes = requireAnswer(answers.sessionMinutes, 'Минут на тренировку');

  const bmi = computeBmi(weightKg, heightCm);
  const calorieRecommendation = computeCalorieRecommendation({
    gender,
    age,
    heightCm,
    weightKg,
    activityLevel: dailyActivity,
    goal,
  });
  const now = new Date().toISOString();

  // 1. Сохраняем сырые ответы онбординга.
  const { data: onboardingResponse, error: onboardingError } = await supabase
    .from('onboarding_responses')
    .insert({
      profile_id: profileId,
      answers: answers as unknown as Record<string, unknown>,
      status: 'completed',
      generation_source: 'stub',
      submitted_at: now,
    })
    .select()
    .single();
  if (onboardingError) throw onboardingError;

  // 2. profile_settings — соответствует объекту user_profile из JSON-схемы.
  const { error: settingsError } = await supabase.from('profile_settings').upsert({
    profile_id: profileId,
    goal,
    custom_goals: answers.customGoalsText ? [answers.customGoalsText] : [],
    level: trainingLevel,
    constraints: answers.healthConstraints ? [answers.healthConstraints] : [],
    gender,
    age,
    height_cm: heightCm,
    weight_kg: weightKg,
    activity_level: dailyActivity,
    bmi_value: bmi?.value ?? null,
    bmi_category: bmi?.category ?? null,
    bmi_calculated_at: bmi ? now : null,
    calorie_method: calorieRecommendation?.method ?? null,
    recommended_calories: calorieRecommendation?.recommended_calories ?? null,
    calorie_protein_g: calorieRecommendation?.protein_g ?? null,
    calorie_fat_g: calorieRecommendation?.fat_g ?? null,
    calorie_carbs_g: calorieRecommendation?.carbs_g ?? null,
    calorie_calculated_at: calorieRecommendation ? now : null,
    days_per_week: daysPerWeek,
    session_minutes: sessionMinutes,
    time_variability_notes: answers.preferredTimeOfDay || null,
    diet_constraints: answers.dietConstraints,
    estimated_timeframe_min_weeks: 8,
    estimated_timeframe_max_weeks: 16,
    estimated_timeframe_basis:
      'Черновая оценка-заглушка (не персонализирована) — уточнится, когда план построит ИИ.',
  });
  if (settingsError) throw settingsError;

  // 3. Первую точку в историю веса/ИМТ.
  await supabase.from('progress_metrics').insert({
    profile_id: profileId,
    date: now.slice(0, 10),
    weight_kg: weightKg,
    waist_cm: answers.waistCm,
    hips_cm: answers.hipsCm,
    bmi: bmi?.value ?? null,
  });

  // 4. Контексты тренировок.
  await supabase.from('training_contexts').delete().eq('profile_id', profileId);
  if (answers.contexts.length > 0) {
    const { error: contextsError } = await supabase.from('training_contexts').insert(
      answers.contexts.map((c) => ({
        profile_id: profileId,
        context_name: c.name,
        equipment: c.equipment,
        typical_frequency: c.typicalFrequency || null,
      }))
    );
    if (contextsError) throw contextsError;
  }

  const defaultContext =
    answers.contexts.find((c) => c.name === 'Дом')?.name ?? answers.contexts[0]?.name ?? 'Дом';
  const otherContexts = answers.contexts.map((c) => c.name).filter((n) => n !== defaultContext);

  // 5. Черновая программа тренировок (заглушка вместо плана от Claude).
  await supabase.from('programs').delete().eq('profile_id', profileId);
  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      profile_id: profileId,
      onboarding_response_id: onboardingResponse.id,
      name: 'Черновой план (заглушка) — заменится, когда подключим ИИ',
      duration_weeks: 4,
      generation_source: 'stub',
      is_active: true,
    })
    .select()
    .single();
  if (programError) throw programError;

  const { data: phase, error: phaseError } = await supabase
    .from('phases')
    .insert({
      program_id: program.id,
      phase_name: 'База',
      week_start: 1,
      week_end: 4,
      goal: 'Освоить технику и втянуться в регулярные тренировки',
      sort_order: 0,
    })
    .select()
    .single();
  if (phaseError) throw phaseError;

  for (let day = 0; day < daysPerWeek; day++) {
    const muscleGroup = MUSCLE_GROUP_CYCLE[day % MUSCLE_GROUP_CYCLE.length];
    const { data: workoutDay, error: workoutDayError } = await supabase
      .from('workout_days')
      .insert({
        phase_id: phase.id,
        day_label: `День ${day + 1}`,
        default_context: defaultContext,
        target_muscle_groups: [muscleGroup],
        warmup: [{ name: 'Разминка суставов', duration_or_reps: '5 минут' }],
        cooldown: [{ name: 'Растяжка целевых мышц', duration_or_reps: '5 минут' }],
        sort_order: day,
      })
      .select()
      .single();
    if (workoutDayError) throw workoutDayError;

    const contextVariants: ExerciseContextVariant[] = otherContexts.map((name) => ({
      context_name: name,
      equipment_used: 'см. свой инвентарь',
      exercise_variant: 'то же упражнение, подбери ближайший аналог по доступному инвентарю',
    }));

    const exercises = EXERCISE_POOL[muscleGroup].map((exercise, i) => ({
      workout_day_id: workoutDay.id,
      exercise,
      muscle_group: muscleGroup,
      sets: SETS_BY_LEVEL[trainingLevel] ?? 3,
      reps_or_time: REPS_BY_LEVEL[trainingLevel] ?? '12 повторений',
      rest_seconds: 60,
      progression_note: 'Заглушка: добавляй повторение или подход, когда текущий объём даётся легко.',
      context_variants: contextVariants,
      short_on_time_alternative: 'Сделай по 1 подходу каждого упражнения без отдыха между ними.',
      sort_order: i,
    }));
    const { error: exercisesError } = await supabase.from('exercises').insert(exercises);
    if (exercisesError) throw exercisesError;
  }

  // 6. Черновой план питания.
  await supabase.from('meal_plans').delete().eq('profile_id', profileId);
  const { data: mealPlan, error: mealPlanError } = await supabase
    .from('meal_plans')
    .insert({
      profile_id: profileId,
      onboarding_response_id: onboardingResponse.id,
      daily_calories: calorieRecommendation?.recommended_calories ?? null,
      protein_g: calorieRecommendation?.protein_g ?? null,
      fat_g: calorieRecommendation?.fat_g ?? null,
      carbs_g: calorieRecommendation?.carbs_g ?? null,
      cook_from_ingredients_enabled: true,
      cook_from_ingredients_instructions:
        'Назови продукты, которые есть под рукой — предложим варианты под остаток нормы на день.',
      generation_source: 'stub',
      is_active: true,
    })
    .select()
    .single();
  if (mealPlanError) throw mealPlanError;

  const { data: sampleDay, error: sampleDayError } = await supabase
    .from('sample_day_plans')
    .insert({
      meal_plan_id: mealPlan.id,
      label: 'Черновой день (заглушка)',
      sort_order: 0,
    })
    .select()
    .single();
  if (sampleDayError) throw sampleDayError;

  const mealSplit = [
    { name: 'Завтрак', share: 0.25 },
    { name: 'Обед', share: 0.35 },
    { name: 'Ужин', share: 0.3 },
    { name: 'Перекус', share: 0.1 },
  ];
  const meals = mealSplit.map((m, i) => ({
    sample_day_plan_id: sampleDay.id,
    name: `${m.name} (заглушка)`,
    ingredients: ['уточним конкретные блюда, когда подключим ИИ'],
    calories: calorieRecommendation ? Math.round(calorieRecommendation.recommended_calories * m.share) : null,
    protein_g: calorieRecommendation ? Math.round(calorieRecommendation.protein_g * m.share) : null,
    fat_g: calorieRecommendation ? Math.round(calorieRecommendation.fat_g * m.share) : null,
    carbs_g: calorieRecommendation ? Math.round(calorieRecommendation.carbs_g * m.share) : null,
    sort_order: i,
  }));
  const { error: mealsError } = await supabase.from('meals').insert(meals);
  if (mealsError) throw mealsError;

  return { bmi, calorieRecommendation };
}
