/**
 * SafePay · EmptyState
 *
 * Estado vacío reutilizable. Ícono + título + body + CTA opcional.
 *
 * Tres tonos disponibles para el ícono:
 *   primary  → azul brand (default). Para empty states neutros / oportunidad.
 *   warning  → ámbar. Para hints de pendiente o atención sin error.
 *   danger   → rojo. Para errores de carga, sin conexión, fallos.
 *
 * Uso:
 *   <EmptyState
 *     icon="shield"
 *     title="Sin transacciones aún"
 *     body="Creá tu primera transacción para empezar a vender o comprar."
 *     action={{ label: 'Crear transacción', onPress: () => router.push('/transactions/new') }}
 *   />
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';

export type EmptyStateTone = 'primary' | 'warning' | 'danger';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  body?: string;
  action?: EmptyStateAction;
  tone?: EmptyStateTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONE_CONFIG: Record<EmptyStateTone, { bg: string; border: string; color: string }> = {
  primary: { bg: Colors.primaryMuted,  border: 'rgba(59, 130, 246, 0.30)',  color: '#3B82F6' },
  warning: { bg: Colors.warningMuted,  border: 'rgba(245, 158, 11, 0.30)', color: '#FCD34D' },
  danger:  { bg: Colors.dangerMuted,   border: 'rgba(239, 68, 68, 0.30)',  color: '#FCA5A5' },
};

const PRIMARY_GRADIENT = ['#3B82F6', '#1D4ED8'] as const;

export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = 'primary',
  compact = false,
  style,
  testID,
}: EmptyStateProps) {
  const t = TONE_CONFIG[tone];

  return (
    <View style={[styles.root, compact && styles.compact, style]} testID={testID}>
      <View
        style={[
          styles.iconWrap,
          compact ? styles.iconWrapCompact : styles.iconWrapLg,
          { backgroundColor: t.bg, borderColor: t.border },
        ]}
      >
        <Feather name={icon} size={compact ? 28 : 40} color={t.color} />
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
        {title}
      </Text>

      {body ? (
        <Text style={[styles.body, compact && styles.bodyCompact]} numberOfLines={3}>
          {body}
        </Text>
      ) : null}

      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.cta,
            compact && styles.ctaCompact,
            Shadows.glow,
            pressed && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.ctaContent}>
            {action.icon ? (
              <Feather name={action.icon} size={16} color={Colors.textOnPrimary} />
            ) : null}
            <Text style={styles.ctaLabel}>{action.label}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compact: {
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },

  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  iconWrapLg: {
    width: 88,
    height: 88,
    borderRadius: 28,
  },
  iconWrapCompact: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },

  title: {
    ...Typography.h3,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 20,
  },

  body: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 18,
  },

  cta: {
    marginTop: Spacing.lg,
    height: 48,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaCompact: {
    marginTop: Spacing.sm,
    height: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaLabel: {
    ...Typography.bodyLg,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});

export default EmptyState;
