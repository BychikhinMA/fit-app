import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findWorkoutForDate, formatDayLabel } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function DayView({ anchor, workoutDays }: { anchor: Date; workoutDays: WorkoutDayEntry[] }) {
  const theme = useTheme();
  const day = findWorkoutForDate(workoutDays, anchor);

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDayLabel(anchor)}
      </ThemedText>

      {day ? (
        <Pressable
          onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: day.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Открыть ${day.day_label}: ${day.target_muscle_groups.join(', ')}`}
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="default">{day.day_label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {day.target_muscle_groups.join(', ')} · {day.exercises.length} упражнений
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.card} accessibilityLabel="Тренировки нет">
          <ThemedText type="small" themeColor="textSecondary">
            Тренировки нет
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  card: {
    borderRadius: Radius.row,
    padding: Spacing.three,
    minHeight: 44,
    justifyContent: 'center',
    gap: Spacing.half,
  },
});
