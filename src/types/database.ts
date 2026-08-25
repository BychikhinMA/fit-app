// Ручные типы под supabase/migrations/0001_init.sql.
// CLI supabase не подключён (нет линка к проекту), поэтому типы поддерживаются руками:
// при изменении миграции — поправь и этот файл.

export type ProfileId = 'maksim' | 'maria';

export type WarmupCooldownItem = { name: string; duration_or_reps: string };

export type ExerciseContextVariant = {
  context_name: string;
  equipment_used: string;
  exercise_variant: string;
};

export type ExercisePerformanceEntry = {
  exercise: string;
  sets_completed?: number;
  reps_or_time_actual?: string;
  notes?: string;
};

interface Table<Row, Insert, Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: ProfileId; display_name: string; created_at: string },
        { id: ProfileId; display_name: string; created_at?: string }
      >;
      profile_settings: Table<
        {
          profile_id: ProfileId;
          goal: string | null;
          custom_goals: string[];
          level: string | null;
          constraints: string[];
          gender: string | null;
          age: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          activity_level: string | null;
          bmi_value: number | null;
          bmi_category: string | null;
          bmi_calculated_at: string | null;
          calorie_method: string | null;
          recommended_calories: number | null;
          calorie_protein_g: number | null;
          calorie_fat_g: number | null;
          calorie_carbs_g: number | null;
          calorie_calculated_at: string | null;
          days_per_week: number | null;
          session_minutes: number | null;
          time_variability_notes: string | null;
          diet_constraints: string[];
          estimated_timeframe_min_weeks: number | null;
          estimated_timeframe_max_weeks: number | null;
          estimated_timeframe_basis: string | null;
          updated_at: string;
        },
        {
          profile_id: ProfileId;
          goal?: string | null;
          custom_goals?: string[];
          level?: string | null;
          constraints?: string[];
          gender?: string | null;
          age?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          activity_level?: string | null;
          bmi_value?: number | null;
          bmi_category?: string | null;
          bmi_calculated_at?: string | null;
          calorie_method?: string | null;
          recommended_calories?: number | null;
          calorie_protein_g?: number | null;
          calorie_fat_g?: number | null;
          calorie_carbs_g?: number | null;
          calorie_calculated_at?: string | null;
          days_per_week?: number | null;
          session_minutes?: number | null;
          time_variability_notes?: string | null;
          diet_constraints?: string[];
          estimated_timeframe_min_weeks?: number | null;
          estimated_timeframe_max_weeks?: number | null;
          estimated_timeframe_basis?: string | null;
          updated_at?: string;
        }
      >;
      onboarding_responses: Table<
        {
          id: string;
          profile_id: ProfileId;
          answers: Record<string, unknown>;
          status: 'draft' | 'submitted' | 'generating' | 'completed' | 'failed';
          generation_source: 'stub' | 'claude' | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          answers: Record<string, unknown>;
          status?: 'draft' | 'submitted' | 'generating' | 'completed' | 'failed';
          generation_source?: 'stub' | 'claude' | null;
          submitted_at?: string | null;
        }
      >;
      training_contexts: Table<
        {
          id: string;
          profile_id: ProfileId;
          context_name: string;
          equipment: string[];
          typical_frequency: string | null;
          created_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          context_name: string;
          equipment?: string[];
          typical_frequency?: string | null;
        }
      >;
      programs: Table<
        {
          id: string;
          profile_id: ProfileId;
          onboarding_response_id: string | null;
          name: string;
          duration_weeks: number | null;
          generation_source: 'stub' | 'claude';
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          onboarding_response_id?: string | null;
          name: string;
          duration_weeks?: number | null;
          generation_source?: 'stub' | 'claude';
          is_active?: boolean;
        }
      >;
      phases: Table<
        {
          id: string;
          program_id: string;
          phase_name: string;
          week_start: number | null;
          week_end: number | null;
          goal: string | null;
          sort_order: number;
        },
        {
          id?: string;
          program_id: string;
          phase_name: string;
          week_start?: number | null;
          week_end?: number | null;
          goal?: string | null;
          sort_order?: number;
        }
      >;
      workout_days: Table<
        {
          id: string;
          phase_id: string;
          day_label: string;
          default_context: string | null;
          target_muscle_groups: string[];
          warmup: WarmupCooldownItem[];
          cooldown: WarmupCooldownItem[];
          sort_order: number;
        },
        {
          id?: string;
          phase_id: string;
          day_label: string;
          default_context?: string | null;
          target_muscle_groups?: string[];
          warmup?: WarmupCooldownItem[];
          cooldown?: WarmupCooldownItem[];
          sort_order?: number;
        }
      >;
      exercises: Table<
        {
          id: string;
          workout_day_id: string;
          exercise: string;
          muscle_group: string | null;
          sets: number | null;
          reps_or_time: string | null;
          rest_seconds: number | null;
          progression_note: string | null;
          context_variants: ExerciseContextVariant[];
          short_on_time_alternative: string | null;
          sort_order: number;
        },
        {
          id?: string;
          workout_day_id: string;
          exercise: string;
          muscle_group?: string | null;
          sets?: number | null;
          reps_or_time?: string | null;
          rest_seconds?: number | null;
          progression_note?: string | null;
          context_variants?: ExerciseContextVariant[];
          short_on_time_alternative?: string | null;
          sort_order?: number;
        }
      >;
      meal_plans: Table<
        {
          id: string;
          profile_id: ProfileId;
          onboarding_response_id: string | null;
          daily_calories: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbs_g: number | null;
          cook_from_ingredients_enabled: boolean;
          cook_from_ingredients_instructions: string | null;
          generation_source: 'stub' | 'claude';
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          onboarding_response_id?: string | null;
          daily_calories?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          carbs_g?: number | null;
          cook_from_ingredients_enabled?: boolean;
          cook_from_ingredients_instructions?: string | null;
          generation_source?: 'stub' | 'claude';
          is_active?: boolean;
        }
      >;
      sample_day_plans: Table<
        { id: string; meal_plan_id: string; label: string; sort_order: number },
        { id?: string; meal_plan_id: string; label: string; sort_order?: number }
      >;
      meals: Table<
        {
          id: string;
          sample_day_plan_id: string;
          name: string;
          ingredients: string[];
          calories: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbs_g: number | null;
          sort_order: number;
        },
        {
          id?: string;
          sample_day_plan_id: string;
          name: string;
          ingredients?: string[];
          calories?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          carbs_g?: number | null;
          sort_order?: number;
        }
      >;
      food_log_entries: Table<
        {
          id: string;
          profile_id: ProfileId;
          date: string;
          item_name: string;
          quantity: string | null;
          estimated_calories: number | null;
          estimated_protein_g: number | null;
          estimated_fat_g: number | null;
          estimated_carbs_g: number | null;
          source: 'estimate' | 'label' | 'user_corrected';
          created_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          date: string;
          item_name: string;
          quantity?: string | null;
          estimated_calories?: number | null;
          estimated_protein_g?: number | null;
          estimated_fat_g?: number | null;
          estimated_carbs_g?: number | null;
          source?: 'estimate' | 'label' | 'user_corrected';
        }
      >;
      workout_logs: Table<
        {
          id: string;
          profile_id: ProfileId;
          workout_day_id: string | null;
          date: string;
          day_label: string | null;
          context_used: string | null;
          completed: boolean;
          exercises_performance: ExercisePerformanceEntry[];
          perceived_effort: string | null;
          adapted_notes: string | null;
          created_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          workout_day_id?: string | null;
          date: string;
          day_label?: string | null;
          context_used?: string | null;
          completed?: boolean;
          exercises_performance?: ExercisePerformanceEntry[];
          perceived_effort?: string | null;
          adapted_notes?: string | null;
        }
      >;
      nutrition_logs: Table<
        {
          id: string;
          profile_id: ProfileId;
          date: string;
          calories: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbs_g: number | null;
          adherence_notes: string | null;
        },
        {
          id?: string;
          profile_id: ProfileId;
          date: string;
          calories?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          carbs_g?: number | null;
          adherence_notes?: string | null;
        }
      >;
      progress_metrics: Table<
        {
          id: string;
          profile_id: ProfileId;
          date: string;
          weight_kg: number | null;
          waist_cm: number | null;
          hips_cm: number | null;
          photo_url: string | null;
          bmi: number | null;
          created_at: string;
        },
        {
          id?: string;
          profile_id: ProfileId;
          date: string;
          weight_kg?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          photo_url?: string | null;
          bmi?: number | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
