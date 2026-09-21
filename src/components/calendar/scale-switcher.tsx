import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatScaleLabel, type CalendarScale } from '@/lib/calendar-dates';

const SCALES: { value: CalendarScale; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
];

export function ScaleSwitcher({
  scale,
  onScaleChange,
  anchor,
  onNavigate,
  onToday,
}: {
  scale: CalendarScale;
  onScaleChange: (scale: CalendarScale) => void;
  anchor: Date;
  onNavigate: (direction: 1 | -1) => void;
  onToday: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.periodRow}>
        <Pressable
          onPress={() => onNavigate(-1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий период"
          style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" style={styles.periodLabel}>
          {formatScaleLabel(scale, anchor)}
        </ThemedText>
        <Pressable
          onPress={() => onNavigate(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Следующий период"
          style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={onToday}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Перейти к сегодняшнему дню"
          style={styles.todayButton}>
          <ThemedText type="linkPrimary">Сегодня</ThemedText>
        </Pressable>
      </View>

      <View style={styles.pillRow}>
        {SCALES.map((s) => {
          const selected = s.value === scale;
          return (
            <Pressable
              key={s.value}
              onPress={() => onScaleChange(s.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={s.label}
              style={[styles.pill, { backgroundColor: selected ? theme.accent : theme.backgroundElement }]}>
              <ThemedText type="small" themeColor={selected ? 'onAccent' : 'text'}>
                {s.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  navButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: { flex: 1, textAlign: 'center' },
  todayButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pill: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.one,
  },
});
