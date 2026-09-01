import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useWindowDimensions, View } from 'react-native';

import { BottomBar } from '@/components/navigation/bottom-bar';
import { NAV_ITEMS } from '@/components/navigation/nav-items';
import { Sidebar } from '@/components/navigation/sidebar';

const WIDE_BREAKPOINT = 768;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  return (
    <Tabs>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide ? <Sidebar /> : null}
        <View style={{ flex: 1 }}>
          <TabSlot />
        </View>
        {wide ? null : <BottomBar />}
      </View>
      <TabList style={{ display: 'none' }}>
        {NAV_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} href={item.href} />
        ))}
      </TabList>
    </Tabs>
  );
}
