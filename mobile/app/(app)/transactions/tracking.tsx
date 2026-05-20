import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { ActionButton } from '@/components/ActionButton';
import { EmptyState } from '@/components/chrome/EmptyState';

import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { formatDate } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Courier = 'chilexpress' | 'bluexpress';
type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'failed' | 'lost';

interface ShipmentStatusResponse {
  courier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  rawStatus: string | null;
  lastCheckedAt: string | null;
  deliveredAt: string | null;
}

const COURIER_LABEL: Record<Courier, string> = {
  chilexpress: 'Chilexpress',
  bluexpress:  'BlueExpress',
};

const STATUS_META: Record<ShipmentStatus, { label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string; bg: string }> = {
  pending:    { label: 'Pendiente de despacho', icon: 'clock',        color: Colors.textMuted, bg: 'rgba(131,144,174,0.12)' },
  in_transit: { label: 'En camino',             icon: 'truck',        color: '#3B82F6',        bg: 'rgba(37,99,235,0.12)'   },
  delivered:  { label: 'Entregado',             icon: 'check-circle', color: Colors.success,   bg: 'rgba(16,185,129,0.12)'  },
  failed:     { label: 'Error en el envío',     icon: 'alert-circle', color: Colors.danger,    bg: 'rgba(239,68,68,0.12)'   },
  lost:       { label: 'Paquete perdido',       icon: 'alert-circle', color: Colors.danger,    bg: 'rgba(239,68,68,0.12)'   },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useRelativeTime(date: Date | null) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!date) { setLabel(''); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60)        setLabel('Actualizado hace unos segundos');
      else if (diff < 3600) setLabel(`Actualizado hace ${Math.floor(diff / 60)} min`);
      else                  setLabel(`Actualizado hace ${Math.floor(diff / 3600)} h`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function TrackingScreen() {
  const router = useRouter();
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const queryClient = useQueryClient();

  const [courier, setCourier] = useState<Courier>('chilexpress');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const relativeTime = useRelativeTime(lastUpdated);

  const { data: shipment, isLoading, isError, refetch } = useQuery<ShipmentStatusResponse | null>({
    queryKey: ['shipping', txId],
    queryFn: async () => {
      try {
        const r = await api.get<ShipmentStatusResponse>(`/shipping/${txId}/status`);
        return r.data;
      } catch (e: any) {
        // 404 = aún no hay tracking registrado → mostrar formulario
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: !!txId,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && (query.state.data as ShipmentStatusResponse).status !== 'delivered'
        ? 60_000
        : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (shipment) setLastUpdated(new Date());
  }, [shipment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () => api.post('/shipping/track', { transactionId: txId, courier, trackingNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', txId] });
      queryClient.invalidateQueries({ queryKey: ['transaction', txId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => Alert.alert('Error', 'No se pudo registrar el envío. Verificá los datos.'),
  });

  const { mutate: devDeliver, isPending: devDelivering } = useMutation({
    mutationFn: () => api.post(`/shipping/dev-deliver/${txId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', txId] });
      queryClient.invalidateQueries({ queryKey: ['transaction', txId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => Alert.alert('Error', 'No se pudo simular la entrega.'),
  });

  const handleRegister = () => {
    if (trackingNumber.trim().length === 0) {
      Alert.alert('Número requerido', 'Ingresá el número de tracking del paquete.');
      return;
    }
    register();
  };

  // ── Error ──
  if (isError) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" subtitle="Envío" title="Tracking" onBack={() => router.back()} />
        <EmptyState
          tone="danger"
          icon="wifi-off"
          title="No se pudo cargar"
          body="Verificá tu conexión y volvé a intentar."
          action={{ label: 'Reintentar', icon: 'refresh-cw', onPress: () => void refetch() }}
        />
      </ScreenContainer>
    );
  }

  // ── Envío ya registrado → mostrar estado ──
  if (!isLoading && shipment) {
    const meta = STATUS_META[shipment.status];
    return (
      <ScreenContainer padding={false} edges={['top']}>
        <AppHeader variant="back" subtitle="Envío" title="Estado del envío" onBack={() => router.back()} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Status hero */}
          <View style={[styles.statusHero, { backgroundColor: meta.bg, borderColor: meta.color + '33' }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: meta.color + '22' }]}>
              <Feather name={meta.icon} size={24} color={meta.color} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
              {shipment.rawStatus ? (
                <Text style={styles.statusRaw}>{shipment.rawStatus}</Text>
              ) : null}
              {relativeTime ? (
                <Text style={styles.statusUpdated}>{relativeTime}</Text>
              ) : null}
            </View>
          </View>

          {/* Detalle */}
          <Text style={styles.sectionLabel}>Detalle del envío</Text>
          <View style={styles.detailCard}>
            <DetailRow
              label="Courier"
              value={COURIER_LABEL[shipment.courier as Courier] ?? shipment.courier}
            />
            <DetailRow
              label="Número de tracking"
              value={shipment.trackingNumber}
              mono
            />
            {shipment.lastCheckedAt ? (
              <DetailRow
                label="Última consulta"
                value={formatDate(shipment.lastCheckedAt)}
              />
            ) : null}
            {shipment.deliveredAt ? (
              <DetailRow
                label="Entregado"
                value={formatDate(shipment.deliveredAt)}
                last
              />
            ) : (
              <DetailRow
                label="Estado"
                value={shipment.status === 'in_transit' ? 'En camino al destino' : STATUS_META[shipment.status].label}
                last
              />
            )}
          </View>

          {shipment.status === 'in_transit' && (
            <>
              <View style={styles.infoCard}>
                <Feather name="info" size={14} color="#93C5FD" />
                <Text style={styles.infoText}>
                  SafePay consulta el estado del envío cada 2 horas. Podés refrescar manualmente con pull-to-refresh.
                </Text>
              </View>
              <ActionButton
                variant="outline"
                label="🧪 Simular entrega"
                fullWidth
                loading={devDelivering}
                onPress={() => devDeliver()}
              />
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Formulario para registrar tracking ──
  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader variant="back" subtitle="Envío" title="Registrar envío" onBack={() => router.back()} />

      {isLoading ? (
        <EmptyState icon="clock" title="Cargando…" compact />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Seleccioná el courier</Text>
          <View style={styles.courierRow}>
            {(['chilexpress', 'bluexpress'] as Courier[]).map((c) => (
              <Pressable
                key={c}
                style={[styles.courierCard, courier === c && styles.courierCardActive]}
                onPress={() => setCourier(c)}
              >
                <View style={[styles.courierIcon, courier === c && styles.courierIconActive]}>
                  <Feather name="truck" size={16} color={courier === c ? '#3B82F6' : Colors.textMuted} />
                </View>
                <Text style={[styles.courierLabel, courier === c && styles.courierLabelActive]}>
                  {COURIER_LABEL[c]}
                </Text>
                {courier === c && (
                  <View style={styles.courierCheck}>
                    <Feather name="check" size={11} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Número de tracking</Text>
          <View style={styles.inputWrap}>
            <Feather name="hash" size={16} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder="Ej: 1234567890"
              placeholderTextColor={Colors.textMuted}
              maxLength={50}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.infoCard}>
            <Feather name="info" size={14} color="#93C5FD" />
            <Text style={styles.infoText}>
              Una vez registrado, SafePay rastrea el estado con {COURIER_LABEL[courier]} automáticamente y notifica al comprador cuando el paquete sea entregado.
            </Text>
          </View>

          <View style={styles.btnWrap}>
            <ActionButton
              label="Registrar envío"
              fullWidth
              loading={registering}
              onPress={handleRegister}
              rightIcon={<Feather name="truck" size={16} color="#fff" />}
            />
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.rowValueMono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 60,
  },

  statusHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statusIconWrap: {
    width: 48, height: 48,
    borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
  },
  statusTextWrap: { flex: 1 },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  statusRaw: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusUpdated: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },

  sectionLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },

  detailCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    ...Typography.bodySm,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rowValue: {
    ...Typography.bodySm,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  rowValueMono: {
    fontFamily: 'Menlo',
    fontSize: 12,
  },

  infoCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.20)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },

  courierRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  courierCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  courierCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  courierIcon: {
    width: 36, height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  courierIconActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  courierLabel: {
    ...Typography.bodySm,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  courierLabelActive: {
    color: '#3B82F6',
  },
  courierCheck: {
    position: 'absolute',
    top: 8, right: 8,
    width: 16, height: 16,
    borderRadius: Radii.full,
    backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  btnWrap: {
    marginTop: Spacing.md,
  },
});
