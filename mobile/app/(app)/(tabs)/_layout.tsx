import { Tabs } from 'expo-router';
import { TabBar } from '@/components/chrome/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"                options={{ title: 'Inicio' }} />
      <Tabs.Screen name="notifications/index"  options={{ title: 'Alertas' }} />
      <Tabs.Screen name="profile/index"        options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
