import { BlurView } from 'expo-blur';
import { TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabTriggerButton } from '@/components/navigation/tab-trigger-button';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function BottomBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const tint = scheme === 'dark' ? 'dark' : 'light';

  return (
    <BlurView
      intensity={40}
      tint={tint}
      style={[
        styles.container,
        { borderTopColor: theme.backgroundSelected, paddingBottom: insets.bottom },
      ]}>
      <View style={styles.row}>
        {NAV_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} asChild>
            <TabTriggerButton icon={item.icon} label={item.label} variant="bottom" />
          </TabTrigger>
        ))}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
});
