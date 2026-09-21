import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getYearMonths } from '@/lib/calendar-dates';
import type { PlanData } from '@/lib/load-plan';

import { MonthMini } from './month-mini';

type WorkoutDayEntry = PlanData['workoutDays'][number];

export function YearView({
  anchor,
  workoutDays,
  onSelectMonth,
}: {
  anchor: Date;
  workoutDays: WorkoutDayEntry[];
  onSelectMonth: (monthStart: Date) => void;
}) {
  const months = getYearMonths(anchor);

  return (
    <View style={styles.grid}>
      {months.map((monthStart) => (
        <View key={monthStart.toISOString()} style={styles.item}>
          <MonthMini monthStart={monthStart} workoutDays={workoutDays} onSelect={onSelectMonth} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  item: {
    flexBasis: '31%',
    flexGrow: 1,
  },
});
