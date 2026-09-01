import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TabTriggerButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: 'sidebar' | 'bottom';
  isFocused?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
};

export const TabTriggerButton = forwardRef<View, TabTriggerButtonProps>(function TabTriggerButton(
  { icon, label, variant, isFocused, onPress, onLongPress },
  ref
) {
  const theme = useTheme();
  const active = isFocused ?? false;
  const tint = active ? theme.text : theme.textSecondary;

  if (variant === 'sidebar') {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[
          styles.sidebarRow,
          active && { backgroundColor: theme.backgroundSelected },
        ]}>
        <Ionicons name={icon} size={22} color={tint} />
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.bottomItem}>
      <Ionicons name={icon} size={24} color={tint} />
      <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'} style={styles.bottomLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  sidebarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.row,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
  },
  bottomLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
