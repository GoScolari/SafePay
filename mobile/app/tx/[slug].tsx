/**
 * SafePay · TxPublicScreen · app/tx/[slug].tsx
 *
 * Deep link público · safepay.cl/tx/:slug. Sin auth requerida.
 *
 * Pantalla que ve el comprador anónimo al hacer click en el link
 * compartido por el vendedor. Muestra resumen del producto, total
 * a pagar con desglose, cómo funciona SafePay, y CTA a checkout.
 *
 * Datos vía GET /transactions/public/:slug.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { ActionButton } from '@/components/ActionButton';
import { EmptyState } from '@/components/chrome/EmptyState';

import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { formatCLP } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface PublicTransaction {
  id: string;
  slug: string;
  title?: string;
  description: string;
  modality: 'shipping' | 'presential';
  amount: number;
  fee: number;
  feePayer: 'buyer' | 'seller' | 'split';
  initiatorRole: 'buyer' | 'seller';
  sellerName?: string;
  initiator?: { fullName: string };
  status: 'PROPUESTA' | 'CONFIRMADA' | 'PAGADO' | 'EXPIRADO' | 'CANCELADO';
  thumbnailUrl?: string | null;
  expiresAt?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function TxPublicScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: tx, isLoading, isError } = useQuery<PublicTransaction>({
    queryKey: ['tx-public', slug],
    queryFn: () => api.get<PublicTransaction>(`/transactions/public/${slug}`).then((r) => r.data),
    enabled: !!slug,
    retry: false,
  });

  if (isError || (!isLoading && !tx)) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" title="safepay.cl" onBack={() => router.replace('/(auth)/welcome' as never)} />
        <EmptyState
          tone="warning"
          icon="alert-circle"
          title="Link no válido"
          body="La transacción no existe, ya fue pagada, o expiró. Pedile al vendedor que genere un link nuevo."
        />
      </ScreenContainer>
    );
  }

  if (isLoading || !tx) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" title="safepay.cl" onBack={() => router.replace('/(auth)/welcome' as never)} />
      </ScreenContainer>
    );
  }

  const sellerName = tx.sellerName ?? tx.initiator?.fullName ?? '—';
  const totalToBuyer = computeBuyerTotal(tx);
  const txTitle = tx.title ?? tx.description;

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="back"
        title="safepay.cl"
        onBack={() => router.replace('/(auth)/welcome' as never)}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.shield}>
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Feather name="shield" size={26} color="#fff" />
          </View>
          <Text style={styles.tagline}>PAGO PROTEGIDO POR SAFEPAY</Text>
          <Text style={styles.title}>Tenés una transacción pendiente</Text>
          <Text style={styles.subtitle}>
            El vendedor inicia una venta protegida. Tu dinero queda retenido
            hasta que confirmes la entrega.
          </Text>
        </View>

        {/* Product card */}
        <View style={styles.product}>
          <View style={styles.productThumb}>
            <Feather name="image" size={24} color={Colors.textMuted} />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>{txTitle}</Text>
            <Text style={styles.productMeta}>
              Vendedor · <Text style={styles.productMetaStrong}>{sellerName}</Text>
            </Text>
            <Text style={styles.productMeta}>
              Modo · {tx.modality === 'shipping' ? 'Envío por courier' : 'Encuentro presencial'}
            </Text>
          </View>
        </View>

        {/* Total breakdown */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalVal}>{formatCLP(totalToBuyer)}</Text>
          <View style={styles.breakdown}>
            <Text style={styles.breakdownText}>Producto · {formatCLP(tx.amount)}</Text>
            {totalToBuyer > tx.amount && (
              <Text style={styles.breakdownText}>
                Servicio · {formatCLP(totalToBuyer - tx.amount)}
              </Text>
            )}
          </View>
        </View>

        {/* Cómo funciona */}
        <Text style={styles.sectionLabel}>Cómo funciona</Text>
        <View style={styles.howList}>
          <HowRow
            num={1}
            text={
              <>
                <Text style={styles.howStrong}>Pagás vía Mercado Pago.</Text>{' '}
                Tu dinero queda en custodia, no le llega al vendedor todavía.
              </>
            }
          />
          <HowRow
            num={2}
            text={
              tx.modality === 'shipping' ? (
                <>
                  <Text style={styles.howStrong}>Recibís el producto.</Text>{' '}
                  SafePay rastrea el envío con el courier.
                </>
              ) : (
                <>
                  <Text style={styles.howStrong}>Se encuentran en persona.</Text>{' '}
                  Inspeccionás el producto con calma. Sin efectivo.
                </>
              )
            }
          />
          <HowRow
            num={3}
            text={
              <>
                <Text style={styles.howStrong}>Confirmás la recepción.</Text>{' '}
                Recién ahí liberamos el pago al vendedor.
              </>
            }
          />
        </View>
      </ScrollView>

      {/* Bottom fixed bar */}
      <View style={styles.bottomBar}>
        <ActionButton
          label="Pagar con Mercado Pago"
          fullWidth
          onPress={() => router.push(`/transactions/pay?slug=${tx.slug}` as never)}
          rightIcon={<Feather name="arrow-right" size={16} color={Colors.textOnPrimary} />}
        />
        <Text style={styles.disclaimer}>
          Al pagar aceptás los términos de SafePay y la política de retención.
        </Text>
      </View>
    </ScreenContainer>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeBuyerTotal(tx: PublicTransaction): number {
  if (tx.feePayer === 'buyer')  return tx.amount + tx.fee;
  if (tx.feePayer === 'split')  return tx.amount + Math.ceil(tx.fee / 2);
  return tx.amount;
}

function HowRow({ num, text }: { num: number; text: React.ReactNode }) {
  return (
    <View style={styles.howRow}>
      <View style={styles.howNum}>
        <Text style={styles.howNumText}>{num}</Text>
      </View>
      <Text style={styles.howText}>{text}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 180,
  },

  hero: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  shield: {
    width: 56, height: 56,
    borderRadius: Radii.lg,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.glow,
  },
  tagline: {
    ...Typography.label,
    fontSize: 10,
    color: '#93C5FD',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h2,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySm,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    paddingHorizontal: Spacing.md,
  },

  product: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  productThumb: {
    width: 56, height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  productInfo: { flex: 1, minWidth: 0 },
  productTitle: {
    ...Typography.h3,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  productMeta: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  productMetaStrong: { color: Colors.textPrimary, fontWeight: '600' },

  totalCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xs,
  },
  totalLabel: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textMuted,
  },
  totalVal: {
    ...Typography.displayLg,
    fontSize: 30,
    lineHeight: 34,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  breakdownText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  sectionLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  howList: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  howRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  howNum: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  howNumText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  howText: {
    ...Typography.bodySm,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingTop: 2,
    flex: 1,
  },
  howStrong: { color: Colors.textPrimary, fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: Spacing.xs,
  },
  disclaimer: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
});
