import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notification.store';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';
import { View, Text, StyleSheet } from 'react-native';

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function AppLayout() {
  const unreadCount  = useNotificationStore((s) => s.unreadCount);
  const pendingTxId  = useAuthStore((s) => s.pendingTxId);
  const setPendingTx = useAuthStore((s) => s.setPendingTx);

  useEffect(() => {
    if (pendingTxId) {
      setPendingTx(null);
      router.push(`/(app)/transactions/${pendingTxId}` as never);
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { borderTopColor: Colors.border, backgroundColor: Colors.surface },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color }) => (
            <View>
              <TabIcon emoji="🔔" color={color} />
              <Badge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
      {/* Pantallas sin tab */}
      <Tabs.Screen name="transactions/archived"  options={{ href: null }} />
      <Tabs.Screen name="transactions/new"      options={{ href: null }} />
      <Tabs.Screen name="transactions/[id]"     options={{ href: null }} />
      <Tabs.Screen name="transactions/pay"      options={{ href: null }} />
      <Tabs.Screen name="transactions/photos"   options={{ href: null }} />
      <Tabs.Screen name="transactions/tracking" options={{ href: null }} />
      <Tabs.Screen name="disputes/[id]"         options={{ href: null }} />
      <Tabs.Screen name="disputes/new"          options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === Colors.primary ? 1 : 0.5 }}>{emoji}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.danger,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
