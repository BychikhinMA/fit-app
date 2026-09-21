import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayView } from '@/components/calendar/day-view';
import { MonthView } from '@/components/calendar/month-view';
import { QuarterView } from '@/components/calendar/quarter-view';
import { ScaleSwitcher } from '@/components/calendar/scale-switcher';
import { WeekView } from '@/components/calendar/week-view';
import { YearView } from '@/components/calendar/year-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type CalendarScale, shiftAnchor } from '@/lib/calendar-dates';
import { getCurrentProfileId } from '@/lib/auth';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import type { ProfileId } from '@/types/database';

export default function WorkoutsTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);
  const [data, setData] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<CalendarScale>('week');
  const [anchor, setAnchor] = useState(() => new Date());

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

  function handleNavigate(direction: 1 | -1) {
    setAnchor((prev) => shiftAnchor(prev, scale, direction));
  }

  function handleSelectMonth(monthStart: Date) {
    setScale('month');
    setAnchor(monthStart);
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
              <ThemedText type="smallBold">{program.name}</ThemedText>

              <ScaleSwitcher
                scale={scale}
                onScaleChange={setScale}
                anchor={anchor}
                onNavigate={handleNavigate}
                onToday={() => setAnchor(new Date())}
              />

              {scale === 'day' && <DayView anchor={anchor} workoutDays={workoutDays} />}
              {scale === 'week' && <WeekView anchor={anchor} workoutDays={workoutDays} />}
              {scale === 'month' && <MonthView anchor={anchor} workoutDays={workoutDays} />}
              {scale === 'quarter' && (
                <QuarterView anchor={anchor} workoutDays={workoutDays} onSelectMonth={handleSelectMonth} />
              )}
              {scale === 'year' && (
                <YearView anchor={anchor} workoutDays={workoutDays} onSelectMonth={handleSelectMonth} />
              )}
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
    gap: Spacing.three,
    ...Elevation.card,
  },
});
