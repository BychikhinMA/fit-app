import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutStatus } from '@/lib/program-schedule';

/** Точка «впереди», галочка «выполнено», приглушённое кольцо «пропущено». Смысл дублируется в accessibilityLabel ячейки. */
export function StatusMark({ status, size = 'regular' }: { status: WorkoutStatus; size?: 'regular' | 'small' }) {
  const theme = useTheme();
  const dim = size === 'small' ? 5 : 6;

  if (status === 'done') {
    return (
      <ThemedText type="small" themeColor="accentText" style={styles.check}>
        ✓
      </ThemedText>
    );
  }
  if (status === 'missed') {
    return (
      <View
        style={{ width: dim, height: dim, borderRadius: dim / 2, borderWidth: 1, borderColor: theme.textSecondary }}
      />
    );
  }
  return <View style={{ width: dim, height: dim, borderRadius: dim / 2, backgroundColor: theme.accent }} />;
}

const styles = StyleSheet.create({
  check: { lineHeight: 12 },
});
