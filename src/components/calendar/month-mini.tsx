import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_FULL, findWorkoutForDate, formatMonthLabel, getMonthGrid } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function MonthMini({
  monthStart,
  workoutDays,
  onSelect,
}: {
  monthStart: Date;
  workoutDays: WorkoutDayEntry[];
  onSelect: (monthStart: Date) => void;
}) {
  const theme = useTheme();
  const weeks = getMonthGrid(monthStart);

  const scheduledWeekdays = [...new Set(workoutDays.map((d) => d.weekday).filter((w): w is number => w !== null))];
  const scheduleNote =
    scheduledWeekdays.length > 0
      ? ` — тренировки по: ${scheduledWeekdays.map((w) => WEEKDAY_FULL[w]).join(', ')}`
      : ' — тренировок нет';

  return (
    <Pressable
      onPress={() => onSelect(monthStart)}
      accessibilityRole="button"
      accessibilityLabel={`${formatMonthLabel(monthStart)}${scheduleNote}`}
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={styles.title}>
        {formatMonthLabel(monthStart)}
      </ThemedText>
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => {
              const inMonth = date.getMonth() === monthStart.getMonth();
              const day = inMonth ? findWorkoutForDate(workoutDays, date) : undefined;
              return (
                <View key={di} style={styles.miniCell}>
                  {day && <View style={[styles.miniDot, { backgroundColor: theme.accent }]} />}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.row,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  title: { textAlign: 'center' },
  grid: { gap: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'center', gap: 3 },
  miniCell: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
