import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_FULL, WEEKDAY_SHORT, findWorkoutForDate, getWeekDates, isSameDay } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function WeekView({ anchor, workoutDays }: { anchor: Date; workoutDays: WorkoutDayEntry[] }) {
  const theme = useTheme();
  const today = new Date();
  const weekDates = getWeekDates(anchor);

  return (
    <View style={styles.row}>
      {weekDates.map((date, i) => {
        const day = findWorkoutForDate(workoutDays, date);
        const dateLabel = date.getDate();
        const today_ = isSameDay(date, today);

        if (!day) {
          return (
            <View
              key={i}
              style={[styles.cell, today_ && { borderColor: theme.accent, borderWidth: 1 }]}
              accessibilityLabel={`${WEEKDAY_FULL[i]}, ${dateLabel} — тренировки нет`}>
              <ThemedText type="small" themeColor="textSecondary">
                {WEEKDAY_SHORT[i]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {dateLabel}
              </ThemedText>
            </View>
          );
        }

        return (
          <Pressable
            key={i}
            onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: day.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAY_FULL[i]}, ${dateLabel} — Открыть ${day.day_label}: ${day.target_muscle_groups.join(', ')}`}
            style={[
              styles.cell,
              { backgroundColor: theme.backgroundElement },
              today_ && { borderColor: theme.accent, borderWidth: 1 },
            ]}>
            <ThemedText type="small" themeColor="textSecondary">
              {WEEKDAY_SHORT[i]}
            </ThemedText>
            <ThemedText type="default">{dateLabel}</ThemedText>
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    minHeight: 44,
    borderRadius: Radius.row,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
