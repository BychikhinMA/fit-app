import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BMI_DISCLAIMER } from '@/lib/health-calc';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import { getStoredProfileId } from '@/lib/profile-storage';
import type { ProfileId } from '@/types/database';

export default function HomeTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);
  const [data, setData] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStoredProfileId().then((stored) => {
      if (stored) setProfileId(stored);
      else router.replace('/');
    });
  }, []);

  useEffect(() => {
    if (!profileId) return;
    loadPlan(profileId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [profileId]);

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

  const { settings, program, workoutDays } = data;
  const isStub = program?.generation_source === 'stub';
  const today = workoutDays[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Главная
          </ThemedText>

          {isStub && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Это черновик, не настоящий ИИ-план</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ключ Claude API ещё не подключён, поэтому программа тренировок и питания —
                упрощённая заглушка. ИМТ и норма калорий посчитаны по-настоящему. Как только
                появится ключ, план перегенерируется настоящим ИИ по тем же ответам.
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

          {today ? (
            <Pressable
              onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: today.id } })}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">План на сегодня</ThemedText>
                <ThemedText type="default">
                  {today.day_label} · {today.target_muscle_groups.join(', ')} · {today.default_context}
                </ThemedText>
                {today.exercises.map((ex) => (
                  <ThemedText key={ex.id} type="small" themeColor="textSecondary">
                    • {ex.exercise} — {ex.sets}×{ex.reps_or_time}
                  </ThemedText>
                ))}
              </ThemedView>
            </Pressable>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">План ещё не построен</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Пройди онбординг во вкладке «Профиль», чтобы получить программу.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: { gap: Spacing.three, paddingVertical: Spacing.four },
  title: { marginBottom: Spacing.two },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Elevation.card,
  },
});
