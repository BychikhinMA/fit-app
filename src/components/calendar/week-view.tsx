import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusMark } from '@/components/calendar/status-mark';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_FULL, WEEKDAY_SHORT, getWeekDates, isSameDay, toISODate } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';
import { workoutForDate, workoutStatus } from '@/lib/program-schedule';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function WeekView({
  anchor,
  workoutDays,
  exceptions,
  periods,
  workoutLogs,
}: {
  anchor: Date;
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
  periods: PlanData['periods'];
  workoutLogs: PlanData['workoutLogs'];
}) {
  const theme = useTheme();
  const today = new Date();
  const weekDates = getWeekDates(anchor);

  return (
    <View style={styles.row}>
      {weekDates.map((date, i) => {
        const day = workoutForDate(workoutDays, date, exceptions, periods);
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

        const status = workoutStatus(date, day.id, workoutLogs, today);
        const statusLabel = { done: 'выполнено', missed: 'пропущено', planned: 'впереди' }[status];

        return (
          <Pressable
            key={i}
            onPress={() =>
              router.push({ pathname: '/workout-day/[id]', params: { id: day.id, date: toISODate(date) } })
            }
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAY_FULL[i]}, ${dateLabel} — ${day.day_label}, ${statusLabel}. Открыть`}
            style={[
              styles.cell,
              { backgroundColor: theme.backgroundElement },
              today_ && { borderColor: theme.accent, borderWidth: 1 },
            ]}>
            <ThemedText type="small" themeColor="textSecondary">
              {WEEKDAY_SHORT[i]}
            </ThemedText>
            <ThemedText type="default">{dateLabel}</ThemedText>
            <StatusMark status={status} />
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
});
