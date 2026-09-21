import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_SHORT, findWorkoutForDate, formatDayLabel, getMonthGrid, isSameDay } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function MonthView({ anchor, workoutDays }: { anchor: Date; workoutDays: WorkoutDayEntry[] }) {
  const theme = useTheme();
  const today = new Date();
  const weeks = getMonthGrid(anchor);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {WEEKDAY_SHORT.map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.headerCell}>
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            const inMonth = date.getMonth() === anchor.getMonth();
            const day = findWorkoutForDate(workoutDays, date);
            const today_ = isSameDay(date, today);
            const dateLabel = date.getDate();

            if (!day) {
              return (
                <View
                  key={di}
                  style={[styles.cell, today_ && { borderColor: theme.accent, borderWidth: 1 }]}
                  accessibilityLabel={`${formatDayLabel(date)} — тренировки нет`}>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={!inMonth && styles.outOfMonth}>
                    {dateLabel}
                  </ThemedText>
                </View>
              );
            }

            return (
              <Pressable
                key={di}
                onPress={() => router.push({ pathname: '/workout-day/[id]', params: { id: day.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${formatDayLabel(date)} — Открыть ${day.day_label}: ${day.target_muscle_groups.join(', ')}`}
                style={[
                  styles.cell,
                  { backgroundColor: theme.backgroundElement },
                  today_ && { borderColor: theme.accent, borderWidth: 1 },
                ]}>
                <ThemedText type="small" style={!inMonth && styles.outOfMonth}>
                  {dateLabel}
                </ThemedText>
                <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  headerRow: { flexDirection: 'row' },
  headerCell: { flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row', gap: Spacing.half },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    minHeight: 44,
    borderRadius: Radius.row,
  },
  outOfMonth: { opacity: 0.4 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
