import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransaction } from '@/hooks/useTransaction';
import { StatusStepper } from '@/components/StatusStepper';
import { ActionButton } from '@/components/ActionButton';
import { Colors } from '@/constants/colors';
import { formatCLP, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { TxStatus } from '@/constants/txStatus';

const MODALITY_LABEL: Record<string, string> = {
  shipping:   '📦 Con envío',
  presential: '🤝 Presencial',
};
const FEE_PAYER_LABEL: Record<string, string> = {
  seller: 'La paga el vendedor',
  buyer:  'La paga el comprador',
  split:  'Mitad y mitad',
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId  = useAuthStore((s) => s.user?.id);
  const { tx, isLoading, isError, refetch, accept, accepting, cancel, cancelling, releasePayment, releasing, deliver, delivering, devDeliver, devDelivering, archive, archiving, copyLink } = useTransaction(id);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (isError || !tx) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la transacción.</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isInitiator   = tx.initiatorId === userId;
  const isCounterpart = tx.counterpartId === userId;
  const isSeller = (isInitiator && tx.initiatorRole === 'seller') || (isCounterpart && tx.initiatorRole === 'buyer');
  const isBuyer  = !isSeller;

  const confirmCancel = () =>
    Alert.alert('Cancelar transacción', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancel() },
    ]);

  const confirmRelease = () =>
    Alert.alert('Confirmar recepción', '¿Recibiste el artículo en buenas condiciones? Esto liberará el pago al vendedor.', [
      { text: 'No, esperar', style: 'cancel' },
      { text: 'Sí, liberar pago', onPress: () => {
        const paymentId = tx.payment?.id ?? id;
        releasePayment(paymentId);
      }},
    ]);

  const renderActions = () => {
    const status = tx.status as TxStatus;

    if (status === 'PROPUESTA') {
      if (!isInitiator && !isCounterpart) {
        return <ActionButton label="Aceptar transacción" onPress={() => accept()} loading={accepting} />;
      }
      if (!isInitiator) {
        return (
          <View style={styles.actions}>
            <ActionButton label="Aceptar" onPress={() => accept()} loading={accepting} />
            <ActionButton label="Rechazar" onPress={confirmCancel} loading={cancelling} variant="outline" />
          </View>
        );
      }
      return (
        <View style={styles.actions}>
          <ActionButton label="Copiar link de pago" onPress={async () => { await copyLink(); Alert.alert('Link copiado', 'Compartilo con la otra parte.'); }} variant="outline" />
          <ActionButton label="Cancelar" onPress={confirmCancel} loading={cancelling} variant="danger" />
        </View>
      );
    }

    if (status === 'CONFIRMADA') {
      if (isBuyer) {
        return <ActionButton label="Ir a pagar" onPress={() => router.push(`/(app)/transactions/pay?id=${tx.id}`)} />;
      }
      return (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>⏳ Esperando que el comprador realice el pago</Text>
        </View>
      );
    }

    if (status === 'PAGADO') {
      if (isSeller) {
        if (tx.modality === 'presential') {
          return (
            <View style={styles.actions}>
              <ActionButton
                label="Confirmar entrega presencial"
                onPress={() => Alert.alert(
                  'Confirmar entrega',
                  '¿Confirmás que entregaste el artículo en mano al comprador?',
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, entreguei', onPress: () => deliver() },
                  ],
                )}
                loading={delivering}
              />
              <ActionButton label="Cancelar" onPress={confirmCancel} loading={cancelling} variant="danger" />
            </View>
          );
        }
        return (
          <View style={styles.actions}>
            <ActionButton label="Registrar envío" onPress={() => router.push(`/(app)/transactions/tracking?txId=${tx.id}`)} />
            <ActionButton label="Cancelar" onPress={confirmCancel} loading={cancelling} variant="danger" />
          </View>
        );
      }
      return <ActionButton label="Cancelar" onPress={confirmCancel} loading={cancelling} variant="danger" />;
    }

    if (status === 'EN_TRANSITO') {
      return (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push(`/(app)/transactions/tracking?txId=${tx.id}`)} style={styles.infoBox}>
            <Text style={styles.infoText}>📦 Ver estado del envío</Text>
          </TouchableOpacity>
          {isSeller && tx.modality !== 'presential' && (
            <ActionButton label="🧪 Simular entrega" onPress={() => devDeliver()} loading={devDelivering} variant="outline" />
          )}
        </View>
      );
    }

    if (status === 'ENTREGADO') {
      if (isBuyer) {
        return (
          <View style={styles.actions}>
            <ActionButton label="Confirmar conforme" onPress={confirmRelease} loading={releasing} />
            <ActionButton label="Abrir disputa" onPress={() => router.push(`/(app)/disputes/new?txId=${tx.id}`)} variant="outline" />
          </View>
        );
      }
      return (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>⏳ Esperando que el comprador confirme la recepción</Text>
        </View>
      );
    }

    if (status === 'COMPLETADO' || status === 'CANCELADO' || status === 'EXPIRADO' || status === 'REEMBOLSADO') {
      return (
        <ActionButton
          label="Archivar"
          onPress={() => Alert.alert('Archivar transacción', 'Esta transacción dejará de aparecer en tu lista.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Archivar', onPress: () => archive() },
          ])}
          loading={archiving}
          variant="outline"
        />
      );
    }

    if (status === 'EN_DISPUTA') {
      const disputeId = (tx as any).dispute?.id;
      return (
        <ActionButton
          label="Ver disputa"
          onPress={() => router.push(disputeId ? `/(app)/disputes/${disputeId}` : `/(app)/disputes/${id}`)}
          variant="outline"
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transacción</Text>
        <TouchableOpacity onPress={async () => { await copyLink(); Alert.alert('Link copiado'); }}>
          <Text style={styles.slugText}>#{tx.slug.slice(-8)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Estado */}
        <View style={styles.section}>
          <StatusStepper status={tx.status as TxStatus} modality={tx.modality} />
        </View>

        {/* Info principal */}
        <View style={styles.section}>
          <Text style={styles.description}>{tx.description}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatCLP(tx.amount)}</Text>
            <Text style={styles.fee}>+ {formatCLP(tx.fee)} comisión</Text>
          </View>
        </View>

        {/* Detalles */}
        <View style={styles.section}>
          <DetailRow label="Modalidad" value={MODALITY_LABEL[tx.modality] ?? tx.modality} />
          <DetailRow label="Comisión" value={FEE_PAYER_LABEL[tx.feePayer] ?? tx.feePayer} />
          <DetailRow label="Tu rol" value={isSeller ? '🏷️ Vendedor' : '🛒 Comprador'} />
          {tx.counterpartId && (
            <DetailRow
              label={isSeller ? 'Comprador' : 'Vendedor'}
              value={isInitiator ? (tx.counterpart?.fullName ?? '—') : (tx.initiator?.fullName ?? '—')}
            />
          )}
          <DetailRow label="Creada" value={formatDate(tx.createdAt)} />
          {tx.expiresAt && tx.status === 'PROPUESTA' && (
            <DetailRow label="Expira" value={formatDate(tx.expiresAt)} />
          )}
        </View>
      </ScrollView>

      {/* Acciones */}
      <View style={styles.footer}>
        {renderActions()}
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
  container:   { flex: 1, backgroundColor: Colors.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText:   { color: Colors.textSecondary, fontSize: 15 },
  retryBtn:    { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:   { color: '#fff', fontWeight: '600' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:     { minWidth: 32 },
  backText:    { fontSize: 22, color: Colors.primary },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  slugText:    { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  content:     { padding: 16, gap: 4, paddingBottom: 24 },
  section:     { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
  description: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  amountRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amount:      { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  fee:         { fontSize: 13, color: Colors.textMuted },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontSize: 13, color: Colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  footer:      { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  actions:     { gap: 10 },
  infoBox:     { backgroundColor: Colors.primary + '10', borderRadius: 10, padding: 14, alignItems: 'center' },
  infoText:    { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
