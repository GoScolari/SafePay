import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction } from '@/stores/transaction.store';
import { Colors } from '@/constants/colors';
import { formatCLP } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const FEE_PAYER_LABEL: Record<string, string> = {
  buyer:  'La paga el comprador',
  seller: 'La paga el vendedor',
  split:  'Mitad y mitad',
};

export default function TxPublicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [initiating, setInitiating]   = useState(false);

  const { data: tx, isLoading, isError } = useQuery<Transaction>({
    queryKey: ['tx-public', slug],
    queryFn: () => api.get<Transaction>(`/transactions/public/${slug}`).then((r) => r.data),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.hint}>Cargando transacción…</Text>
      </View>
    );
  }

  if (isError || !tx) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>🔍</Text>
        <Text style={styles.errorTitle}>Transacción no encontrada</Text>
        <Text style={styles.errorSub}>El link puede estar expirado o ser incorrecto.</Text>
      </View>
    );
  }

  if (tx.status !== 'CONFIRMADA') {
    const STATUS_MSG: Record<string, { emoji: string; msg: string }> = {
      PROPUESTA:   { emoji: '⏳', msg: 'Esta transacción aún no fue aceptada por ambas partes.' },
      PAGADO:      { emoji: '💰', msg: 'Esta transacción ya fue pagada.' },
      EN_TRANSITO: { emoji: '📦', msg: 'El artículo está en camino.' },
      ENTREGADO:   { emoji: '🏠', msg: 'El artículo fue entregado.' },
      COMPLETADO:  { emoji: '🎉', msg: 'Esta transacción fue completada.' },
      CANCELADO:   { emoji: '✖️', msg: 'Esta transacción fue cancelada.' },
      EN_DISPUTA:  { emoji: '⚠️', msg: 'Esta transacción está en disputa.' },
      REEMBOLSADO: { emoji: '↩️', msg: 'Esta transacción fue reembolsada.' },
      EXPIRADO:    { emoji: '⏰', msg: 'Esta transacción expiró.' },
    };
    const info = STATUS_MSG[tx.status] ?? { emoji: '❓', msg: 'Estado desconocido.' };
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>{info.emoji}</Text>
        <Text style={styles.errorSub}>{info.msg}</Text>
      </View>
    );
  }

  const handlePay = async () => {
    setInitiating(true);
    try {
      const r = await api.post<{ checkoutUrl: string | null; paymentId: string }>(
        '/payments/initiate',
        { transactionId: tx.id },
      );
      if (r.data.checkoutUrl) {
        setCheckoutUrl(r.data.checkoutUrl);
        setShowWebView(true);
      } else {
        // Modo dev — simular
        setShowWebView(true);
      }
    } catch {
      // Si no está autenticado el backend rechazará; redirigimos al login
      router.push(`/(auth)/login` as never);
    } finally {
      setInitiating(false);
    }
  };

  const handleWebViewNav = (url: string) => {
    if (url.includes('safepay://') || url.includes('/success') || url.includes('status=approved')) {
      setShowWebView(false);
      if (!isAuthenticated) {
        router.replace('/(auth)/register' as never);
      } else {
        router.replace(`/(app)/transactions/${tx.id}` as never);
      }
    } else if (url.includes('/failure') || url.includes('status=rejected') || url.includes('status=cancelled')) {
      setShowWebView(false);
    }
  };

  if (showWebView) {
    return (
      <SafeAreaView style={styles.fullScreen} edges={['top']}>
        <View style={styles.wvHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.backBtn}>
            <Text style={styles.backText}>✖</Text>
          </TouchableOpacity>
          <Text style={styles.wvTitle}>Pago seguro</Text>
          <View style={{ minWidth: 32 }} />
        </View>
        {checkoutUrl ? (
          <WebView
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={(s) => handleWebViewNav(s.url)}
            startInLoadingState
            renderLoading={() => <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>🧪</Text>
            <Text style={styles.errorTitle}>Modo desarrollo</Text>
            <Text style={styles.errorSub}>Mercado Pago no está configurado.</Text>
            <TouchableOpacity style={[styles.payBtn, { marginTop: 24 }]} onPress={() => handleWebViewNav('/success')}>
              <Text style={styles.payBtnText}>✅ Simular pago exitoso</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const buyerTotal = tx.feePayer === 'buyer' ? tx.amount + tx.fee
    : tx.feePayer === 'split' ? tx.amount + Math.ceil(tx.fee / 2)
    : tx.amount;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <Text style={styles.logo}>SafePay</Text>
          <Text style={styles.logoSub}>Pago en custodia</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.description}>{tx.description}</Text>
          <Text style={styles.amount}>{formatCLP(buyerTotal)}</Text>
          <Text style={styles.amountSub}>Total a pagar (incluye comisión)</Text>
        </View>

        <View style={styles.section}>
          <DetailRow label="Vendedor"   value={tx.initiatorRole === 'seller' ? (tx.initiator?.fullName ?? '—') : (tx.counterpart?.fullName ?? '—')} />
          <DetailRow label="Comisión"   value={`${formatCLP(tx.fee)} — ${FEE_PAYER_LABEL[tx.feePayer]}`} />
          <DetailRow label="Modalidad"  value={tx.modality === 'shipping' ? '📦 Con envío' : '🤝 Presencial'} />
        </View>

        <View style={styles.trustBox}>
          <Text style={styles.trustText}>
            🔒 Tu dinero queda retenido en SafePay hasta que confirmes que recibiste el artículo en buenas condiciones.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, initiating && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={initiating}
        >
          {initiating
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnText}>Pagar con Mercado Pago</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  fullScreen:   { flex: 1, backgroundColor: Colors.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 },
  content:      { padding: 16, paddingBottom: 32, gap: 4 },
  hint:         { color: Colors.textSecondary, marginTop: 8 },
  logoRow:      { alignItems: 'center', paddingVertical: 24 },
  logo:         { fontSize: 28, fontWeight: '800', color: Colors.primary },
  logoSub:      { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  card:         { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, marginBottom: 10 },
  description:  { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  amount:       { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  amountSub:    { fontSize: 12, color: Colors.textMuted },
  section:      { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel:  { fontSize: 13, color: Colors.textSecondary },
  detailValue:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  trustBox:     { backgroundColor: Colors.primary + '0F', borderRadius: 10, padding: 14 },
  trustText:    { fontSize: 12, color: Colors.primary, lineHeight: 18 },
  footer:       { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  payBtn:       { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorEmoji:   { fontSize: 48 },
  errorTitle:   { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  errorSub:     { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  wvHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:      { minWidth: 32 },
  backText:     { fontSize: 20, color: Colors.primary },
  wvTitle:      { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
});
