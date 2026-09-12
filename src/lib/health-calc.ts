// Формулы ИМТ и нормы калорий — настоящая логика (не заглушка), совпадает с
// тем, что описано в workout_prompt.md (Этап 1, финал) и используется и в
// заглушке онбординга, и в карточке ИМТ (экран 8) с кнопкой "пересчитать".

export type Goal =
  | 'weight_loss'
  | 'lean_definition'
  | 'muscle_gain'
  | 'general_fitness'
  | 'health'
  | 'combination';

export type ActivityLevel = 'sedentary' | 'moderate' | 'active';
export type Gender = 'male' | 'female';

export type BmiResult = {
  value: number;
  category: 'недостаток веса' | 'норма' | 'избыток веса' | 'ожирение';
};

/** Returns `null` when weight/height are missing, zero, or negative — garbage in, no number out. */
export function computeBmi(weightKg: number, heightCm: number): BmiResult | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const value = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  let category: BmiResult['category'];
  if (value < 18.5) category = 'недостаток веса';
  else if (value < 25) category = 'норма';
  else if (value < 30) category = 'избыток веса';
  else category = 'ожирение';

  return { value, category };
}

export const BMI_DISCLAIMER =
  'ИМТ — грубый ориентир, особенно неточен при развитой мышечной массе, и не заменяет консультацию врача.';

// Коэффициент активности вне тренировок (Миффлин-Сан Жеор).
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.3,
  moderate: 1.5,
  active: 1.75,
};

// Корректировка нормы калорий под цель.
const GOAL_ADJUSTMENT: Record<Goal, number> = {
  weight_loss: -0.2,
  lean_definition: -0.15,
  muscle_gain: 0.1,
  general_fitness: 0,
  health: 0,
  combination: -0.1,
};

// г белка на кг веса — выше для целей, где важно сохранить/набрать мышцы.
const PROTEIN_PER_KG: Record<Goal, number> = {
  weight_loss: 2.0,
  lean_definition: 2.0,
  muscle_gain: 2.0,
  general_fitness: 1.6,
  health: 1.6,
  combination: 1.8,
};

export type CalorieRecommendation = {
  method: string;
  recommended_calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
};

/** Returns `null` when age/height/weight are missing, zero, or negative — garbage in, no number out. */
export function computeCalorieRecommendation(params: {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}): CalorieRecommendation | null {
  const { gender, age, heightCm, weightKg, activityLevel, goal } = params;

  if (
    !Number.isFinite(age) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    age <= 0 ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return null;
  }

  const bmr =
    10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[activityLevel];
  const calories = Math.round(tdee * (1 + GOAL_ADJUSTMENT[goal]));

  const protein_g = Math.round(weightKg * PROTEIN_PER_KG[goal]);
  const fat_g = Math.round((calories * 0.25) / 9);
  const proteinAndFatCalories = protein_g * 4 + fat_g * 9;
  const carbs_g = Math.max(0, Math.round((calories - proteinAndFatCalories) / 4));

  return {
    method: 'Mifflin-St Jeor (BMR) × коэффициент активности × поправка на цель',
    recommended_calories: calories,
    protein_g,
    fat_g,
    carbs_g,
  };
}
