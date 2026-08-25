import type { OnboardingAnswers } from '@/lib/onboarding-types';

export type SelectOption = { value: string; label: string };

export type FieldConfig =
  | { key: keyof OnboardingAnswers; type: 'text'; label: string; placeholder?: string; optional?: boolean }
  | { key: keyof OnboardingAnswers; type: 'textarea'; label: string; placeholder?: string; optional?: boolean }
  | { key: keyof OnboardingAnswers; type: 'number'; label: string; placeholder?: string; optional?: boolean }
  | { key: keyof OnboardingAnswers; type: 'single-select'; label: string; options: SelectOption[] }
  | { key: keyof OnboardingAnswers; type: 'multi-select'; label: string; options: SelectOption[] }
  | { key: keyof OnboardingAnswers; type: 'boolean'; label: string; description?: string };

export type StepConfig = {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
};

// Шаги 1:1 повторяют блоки Этапа 0 и Этапа 1 из workout_prompt.md.
// Шаг "contexts" (локации и условия) рендерится отдельным компонентом
// (ContextsField), а не через generic-рендерер — он структурно другой.
export const ONBOARDING_STEPS: StepConfig[] = [
  {
    id: 'custom-goals',
    title: 'Этап 0. Твои задачи своими словами',
    description:
      'Прежде чем задать стандартные вопросы — есть ли у тебя свои формулировки целей или "боли", которые не укладываются в стандартные категории? Можно пропустить.',
    fields: [
      {
        key: 'customGoalsText',
        type: 'textarea',
        label: 'Свои слова (необязательно)',
        placeholder: 'Например: хочу не запыхиваться на лестнице к 5 этажу...',
        optional: true,
      },
    ],
  },
  {
    id: 'goals',
    title: 'Блок 1. Цели и мотивация',
    fields: [
      {
        key: 'goal',
        type: 'single-select',
        label: 'Главная цель',
        options: [
          { value: 'weight_loss', label: 'Похудение' },
          { value: 'lean_definition', label: 'Рельеф / сушка' },
          { value: 'muscle_gain', label: 'Набор мышечной массы' },
          { value: 'general_fitness', label: 'Общая форма и выносливость' },
          { value: 'health', label: 'Здоровье / самочувствие' },
          { value: 'combination', label: 'Комбинация из перечисленного' },
        ],
      },
      {
        key: 'goalTarget',
        type: 'text',
        label: 'Конкретная цифра/срок, если есть',
        placeholder: 'Например: -8 кг за 4 месяца',
        optional: true,
      },
      {
        key: 'doneDefinition',
        type: 'textarea',
        label: 'Как ты поймёшь, что цель достигнута?',
        optional: true,
      },
    ],
  },
  {
    id: 'current-state',
    title: 'Блок 2. Текущее состояние',
    description: 'Нужно для расчёта ИМТ и нормы калорий.',
    fields: [
      {
        key: 'gender',
        type: 'single-select',
        label: 'Пол',
        options: [
          { value: 'male', label: 'Мужской' },
          { value: 'female', label: 'Женский' },
        ],
      },
      { key: 'age', type: 'number', label: 'Возраст, лет' },
      { key: 'heightCm', type: 'number', label: 'Рост, см' },
      { key: 'weightKg', type: 'number', label: 'Текущий вес, кг' },
      { key: 'bodyFatPct', type: 'number', label: '% жира (если знаешь)', optional: true },
      { key: 'waistCm', type: 'number', label: 'Обхват талии, см', optional: true },
      { key: 'hipsCm', type: 'number', label: 'Обхват бёдер, см', optional: true },
      {
        key: 'dailyActivity',
        type: 'single-select',
        label: 'Активность вне тренировок',
        options: [
          { value: 'sedentary', label: 'Сидячая работа' },
          { value: 'moderate', label: 'Среднее число шагов' },
          { value: 'active', label: 'Физическая работа' },
        ],
      },
      {
        key: 'trainingLevel',
        type: 'single-select',
        label: 'Уровень подготовки',
        options: [
          { value: 'beginner', label: 'Новичок' },
          { value: 'intermediate', label: 'Есть опыт' },
          { value: 'advanced', label: 'Продвинутый' },
        ],
      },
      {
        key: 'healthConstraints',
        type: 'textarea',
        label: 'Травмы, боли, ограничения, противопоказания от врача',
        optional: true,
      },
    ],
  },
  {
    id: 'contexts',
    title: 'Блок 3. Локации и условия',
    description:
      'Отметь все места, где реально можешь тренироваться, и что там доступно.',
    fields: [],
  },
  {
    id: 'schedule',
    title: 'Блок 4. Время и график',
    fields: [
      { key: 'daysPerWeek', type: 'number', label: 'Дней в неделю реально готов тренироваться' },
      { key: 'sessionMinutes', type: 'number', label: 'Минут на тренировку в среднем' },
      {
        key: 'lowTimeFrequency',
        type: 'single-select',
        label: 'Как часто бывают дни, когда времени сильно меньше?',
        options: [
          { value: 'rarely', label: 'Редко' },
          { value: 'sometimes', label: 'Иногда' },
          { value: 'often', label: 'Часто' },
        ],
      },
      {
        key: 'preferredTimeOfDay',
        type: 'text',
        label: 'Предпочтительное время суток',
        optional: true,
      },
      {
        key: 'needsScheduleFlexibility',
        type: 'boolean',
        label: 'Нужна гибкость расписания под разъезды?',
      },
    ],
  },
  {
    id: 'format',
    title: 'Блок 5. Формат и предпочтения',
    fields: [
      {
        key: 'likedFormats',
        type: 'multi-select',
        label: 'Какие форматы нравятся',
        options: [
          { value: 'bodyweight', label: 'Силовые с весом тела' },
          { value: 'weights', label: 'Силовые со свободными весами/тренажёрами' },
          { value: 'hiit', label: 'HIIT' },
          { value: 'cardio', label: 'Кардио' },
          { value: 'yoga', label: 'Йога / растяжка' },
          { value: 'circuit', label: 'Круговые тренировки' },
        ],
      },
      {
        key: 'dislikedExercises',
        type: 'textarea',
        label: 'Упражнения, которые не хочешь делать или дискомфортны',
        optional: true,
      },
      {
        key: 'needsWarmupCooldown',
        type: 'boolean',
        label: 'Нужны разминка и заминка/растяжка отдельными блоками?',
      },
    ],
  },
  {
    id: 'nutrition',
    title: 'Блок 6. Питание',
    fields: [
      {
        key: 'dietConstraints',
        type: 'multi-select',
        label: 'Ограничения/аллергии',
        options: [
          { value: 'none', label: 'Без ограничений' },
          { value: 'vegetarian', label: 'Вегетарианство' },
          { value: 'vegan', label: 'Веганство' },
          { value: 'lactose_free', label: 'Без лактозы' },
          { value: 'gluten_free', label: 'Без глютена' },
          { value: 'halal', label: 'Халяль' },
          { value: 'kosher', label: 'Кошер' },
        ],
      },
      { key: 'mealsPerDay', type: 'number', label: 'Сколько приёмов пищи в день удобно' },
      { key: 'cooksSelf', type: 'boolean', label: 'Готовишь сам(а)?' },
      {
        key: 'cookingTimeMinutes',
        type: 'number',
        label: 'Сколько минут готов тратить на готовку в будний день',
        optional: true,
      },
      {
        key: 'budgetNotes',
        type: 'text',
        label: 'Ограничения по бюджету, если есть',
        optional: true,
      },
      {
        key: 'mealStyle',
        type: 'single-select',
        label: 'Что удобнее',
        options: [
          { value: 'recipes', label: 'Готовые рецепты на каждый день' },
          { value: 'from_ingredients', label: 'Собирать блюдо из того, что есть дома' },
          { value: 'both', label: 'И то и другое' },
        ],
      },
      {
        key: 'wantsCalorieCounting',
        type: 'boolean',
        label: 'Нужен подсчёт калорий/БЖУ по продуктам с ручной коррекцией?',
      },
    ],
  },
  {
    id: 'progress',
    title: 'Блок 7. Прогресс и отчётность',
    fields: [
      {
        key: 'trackedMetrics',
        type: 'multi-select',
        label: 'Какие метрики хочешь отслеживать',
        options: [
          { value: 'weight', label: 'Вес' },
          { value: 'bmi', label: 'ИМТ' },
          { value: 'measurements', label: 'Замеры тела' },
          { value: 'photo', label: 'Фото' },
          { value: 'performance', label: 'Рабочие показатели в упражнениях' },
          { value: 'wellbeing', label: 'Самочувствие' },
          { value: 'volume', label: 'Объём нагрузки по группам мышц' },
          { value: 'calories', label: 'Соблюдение калорийности' },
        ],
      },
      {
        key: 'checkInFrequency',
        type: 'single-select',
        label: 'Как часто готов делать замеры/чек-ины?',
        options: [
          { value: 'weekly', label: 'Раз в неделю' },
          { value: 'biweekly', label: 'Раз в 2 недели' },
          { value: 'monthly', label: 'Раз в месяц' },
        ],
      },
    ],
  },
];
