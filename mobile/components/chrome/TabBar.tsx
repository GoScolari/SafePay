/**
 * SafePay · TabBar
 *
 * Tab bar custom para Expo Router. Se inyecta en el layout (app)/_layout.tsx:
 *
 *   import { Tabs } from 'expo-router';
 *   import { TabBar } from '@/components/chrome/TabBar';
 *
 *   export default function AppLayout() {
 *     return (
 *       <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
 *         <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
 *         <Tabs.Screen name="notifications/index" options={{ title: 'Alertas' }} />
 *         <Tabs.Screen name="profile/index" options={{ title: 'Perfil' }} />
 *       </Tabs>
 *     );
 *   }
 *
 * El ícono de cada tab se resuelve por `route.name` en `TAB_ICONS`. El badge
 * de no leídas en "Alertas" se lee de `useNotificationStore` (Zustand).
 *
 * Visual: BlurView + indicador pill encima de la tab activa.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useNotificationStore } from '@/stores/notification.store';

const TAB_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'index':               'home',
  'notifications/index': 'bell',
  'profile/index':       'user',
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={[styles.root, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
    >
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            (options.tabBarLabel as string | undefined) ??
            options.title ??
            route.name;

          const iconName = TAB_ICONS[route.name] ?? 'circle';
          const unread = route.name === 'notifications/index' ? unreadCount : 0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
              style={styles.tab}
            >
              {isFocused && <View style={styles.indicator} />}
              <View style={styles.iconWrap}>
                <Feather
                  name={iconName}
                  size={22}
                  color={isFocused ? Colors.primary : Colors.textMuted}
                />
                {unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {unread > 99 ? '99+' : String(unread)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.label, isFocused && styles.labelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: 'rgba(11, 16, 36, 0.70)',
  },
  inner: {
    flexDirection: 'row',
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -1,
    width: 32,
    height: 3,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.caption,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radii.full,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});

export default TabBar;
