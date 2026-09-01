import { TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabTriggerButton } from '@/components/navigation/tab-trigger-button';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Sidebar() {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left']}
      style={[
        styles.container,
        { backgroundColor: theme.background, borderRightColor: theme.backgroundSelected },
      ]}>
      <ThemedText type="smallBold" style={styles.brand}>
        fit-app
      </ThemedText>
      <View style={styles.list}>
        {NAV_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} asChild>
            <TabTriggerButton icon={item.icon} label={item.label} variant="sidebar" />
          </TabTrigger>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  brand: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  list: {
    gap: Spacing.one,
  },
});
