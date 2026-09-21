import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getQuarterMonths } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

import { MonthMini } from './month-mini';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function QuarterView({
  anchor,
  workoutDays,
  onSelectMonth,
}: {
  anchor: Date;
  workoutDays: WorkoutDayEntry[];
  onSelectMonth: (monthStart: Date) => void;
}) {
  const months = getQuarterMonths(anchor);

  return (
    <View style={styles.row}>
      {months.map((monthStart) => (
        <MonthMini
          key={monthStart.toISOString()}
          monthStart={monthStart}
          workoutDays={workoutDays}
          onSelect={onSelectMonth}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
});
