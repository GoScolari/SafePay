/**
 * SafePay · Theme tokens · typography, spacing, radii, shadows
 *
 * Fase 1 · v2.0 · mayo 2026
 * Target · React Native + Expo SDK 54
 *
 * Acá NO viven colores — esos están en `colors.ts`.
 *
 * Uso:
 *   import { Typography, Spacing, Radii, Shadows } from '@/constants/theme';
 *
 *   const styles = StyleSheet.create({
 *     card: {
 *       padding: Spacing.lg,
 *       borderRadius: Radii.xl,
 *       ...Shadows.card,
 *     },
 *     title: Typography.h2,
 *   });
 */

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// ────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
//
// System font: SF Pro (iOS) / Roboto (Android). `fontFamily: undefined` en
// RN usa la system font del SO. Cada entrada es spreadable en un TextStyle:
//   <Text style={[Typography.h1, { color: Colors.textPrimary }]} />
// ────────────────────────────────────────────────────────────────────────────

const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const Typography = {
  /** Montos hero · pantalla de pago, total a pagar */
  displayLg: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  /** Título principal de pantalla */
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  /** Sección destacada, título de detalle */
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  /** Card title, subsección */
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  /** Body destacado, primer párrafo */
  bodyLg: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
  },
  /** Body default */
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  /** Body secundario, meta, hints */
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  /** Caption · contexto, microcopy */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  /** Label uppercase · sección headers tipo "MONTO RETENIDO" */
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  /** Monospace · tracking codes, RUT, IDs de transacción */
  mono: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: monoFamily,
  },
} as const satisfies Record<string, TextStyle>;

// ────────────────────────────────────────────────────────────────────────────
// SPACING · escala 4pt
// ────────────────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

// ────────────────────────────────────────────────────────────────────────────
// RADII
// ────────────────────────────────────────────────────────────────────────────

export const Radii = {
  /** Chips compactos, tags pequeños */
  sm: 6,
  /** Inputs, dropdowns */
  md: 12,
  /** Botones */
  lg: 16,
  /** Cards, sheets */
  xl: 20,
  /** Pills, badges, dots, FAB */
  full: 9999,
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SHADOWS · React Native (shadow* iOS + elevation Android)
//
// Spread directo en un ViewStyle:
//   <View style={[styles.card, Shadows.card]} />
//
// Recordá que Android `elevation` ignora shadowColor en versiones <28.
// Para tintar la sombra (caso `glow`), iOS la mostrará coloreada; Android
// queda con sombra neutra pero misma profundidad visual.
// ────────────────────────────────────────────────────────────────────────────

type Shadow = Pick<ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const Shadows = {
  /** Sombra sutil · TransactionCard, items elevados de lista */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 4,
  },
  /** Sombra fuerte · modales, FAB, bottom sheets */
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 12,
  },
  /** Glow azul · botón primary destacado, CTA principal */
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 8,
  },
} as const satisfies Record<string, Shadow>;

// ────────────────────────────────────────────────────────────────────────────
// EXPORT consolidado (opcional, para imports más limpios)
// ────────────────────────────────────────────────────────────────────────────

export const Theme = {
  typography: Typography,
  spacing: Spacing,
  radii: Radii,
  shadows: Shadows,
} as const;

export type TypographyToken = keyof typeof Typography;
export type SpacingToken = keyof typeof Spacing;
export type RadiiToken = keyof typeof Radii;
export type ShadowToken = keyof typeof Shadows;

export default Theme;
