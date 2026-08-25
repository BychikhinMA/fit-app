import type { ActivityLevel, Gender, Goal } from '@/lib/health-calc';

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type LowTimeFrequency = 'rarely' | 'sometimes' | 'often';
export type MealStyle = 'recipes' | 'from_ingredients' | 'both';
export type CheckInFrequency = 'weekly' | 'biweekly' | 'monthly';

export type ContextAnswer = {
  name: string;
  equipment: string[];
  typicalFrequency: string;
};

// Полный набор ответов мастера онбординга — блоки соответствуют Этапу 0 и
// Этапу 1 из workout_prompt.md. Сохраняется как onboarding_responses.answers,
// и из него же считаются profile_settings / training_contexts / заглушка плана.
export type OnboardingAnswers = {
  // Этап 0
  customGoalsText: string;

  // Блок 1. Цели и мотивация
  goal: Goal | null;
  goalTarget: string;
  doneDefinition: string;

  // Блок 2. Текущее состояние
  gender: Gender | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  dailyActivity: ActivityLevel | null;
  trainingLevel: TrainingLevel | null;
  healthConstraints: string;

  // Блок 3. Локации и условия
  contexts: ContextAnswer[];
  contextSwitchConsent: boolean;

  // Блок 4. Время и график
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  lowTimeFrequency: LowTimeFrequency | null;
  preferredTimeOfDay: string;
  needsScheduleFlexibility: boolean;

  // Блок 5. Формат и предпочтения
  likedFormats: string[];
  dislikedExercises: string;
  needsWarmupCooldown: boolean;

  // Блок 6. Питание
  dietConstraints: string[];
  mealsPerDay: number | null;
  cooksSelf: boolean;
  cookingTimeMinutes: number | null;
  budgetNotes: string;
  mealStyle: MealStyle | null;
  wantsCalorieCounting: boolean;

  // Блок 7. Прогресс и отчётность
  trackedMetrics: string[];
  checkInFrequency: CheckInFrequency | null;
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  customGoalsText: '',
  goal: null,
  goalTarget: '',
  doneDefinition: '',
  gender: null,
  age: null,
  heightCm: null,
  weightKg: null,
  bodyFatPct: null,
  waistCm: null,
  hipsCm: null,
  dailyActivity: null,
  trainingLevel: null,
  healthConstraints: '',
  contexts: [],
  contextSwitchConsent: true,
  daysPerWeek: null,
  sessionMinutes: null,
  lowTimeFrequency: null,
  preferredTimeOfDay: '',
  needsScheduleFlexibility: false,
  likedFormats: [],
  dislikedExercises: '',
  needsWarmupCooldown: true,
  dietConstraints: [],
  mealsPerDay: null,
  cooksSelf: true,
  cookingTimeMinutes: null,
  budgetNotes: '',
  mealStyle: null,
  wantsCalorieCounting: true,
  trackedMetrics: [],
  checkInFrequency: null,
};
