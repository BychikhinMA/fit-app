import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Leading back affordance for stack screens (the app hides the native header
 * everywhere, so this is the platform back chevron's custom equivalent —
 * never a bare "←" glyph, per the icon-system rule).
 */
export function BackButton({ onPress, label = 'Назад' }: { onPress: () => void; label?: string }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.button}>
      <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
      <ThemedText type="link" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: 8,
  },
});
