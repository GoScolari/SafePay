import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/lib/utils';

type Courier = 'chilexpress' | 'bluexpress';
type ShipmentStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

interface ShipmentStatusResponse {
  courier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  rawStatus: string | null;
  lastCheckedAt: string | null;
  deliveredAt: string | null;
}

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  PENDING:    'Pendiente de despacho',
  IN_TRANSIT: 'En camino',
  DELIVERED:  'Entregado',
  FAILED:     'Error en el envío',
};

const STATUS_COLOR: Record<ShipmentStatus, string> = {
  PENDING:    Colors.textMuted,
  IN_TRANSIT: '#2563EB',
  DELIVERED:  '#16A34A',
  FAILED:     Colors.danger,
};

const COURIER_LABEL: Record<Courier, string> = {
  chilexpress: 'Chilexpress',
  bluexpress:  'BlueExpress',
};

function useRelativeTime(date: Date | null) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!date) return;
    const update = () => {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60)       setLabel('Actualizado hace unos segundos');
      else if (diff < 3600) setLabel(`Actualizado hace ${Math.floor(diff / 60)} min`);
      else                  setLabel(`Actualizado hace ${Math.floor(diff / 3600)} h`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}

export default function TrackingScreen() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const queryClient = useQueryClient();

  const [courier, setCourier]             = useState<Courier>('chilexpress');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);
  const [refreshing, setRefreshing]       = useState(false);
  const relativeTime = useRelativeTime(lastUpdated);

  const { data: shipment, isLoading, isError, refetch } = useQuery<ShipmentStatusResponse>({
    queryKey: ['shipping', txId],
    queryFn: () => api.get<ShipmentStatusResponse>(`/shipping/${txId}/status`).then((r) => r.data),
    enabled: !!txId,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && (query.state.data as ShipmentStatusResponse).status !== 'DELIVERED' ? 60_000 : false,
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

  const handleRegister = () => {
    if (trackingNumber.trim().length === 0) {
      Alert.alert('Número requerido', 'Ingresá el número de tracking del paquete.');
      return;
    }
    register();
  };

  // Estado del envío ya registrado
  if (!isLoading && !isError && shipment) {
    const color = STATUS_COLOR[shipment.status];
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estado del envío</Text>
          <View style={{ minWidth: 32 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        >
          <View style={styles.statusCard}>
            <View>
              <Text style={[styles.statusLabel, { color }]}>{STATUS_LABEL[shipment.status]}</Text>
              {relativeTime ? <Text style={styles.updatedAt}>{relativeTime}</Text> : null}
            </View>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
          </View>
          <View style={styles.section}>
            <DetailRow label="Courier"          value={COURIER_LABEL[shipment.courier as Courier] ?? shipment.courier} />
            <DetailRow label="Número de tracking" value={shipment.trackingNumber} />
            {shipment.rawStatus && <DetailRow label="Estado courier" value={shipment.rawStatus} />}
            {shipment.lastCheckedAt && <DetailRow label="Última consulta" value={formatDate(shipment.lastCheckedAt)} />}
            {shipment.deliveredAt && <DetailRow label="Entregado" value={formatDate(shipment.deliveredAt)} />}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Formulario para registrar tracking
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar envío</Text>
        <View style={{ minWidth: 32 }} />
      </View>

      {isLoading
        ? <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
        : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.fieldLabel}>Courier</Text>
            <View style={styles.courierRow}>
              {(['chilexpress', 'bluexpress'] as Courier[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.courierCard, courier === c && styles.courierCardActive]}
                  onPress={() => setCourier(c)}
                >
                  <Text style={[styles.courierText, courier === c && styles.courierTextActive]}>
                    {COURIER_LABEL[c]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Número de tracking</Text>
            <TextInput
              style={styles.input}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder="Ej: 1234567890"
              placeholderTextColor={Colors.textMuted}
              maxLength={50}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.btn, registering && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={registering}
            >
              {registering
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Registrar envío</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        )
      }
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
  container:         { flex: 1, backgroundColor: Colors.background },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:           { minWidth: 32 },
  backText:          { fontSize: 22, color: Colors.primary },
  headerTitle:       { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content:           { padding: 16, gap: 4 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusCard:        { backgroundColor: Colors.surface, borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statusLabel:       { fontSize: 17, fontWeight: '700' },
  updatedAt:         { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  statusDot:         { width: 12, height: 12, borderRadius: 6 },
  section:           { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
  detailRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel:       { fontSize: 13, color: Colors.textSecondary },
  detailValue:       { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  fieldLabel:        { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  courierRow:        { flexDirection: 'row', gap: 12, marginBottom: 4 },
  courierCard:       { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center' },
  courierCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  courierText:       { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  courierTextActive: { color: Colors.primary },
  input:             { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, marginBottom: 4 },
  btn:               { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled:       { opacity: 0.5 },
  btnText:           { color: '#fff', fontSize: 15, fontWeight: '700' },
});
