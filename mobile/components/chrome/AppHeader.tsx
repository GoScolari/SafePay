/**
 * SafePay · AppHeader
 *
 * Header de pantalla con 3 variants:
 *
 *   home      → título grande + avatar a la derecha (sin back). Transparente.
 *   back      → back button + título centrado + acción opcional a la derecha.
 *               Con BlurView de fondo (queda flotando sobre el contenido).
 *   step      → como `back` pero con sub-label arriba del título y badge "1/3" a la derecha.
 *
 * Pensado para usarse DENTRO del componente de pantalla, no como `header`
 * de Expo Router (porque queremos control total del estilo + blur). Para
 * deshabilitar el header default de Expo Router:
 *
 *   <Stack.Screen options={{ headerShown: false }} />
 *
 * Uso:
 *   <AppHeader variant="home" greeting="Hola, Camila" title="Transacciones" avatarLabel="CR" />
 *   <AppHeader variant="back" title="Detalle" onBack={() => router.back()} />
 *   <AppHeader variant="step" title="Nueva transacción" subtitle="Crear" step={{ current: 2, total: 3 }} onBack={...} />
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';

export type AppHeaderVariant = 'home' | 'back' | 'step';

interface BaseProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface HomeHeaderProps extends BaseProps {
  variant: 'home';
  /** Saludo arriba del título · ej "Hola, Camila" */
  greeting?: string;
  title: string;
  /** Iniciales del avatar (ej "CR"). Opcional. */
  avatarLabel?: string;
  onAvatarPress?: () => void;
}

interface BackHeaderProps extends BaseProps {
  variant: 'back';
  title: string;
  /** Sublabel uppercase arriba del título */
  subtitle?: string;
  onBack: () => void;
  /** Ícono de acción a la derecha (ej Feather "share-2") */
  actionIcon?: React.ComponentProps<typeof Feather>['name'];
  onActionPress?: () => void;
}

interface StepHeaderProps extends BaseProps {
  variant: 'step';
  title: string;
  subtitle?: string;
  onBack: () => void;
  step: { current: number; total: number };
}

type AppHeaderProps = HomeHeaderProps | BackHeaderProps | StepHeaderProps;

export function AppHeader(props: AppHeaderProps) {
  if (props.variant === 'home') return <HomeHeader {...props} />;
  if (props.variant === 'step') return <StepHeader {...props} />;
  return <BackHeader {...props} />;
}

// ─── Home variant ──────────────────────────────────────────────────────────

function HomeHeader({ greeting, title, avatarLabel, onAvatarPress, style, testID }: HomeHeaderProps) {
  return (
    <View style={[styles.homeRoot, style]} testID={testID}>
      <View style={styles.homeRow}>
        <View style={styles.flex}>
          {greeting ? <Text style={styles.homeGreeting}>{greeting}</Text> : null}
          <Text style={styles.homeTitle} numberOfLines={1}>{title}</Text>
        </View>
        {avatarLabel ? (
          <Pressable onPress={onAvatarPress} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Back variant ──────────────────────────────────────────────────────────

function BackHeader({ title, subtitle, onBack, actionIcon, onActionPress, style, testID }: BackHeaderProps) {
  return (
    <BlurView intensity={40} tint="dark" style={[styles.barRoot, style]}>
      <View style={styles.barInner} testID={testID}>
        <View style={styles.side}>
          <IconButton icon="chevron-left" onPress={onBack} accessibilityLabel="Volver" />
        </View>
        <View style={styles.center}>
          {subtitle ? <Text style={styles.subLabel}>{subtitle}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.side}>
          {actionIcon ? (
            <IconButton icon={actionIcon} onPress={onActionPress} accessibilityLabel="Acción" />
          ) : null}
        </View>
      </View>
    </BlurView>
  );
}

// ─── Step variant ──────────────────────────────────────────────────────────

function StepHeader({ title, subtitle, onBack, step, style, testID }: StepHeaderProps) {
  return (
    <BlurView intensity={40} tint="dark" style={[styles.barRoot, style]}>
      <View style={styles.barInner} testID={testID}>
        <View style={styles.side}>
          <IconButton icon="chevron-left" onPress={onBack} accessibilityLabel="Volver" />
        </View>
        <View style={styles.center}>
          {subtitle ? <Text style={styles.subLabel}>{subtitle}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.side}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{step.current}/{step.total}</Text>
          </View>
        </View>
      </View>
    </BlurView>
  );
}

// ─── IconButton (interno) ──────────────────────────────────────────────────

function IconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Feather name={icon} size={18} color={Colors.textPrimary} />
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Home variant
  homeRoot: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  homeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  homeGreeting: {
    ...Typography.bodySm,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  homeTitle: {
    ...Typography.h1,
    fontSize: 30,
    lineHeight: 36,
    marginTop: 4,
    color: Colors.textPrimary,
  },
  flex: { flex: 1 },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // Back / step
  barRoot: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  barInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  side: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...Typography.h3,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  subLabel: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.0,
    color: Colors.textMuted,
    marginBottom: 2,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },

  stepBadge: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#93C5FD',
    letterSpacing: 0.3,
  },
});

export default AppHeader;
