/**
 * SafePay · PayScreen · app/(app)/transactions/pay.tsx
 *
 * Pantalla de pago entre el CTA y el checkout de Mercado Pago.
 *
 *   1. Mount → POST /payments/initiate con txId o slug → recibe checkoutUrl + paymentId
 *   2. checkoutUrl string → WebView con checkout real
 *   3. checkoutUrl null   → UI de pago simulado (modo dev) con Simular éxito / falla
 *
 * Acepta params: txId (desde app autenticada) o slug (desde deep link público).
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { ActionButton } from '@/components/ActionButton';
import { EmptyState } from '@/components/chrome/EmptyState';
import { useToast } from '@/components/chrome/Toast';

import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { formatCLP } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface InitiateResponse {
  checkoutUrl: string | null;
  paymentId: string;
  totalAmount?: number;
  txTitle?: string;
  shortRef?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function PayScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { txId, slug } = useLocalSearchParams<{ txId?: string; slug?: string }>();

  const [data, setData] = useState<InitiateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState<null | 'success' | 'failure'>(null);

  useEffect(() => {
    const body = txId ? { transactionId: txId } : { slug };
    api.post<InitiateResponse>('/payments/initiate', body)
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [txId, slug]);

  const resolvedTxId = txId ?? data?.paymentId;

  const onPaymentSuccess = async () => {
    if (data?.paymentId && data.checkoutUrl === null) {
      try {
        await api.post(`/payments/dev-confirm/${data.paymentId}`);
      } catch { /* no existe en prod */ }
    }
    if (resolvedTxId) {
      queryClient.invalidateQueries({ queryKey: ['transaction', resolvedTxId] });
    }
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast.success('Pago confirmado', 'Tu dinero quedó retenido en SafePay.');
    if (resolvedTxId) {
      router.replace(`/transactions/${resolvedTxId}` as never);
    } else {
      router.replace('/(app)' as never);
    }
  };

  const onPaymentFailure = () => {
    toast.error('Pago no completado', 'No se descontó nada. Podés intentarlo de nuevo.');
    router.back();
  };

  const handleWebViewNav = (e: WebViewNavigation) => {
    const url = e.url;
    if (
      url.includes('safepay.cl/return/success') ||
      url.includes('/success') ||
      url.includes('status=approved')
    ) {
      void onPaymentSuccess();
    } else if (
      url.includes('safepay.cl/return/failure') ||
      url.includes('/failure') ||
      url.includes('status=rejected') ||
      url.includes('status=cancelled')
    ) {
      onPaymentFailure();
    }
  };

  const onSimulate = async (outcome: 'success' | 'failure') => {
    setSubmitting(outcome);
    try {
      if (outcome === 'success') await onPaymentSuccess();
      else onPaymentFailure();
    } finally {
      setSubmitting(null);
    }
  };

  // ── Error ──
  if (error) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" subtitle="Pago" title="Error" onBack={() => router.back()} />
        <EmptyState
          tone="danger"
          icon="alert-circle"
          title="No pudimos iniciar el pago"
          body="Verificá tu conexión y reintentá. Si persiste, contactá a soporte."
          action={{ label: 'Volver', icon: 'arrow-left', onPress: () => router.back() }}
        />
      </ScreenContainer>
    );
  }

  // ── Loading ──
  if (isLoading || !data) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" subtitle="Pago" title="Procesando" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Conectando con Mercado Pago…</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ── Modo simulado (dev) ──
  if (data.checkoutUrl === null) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader
          variant="back"
          subtitle="Pago"
          title="Procesando"
          onBack={() => router.back()}
        />

        <View style={styles.simWrap}>
          <View style={styles.devBanner}>
            <Feather name="alert-triangle" size={14} color="#FCD34D" />
            <Text style={styles.devBannerText}>Modo desarrollo · pago simulado</Text>
          </View>

          {data.totalAmount != null && (
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>Total a pagar</Text>
              <Text style={styles.amountVal}>{formatCLP(data.totalAmount)}</Text>
              {(data.txTitle || data.shortRef) && (
                <Text style={styles.amountTx}>
                  {[data.txTitle, data.shortRef ? `#${data.shortRef}` : null].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          )}

          <View style={styles.simActions}>
            <Text style={styles.simLabel}>Simular resultado</Text>
            <ActionButton
              variant="primary"
              label="Simular pago exitoso"
              fullWidth
              loading={submitting === 'success'}
              disabled={submitting !== null}
              onPress={() => void onSimulate('success')}
              leftIcon={<Feather name="check" size={16} color={Colors.textOnPrimary} />}
            />
            <View style={{ height: Spacing.sm }} />
            <ActionButton
              variant="danger"
              label="Simular pago fallido"
              fullWidth
              loading={submitting === 'failure'}
              disabled={submitting !== null}
              onPress={() => void onSimulate('failure')}
              leftIcon={<Feather name="x" size={16} color={Colors.textOnPrimary} />}
            />
          </View>

          <View style={styles.note}>
            <Text style={styles.noteTitle}>¿Por qué pago simulado?</Text>
            <Text style={styles.noteBody}>
              En modo dev el backend devuelve checkoutUrl: null.
              En producción acá se monta una WebView con el checkout real de Mercado Pago.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ── Modo real · WebView de Mercado Pago ──
  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="back"
        subtitle="Pago"
        title="Mercado Pago"
        onBack={onPaymentFailure}
      />
      <WebView
        source={{ uri: data.checkoutUrl }}
        onNavigationStateChange={handleWebViewNav}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        style={styles.webview}
      />
    </ScreenContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  simWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  devBannerText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: '#FCD34D',
  },

  amountBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  amountLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  amountVal: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  amountTx: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  simActions: {
    marginTop: Spacing.md,
  },
  simLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  note: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
  },
  noteTitle: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  noteBody: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  webview: { flex: 1, backgroundColor: Colors.background },
});
