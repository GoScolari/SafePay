/**
 * SafePay · FAB (Floating Action Button)
 *
 * Botón flotante anclado bottom-right. Dos variants:
 *   standard  → círculo 56×56 con un solo ícono.
 *   extended  → píldora con ícono + label.
 *
 * Por default se posiciona arriba de la TabBar con un offset que respeta
 * la safe area bottom. Pasar `bottomOffset` para ajustar manualmente.
 *
 * Uso:
 *   <FAB icon="plus" onPress={() => router.push('/transactions/new')} />
 *   <FAB icon="plus" label="Nueva transacción" extended onPress={...} />
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';

interface FABProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  extended?: boolean;
  label?: string;
  bottomOffset?: number;
  align?: 'left' | 'right';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const GRADIENT = ['#3B82F6', '#1D4ED8'] as const;

export function FAB({
  icon,
  onPress,
  extended = false,
  label,
  bottomOffset,
  align = 'right',
  disabled = false,
  style,
  testID,
  accessibilityLabel,
}: FABProps) {
  const insets = useSafeAreaInsets();
  const bottom = bottomOffset ?? insets.bottom + 84;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom },
        align === 'right' ? styles.right : styles.left,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? icon}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          extended ? styles.extended : styles.standard,
          Shadows.glow,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.content, extended && styles.contentExtended]}>
          <Feather name={icon} size={extended ? 18 : 24} color="#FFFFFF" strokeWidth={2.6} />
          {extended && label ? <Text style={styles.label}>{label}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 10,
  },
  right: { right: Spacing.lg },
  left:  { left: Spacing.lg },

  base: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  standard: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
  },
  extended: {
    height: 52,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.full,
    minWidth: 180,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  contentExtended: {
    paddingHorizontal: Spacing.xs,
  },
  label: {
    ...Typography.bodyLg,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
});

export default FAB;
