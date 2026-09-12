import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentProfileId } from '@/lib/auth';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import type { ProfileId } from '@/types/database';

export default function WorkoutsTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);
  const [data, setData] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentProfileId().then((current) => {
      if (current) setProfileId(current);
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

  const { program, workoutDays } = data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Тренировки
          </ThemedText>

          {program ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" style={styles.programName}>
                {program.name}
              </ThemedText>
              {workoutDays.map((day, i) => (
                <Pressable
                  key={day.id}
                  onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: day.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть ${day.day_label}: ${day.target_muscle_groups.join(', ')}`}
                  style={[styles.dayRow, i > 0 && { borderTopColor: theme.background, borderTopWidth: 1 }]}>
                  <ThemedText type="default">{day.day_label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {day.target_muscle_groups.join(', ')} · {day.exercises.length} упражнений
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Программа ещё не построена</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Пройди онбординг во вкладке «Профиль».
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
    ...Elevation.card,
  },
  programName: { marginBottom: Spacing.one },
  dayRow: {
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
