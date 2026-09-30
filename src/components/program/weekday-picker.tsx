import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WEEKDAY_SHORT } from '@/lib/calendar-dates';

export function WeekdayPicker({
  selected,
  required,
  onChange,
}: {
  selected: number[];
  required: number;
  onChange: (next: number[]) => void;
}) {
  function toggle(weekday: number) {
    onChange(
      selected.includes(weekday) ? selected.filter((w) => w !== weekday) : [...selected, weekday].sort((a, b) => a - b)
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {WEEKDAY_SHORT.map((label, weekday) => (
          <Chip key={label} label={label} selected={selected.includes(weekday)} onPress={() => toggle(weekday)} />
        ))}
      </View>
      <ThemedText type="small" themeColor={selected.length === required ? 'textSecondary' : 'error'}>
        Выбрано {selected.length} из {required} — по числу дней в программе
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
