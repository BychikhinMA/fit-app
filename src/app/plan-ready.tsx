import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BMI_DISCLAIMER } from '@/lib/health-calc';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import { clearStoredProfileId, getStoredProfileId } from '@/lib/profile-storage';
import type { ProfileId } from '@/types/database';

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
                <Pressable
                  key={day.id}
                  onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: day.id } })}
                  style={styles.dayBlock}>
                  <ThemedText type="default">
                    {day.day_label} · {day.target_muscle_groups.join(', ')} · {day.default_context}
                  </ThemedText>
                  {day.exercises.map((ex) => (
                    <ThemedText key={ex.id} type="small" themeColor="textSecondary">
                      • {ex.exercise} — {ex.sets}×{ex.reps_or_time}
                    </ThemedText>
                  ))}
                </Pressable>
              ))}
            </ThemedView>
          )}

          <Pressable
            onPress={() => router.push('/exercise-library')}
            style={[styles.switchButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Библиотека упражнений</ThemedText>
          </Pressable>

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
