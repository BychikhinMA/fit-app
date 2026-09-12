import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
            <ThemedView type="backgroundSelected" style={styles.notice}>
              <ThemedText type="smallBold" themeColor="accentText">
                Черновик плана
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ключ ИИ ещё не подключён, поэтому программа и питание — упрощённая заглушка. ИМТ и
                норма калорий посчитаны по-настоящему.
              </ThemedText>
            </ThemedView>
          )}

          {today ? (
            <Pressable
              onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: today.id } })}>
              <ThemedView type="backgroundElement" style={styles.heroCard}>
                <ThemedText type="smallBold" themeColor="accentText">
                  СЕГОДНЯ
                </ThemedText>
                <ThemedText type="subtitle">{today.day_label}</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  {today.target_muscle_groups.join(', ')} · {today.exercises.length} упражнений
                </ThemedText>
                <ThemedText type="linkPrimary">Открыть тренировку →</ThemedText>
              </ThemedView>
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              План ещё не построен — пройди онбординг во вкладке «Профиль», чтобы получить
              программу.
            </ThemedText>
          )}

          <View style={styles.statsRow}>
            <ThemedView type="backgroundElement" style={styles.statTile}>
              <ThemedText type="small" themeColor="textSecondary">
                ИМТ
              </ThemedText>
              <ThemedText type="subtitle">{settings.bmi_value}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {settings.bmi_category}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.statTile}>
              <ThemedText type="small" themeColor="textSecondary">
                Калории
              </ThemedText>
              <ThemedText type="subtitle">{settings.recommended_calories}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ккал/день
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Б {settings.calorie_protein_g} г · Ж {settings.calorie_fat_g} г · У{' '}
            {settings.calorie_carbs_g} г · {settings.calorie_method}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {BMI_DISCLAIMER}
          </ThemedText>
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
  notice: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  heroCard: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.one,
    ...Elevation.card,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statTile: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
    ...Elevation.card,
  },
});
