/**
 * SafePay · Paleta de colores · dark theme
 *
 * Fase 1 · v2.0 · mayo 2026
 * Target · React Native + Expo SDK 54
 *
 * Acá vive SOLO la paleta. Typography, spacing, radii y shadows
 * viven en `theme.ts`.
 *
 * Uso:
 *   import { Colors } from '@/constants/colors';
 *   backgroundColor: Colors.surface
 *   colors: Colors.primaryGradient   // tupla para <LinearGradient />
 *
 * Para badges de los 10 estados de transacción, usar `StatusTones`
 * (no los colores semánticos success/warning/danger).
 */

export const Colors = {
  // ── Surfaces ────────────────────────────────────────────────────────
  /** Fondo principal de la app · root */
  background:       '#07091A',
  /** Cards y contenedores sobre background */
  surface:          '#131A30',
  /** Cards destacadas · modales, FAB, hero */
  surfaceElevated:  '#1B2340',
  /** Backdrop detrás de modales / sheets */
  overlay:          'rgba(3, 5, 12, 0.72)',

  // ── Brand ───────────────────────────────────────────────────────────
  /** Azul principal · botones, links, énfasis */
  primary:          '#2563EB',
  /** Tupla para `<LinearGradient colors={Colors.primaryGradient} />` */
  primaryGradient:  ['#3B82F6', '#1D4ED8'] as const,
  /** Azul tenue · fondos sutiles, chips, banners brand */
  primaryMuted:     'rgba(37, 99, 235, 0.18)',

  // ── Semantic (feedback global · NO usar para badges de tx) ──────────
  /** Verde · confirmaciones, OK, pago liberado */
  success:          '#10B981',
  successMuted:     'rgba(16, 185, 129, 0.18)',
  /** Ámbar · atención pendiente, plazos por vencer */
  warning:          '#F59E0B',
  warningMuted:     'rgba(245, 158, 11, 0.18)',
  /** Rojo · errores, disputas, acciones destructivas */
  danger:           '#EF4444',
  dangerMuted:      'rgba(239, 68, 68, 0.18)',

  // ── Text ────────────────────────────────────────────────────────────
  /** Texto principal · títulos, montos · AAA 18.4:1 sobre background */
  textPrimary:      '#F4F7FF',
  /** Texto secundario · descripciones · AAA 9.1:1 sobre background */
  textSecondary:    '#A5B0CC',
  /** Texto deshabilitado, hints, labels · AA 5.6:1 sobre background */
  textMuted:        '#8390AE',
  /** Texto sobre botones primary · AA 5.05:1 sobre primary */
  textOnPrimary:    '#FFFFFF',

  // ── Lines ───────────────────────────────────────────────────────────
  /** Bordes sutiles · cards, inputs */
  border:           'rgba(255, 255, 255, 0.10)',
  /** Líneas separadoras · listas, secciones */
  divider:          'rgba(255, 255, 255, 0.06)',
} as const;

export type ColorToken = keyof typeof Colors;

/* ────────────────────────────────────────────────────────────────────────
 * StatusTones · paleta para los 10 estados de transacción.
 *
 * Cada tono expone:
 *   tint     · color base (dot, ícono, border de badge)
 *   tintSoft · fondo del badge (alpha 16-22%)
 *   onTint   · texto legible sobre tintSoft
 *
 * Usar SIEMPRE este mapeo para `<StatusBadge status={tx.status} />`.
 * Mantiene los hex de `txStatus.ts` ajustados a contraste AA en dark.
 * ──────────────────────────────────────────────────────────────────────── */

import type { TxStatus } from './txStatus';

export const StatusTones: Record<TxStatus, {
  tint: string;
  tintSoft: string;
  onTint: string;
}> = {
  PROPUESTA:   { tint: '#F59E0B', tintSoft: 'rgba(245, 158, 11, 0.16)', onTint: '#FCD34D' },
  CONFIRMADA:  { tint: '#3B82F6', tintSoft: 'rgba(59, 130, 246, 0.16)', onTint: '#93C5FD' },
  PAGADO:      { tint: '#8B5CF6', tintSoft: 'rgba(139, 92, 246, 0.18)', onTint: '#C4B5FD' },
  EN_TRANSITO: { tint: '#06B6D4', tintSoft: 'rgba(6, 182, 212, 0.16)',  onTint: '#67E8F9' },
  ENTREGADO:   { tint: '#10B981', tintSoft: 'rgba(16, 185, 129, 0.16)', onTint: '#6EE7B7' },
  COMPLETADO:  { tint: '#22C55E', tintSoft: 'rgba(34, 197, 94, 0.16)',  onTint: '#86EFAC' },
  CANCELADO:   { tint: '#64748B', tintSoft: 'rgba(100, 116, 139, 0.18)', onTint: '#CBD5E1' },
  REEMBOLSADO: { tint: '#EF4444', tintSoft: 'rgba(239, 68, 68, 0.16)',  onTint: '#FCA5A5' },
  EN_DISPUTA:  { tint: '#F97316', tintSoft: 'rgba(249, 115, 22, 0.16)', onTint: '#FDBA74' },
  EXPIRADO:    { tint: '#475569', tintSoft: 'rgba(71, 85, 105, 0.22)',  onTint: '#94A3B8' },
} as const;

export default Colors;
