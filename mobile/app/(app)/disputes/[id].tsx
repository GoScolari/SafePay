import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useDispute, DisputeReason, DisputeStatus, DisputeResolution } from '@/hooks/useDispute';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/lib/utils';

const REASON_LABEL: Record<DisputeReason, string> = {
  not_received:     'No lo recibí',
  not_as_described: 'No es como se describía',
  damaged:          'Llegó dañado',
  incomplete:       'Incompleto',
  other:            'Otro motivo',
};

const STATUS_LABEL: Record<DisputeStatus, string> = {
  open:      'Abierta',
  responded: 'Respondida',
  resolved:  'Resuelta',
};

const STATUS_COLOR: Record<DisputeStatus, string> = {
  open:      '#F97316',
  responded: '#2563EB',
  resolved:  '#16A34A',
};

const RESOLUTION_LABEL: Record<DisputeResolution, string> = {
  buyer:  'A favor del comprador',
  seller: 'A favor del vendedor',
  split:  'Resolución dividida',
};

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const { dispute, isLoading, isError, refetch, respond, responding } = useDispute(id ?? '');

  const [showReply, setShowReply] = useState(false);
  const [response, setResponse]   = useState('');

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (isError || !dispute) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la disputa.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[dispute.status];
  const isVendorResponder = dispute.openedById !== userId;
  const canRespond = isVendorResponder && dispute.status === 'open';

  const handleRespond = () => {
    if (response.trim().length < 10) {
      Alert.alert('Respuesta muy corta', 'Escribí al menos 10 caracteres.');
      return;
    }
    respond(response.trim(), {
      onSuccess: () => { setShowReply(false); setResponse(''); },
      onError:   () => Alert.alert('Error', 'No se pudo enviar la respuesta.'),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disputa</Text>
        <View style={{ minWidth: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Estado */}
        <View style={[styles.statusBanner, { borderLeftColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[dispute.status]}</Text>
        </View>

        {/* Razón y descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivo del reclamo</Text>
          <Text style={styles.reasonText}>{REASON_LABEL[dispute.reason]}</Text>
          {dispute.description ? (
            <>
              <Text style={styles.fieldLabel}>Descripción del comprador</Text>
              <Text style={styles.bodyText}>{dispute.description}</Text>
            </>
          ) : null}
        </View>

        {/* Plazos */}
        {dispute.status === 'open' && (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineText}>
              ⏰ El vendedor debe responder antes del {formatDate(dispute.respondBefore)}
            </Text>
          </View>
        )}

        {/* Respuesta del vendedor */}
        {dispute.vendorResponse ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Respuesta del vendedor</Text>
            <Text style={styles.bodyText}>{dispute.vendorResponse}</Text>
          </View>
        ) : null}

        {/* Resolución */}
        {dispute.resolution ? (
          <View style={[styles.section, styles.resolutionSection]}>
            <Text style={styles.sectionTitle}>✅ Resolución</Text>
            <Text style={styles.resolutionLabel}>{RESOLUTION_LABEL[dispute.resolution]}</Text>
            {dispute.resolutionNote ? (
              <Text style={styles.bodyText}>{dispute.resolutionNote}</Text>
            ) : null}
            {dispute.resolvedAt ? (
              <Text style={styles.fieldLabel}>{formatDate(dispute.resolvedAt)}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Responder (vendedor, estado open) */}
        {canRespond && !showReply && (
          <TouchableOpacity style={styles.respondBtn} onPress={() => setShowReply(true)}>
            <Text style={styles.respondBtnText}>Responder a la disputa</Text>
          </TouchableOpacity>
        )}

        {canRespond && showReply && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu respuesta</Text>
            <TextInput
              style={styles.textarea}
              value={response}
              onChangeText={setResponse}
              placeholder="Explicá tu posición (mínimo 10 caracteres)…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{response.length}/2000</Text>
            <View style={styles.replyActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReply(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, responding && styles.submitBtnDisabled]}
                onPress={handleRespond}
                disabled={responding}
              >
                {responding
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitBtnText}>Enviar respuesta</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText:         { color: Colors.textSecondary, fontSize: 15 },
  retryBtn:          { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:         { color: '#fff', fontWeight: '600' },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:           { minWidth: 32 },
  backText:          { fontSize: 22, color: Colors.primary },
  headerTitle:       { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content:           { padding: 16, gap: 4, paddingBottom: 32 },
  statusBanner:      { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 4, marginBottom: 10 },
  statusDot:         { width: 10, height: 10, borderRadius: 5 },
  statusText:        { fontSize: 15, fontWeight: '700' },
  section:           { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  reasonText:        { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  fieldLabel:        { fontSize: 12, color: Colors.textMuted, marginTop: 10, marginBottom: 4 },
  bodyText:          { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  deadlineBox:       { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 10 },
  deadlineText:      { fontSize: 12, color: '#92400E' },
  resolutionSection: { borderWidth: 1.5, borderColor: '#16A34A' },
  resolutionLabel:   { fontSize: 15, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  respondBtn:        { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  respondBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  textarea:          { backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, color: Colors.textPrimary, minHeight: 120 },
  charCount:         { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  replyActions:      { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn:         { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:     { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  submitBtn:         { flex: 2, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
});
