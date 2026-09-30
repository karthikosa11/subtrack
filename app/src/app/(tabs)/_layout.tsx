import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { fonts, useTheme } from '@/theme';

// Text-only tabs, like the section tabs on a paper statement.
export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.muted,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 15 },
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Spending' }} />
      <Tabs.Screen name="breakdown" options={{ title: 'Breakdown' }} />
    </Tabs>
  );
}
