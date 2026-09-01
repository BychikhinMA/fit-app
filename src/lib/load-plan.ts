import { supabase } from '@/lib/supabase';
import type { Database, ProfileId } from '@/types/database';

type ProfileSettings = Database['public']['Tables']['profile_settings']['Row'];
type Program = Database['public']['Tables']['programs']['Row'];
type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];
type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
type Meal = Database['public']['Tables']['meals']['Row'];

export type PlanData = {
  settings: ProfileSettings;
  program: Program | null;
  workoutDays: (WorkoutDay & { exercises: Exercise[] })[];
  mealPlan: MealPlan | null;
  meals: Meal[];
};

export async function loadPlan(profileId: ProfileId): Promise<PlanData> {
  const { data: settings, error: settingsError } = await supabase
    .from('profile_settings')
    .select('*')
    .eq('profile_id', profileId)
    .single();
  if (settingsError) throw settingsError;

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle();

  let workoutDays: (WorkoutDay & { exercises: Exercise[] })[] = [];
  if (program) {
    const { data: phases } = await supabase
      .from('phases')
      .select('id')
      .eq('program_id', program.id);
    const phaseIds = (phases ?? []).map((p) => p.id);

    const { data: days } = await supabase
      .from('workout_days')
      .select('*')
      .in('phase_id', phaseIds.length > 0 ? phaseIds : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order');

    const dayIds = (days ?? []).map((d) => d.id);
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('workout_day_id', dayIds.length > 0 ? dayIds : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order');

    workoutDays = (days ?? []).map((day) => ({
      ...day,
      exercises: (exercises ?? []).filter((ex) => ex.workout_day_id === day.id),
    }));
  }

  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle();

  let meals: Meal[] = [];
  if (mealPlan) {
    const { data: sampleDays } = await supabase
      .from('sample_day_plans')
      .select('id')
      .eq('meal_plan_id', mealPlan.id);
    const sampleDayIds = (sampleDays ?? []).map((d) => d.id);

    const { data: mealsData } = await supabase
      .from('meals')
      .select('*')
      .in('sample_day_plan_id', sampleDayIds.length > 0 ? sampleDayIds : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order');
    meals = mealsData ?? [];
  }

  return { settings, program: program ?? null, workoutDays, mealPlan: mealPlan ?? null, meals };
}
