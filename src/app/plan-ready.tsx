import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BMI_DISCLAIMER } from '@/lib/health-calc';
import { clearStoredProfileId, getStoredProfileId } from '@/lib/profile-storage';
import { supabase } from '@/lib/supabase';
import type { Database, ProfileId } from '@/types/database';

type ProfileSettings = Database['public']['Tables']['profile_settings']['Row'];
type Program = Database['public']['Tables']['programs']['Row'];
type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];
type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
type Meal = Database['public']['Tables']['meals']['Row'];

type PlanData = {
  settings: ProfileSettings;
  program: Program | null;
  workoutDays: (WorkoutDay & { exercises: Exercise[] })[];
  mealPlan: MealPlan | null;
  meals: Meal[];
};

export default function PlanReadyScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ profile?: string }>();
  const [profileId, setProfileId] = useState<ProfileId | null>(
    params.profile === 'maksim' || params.profile === 'maria' ? params.profile : null
  );
  const [data, setData] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      getStoredProfileId().then((stored) => {
        if (stored) setProfileId(stored);
        else router.replace('/');
      });
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    loadPlan(profileId).then(setData).catch((err) => setError(err.message));
  }, [profileId]);

  async function switchProfile() {
    await clearStoredProfileId();
    router.replace('/');
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText>{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { settings, program, workoutDays, mealPlan, meals } = data;
  const isStub = program?.generation_source === 'stub';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Твой план готов
          </ThemedText>

          {isStub && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">Это черновик, не настоящий ИИ-план</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ключ Claude API ещё не подключён, поэтому программа тренировок и питания ниже —
                упрощённая заглушка. ИМТ и норма калорий уже посчитаны по-настоящему. Как только
                появится ключ, план перегенерируется настоящим ИИ по этим же ответам.
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">ИМТ</ThemedText>
            <ThemedText type="subtitle">
              {settings.bmi_value} · {settings.bmi_category}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {BMI_DISCLAIMER}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Норма калорий и БЖУ</ThemedText>
            <ThemedText type="subtitle">{settings.recommended_calories} ккал/день</ThemedText>
            <ThemedText type="default">
              Белки {settings.calorie_protein_g} г · Жиры {settings.calorie_fat_g} г · Углеводы{' '}
              {settings.calorie_carbs_g} г
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {settings.calorie_method}
            </ThemedText>
          </ThemedView>

          {program && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{program.name}</ThemedText>
              {workoutDays.map((day) => (
                <View key={day.id} style={styles.dayBlock}>
                  <ThemedText type="default">
                    {day.day_label} · {day.target_muscle_groups.join(', ')} · {day.default_context}
                  </ThemedText>
                  {day.exercises.map((ex) => (
                    <ThemedText key={ex.id} type="small" themeColor="textSecondary">
                      • {ex.exercise} — {ex.sets}×{ex.reps_or_time}
                    </ThemedText>
                  ))}
                </View>
              ))}
            </ThemedView>
          )}

          {mealPlan && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Пример дня питания</ThemedText>
              {meals.map((meal) => (
                <ThemedText key={meal.id} type="small" themeColor="textSecondary">
                  • {meal.name} — {meal.calories} ккал (Б{meal.protein_g}/Ж{meal.fat_g}/У
                  {meal.carbs_g})
                </ThemedText>
              ))}
            </ThemedView>
          )}

          <Pressable
            onPress={switchProfile}
            style={[styles.switchButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Сменить профиль</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

async function loadPlan(profileId: ProfileId): Promise<PlanData> {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  title: {
    marginBottom: Spacing.two,
  },
  notice: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  dayBlock: {
    gap: Spacing.half,
    marginTop: Spacing.two,
  },
  switchButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
