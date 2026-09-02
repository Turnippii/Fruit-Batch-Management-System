import { Redirect, Tabs } from 'expo-router';
import { Text, ColorValue } from 'react-native';
import { colors } from '../../src/constants/theme';
import { strings } from '../../src/constants/strings';
import { useSession } from '../../src/state/SessionContext';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function RetailerLayout() {
  const { session } = useSession();
  if (!session || session.role !== 'retailer') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.blueMain },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.blueMain,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: strings.tabs.retailerHome, headerTitle: strings.retailerHome.title, tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: strings.tabs.scan, headerTitle: strings.scan.title, tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} /> }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: strings.tabs.alerts, headerTitle: strings.alerts.title, tabBarIcon: ({ color }) => <TabIcon emoji="🔔" color={color} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: strings.tabs.account, headerTitle: strings.account.title, tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
    </Tabs>
  );
}
