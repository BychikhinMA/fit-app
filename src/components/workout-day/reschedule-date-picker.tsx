import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  WEEKDAY_SHORT,
  formatMonthLabel,
  getMonthGrid,
  isSameDay,
  shiftAnchor,
} from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';
import { workoutForDate } from '@/lib/program-schedule';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function RescheduleDatePicker({
  workoutDays,
  exceptions,
  periods,
  originDate,
  onSelectDate,
}: {
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
  periods: PlanData['periods'];
  originDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const theme = useTheme();
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const today = new Date();
  const weeks = getMonthGrid(monthAnchor);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setMonthAnchor((prev) => shiftAnchor(prev, 'month', -1))}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          hitSlop={8}
          style={styles.navButton}>
          <ThemedText type="default">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{formatMonthLabel(monthAnchor)}</ThemedText>
        <Pressable
          onPress={() => setMonthAnchor((prev) => shiftAnchor(prev, 'month', 1))}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          hitSlop={8}
          style={styles.navButton}>
          <ThemedText type="default">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_SHORT.map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.weekdayCell}>
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            const inMonth = date.getMonth() === monthAnchor.getMonth();
            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isOrigin = isSameDay(date, originDate);
            const disabled = isPast || isOrigin;
            const hasWorkout = inMonth && workoutForDate(workoutDays, date, exceptions, periods) !== undefined;

            return (
              <Pressable
                key={di}
                disabled={disabled}
                onPress={() => onSelectDate(date)}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                accessibilityLabel={`${date.getDate()} ${formatMonthLabel(date)}${hasWorkout ? ', уже есть тренировка' : ''}`}
                style={[
                  styles.dayCell,
                  !inMonth && styles.outOfMonth,
                  disabled && styles.disabledCell,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="small" themeColor={disabled ? 'textSecondary' : 'text'}>
                  {date.getDate()}
                </ThemedText>
                {hasWorkout && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekdayRow: { flexDirection: 'row' },
  weekdayCell: { flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row', gap: Spacing.half },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    minHeight: 44,
    borderRadius: Radius.row,
  },
  outOfMonth: { opacity: 0.4 },
  disabledCell: { opacity: 0.3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
