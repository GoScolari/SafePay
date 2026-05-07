import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useOpenDispute, DisputeReason } from '@/hooks/useDispute';
import { Colors } from '@/constants/colors';

const REASONS: { value: DisputeReason; label: string }[] = [
  { value: 'not_received',     label: 'No lo recibí' },
  { value: 'not_as_described', label: 'No es como se describía' },
  { value: 'damaged',          label: 'Llegó dañado' },
  { value: 'incomplete',       label: 'Incompleto' },
  { value: 'other',            label: 'Otro motivo' },
];

export default function NewDisputeScreen() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const { open, isOpening } = useOpenDispute();

  const [reason, setReason]           = useState<DisputeReason>('not_received');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    open(
      { txId: txId ?? '', reason, description: description.trim() || undefined },
      {
        onSuccess: (result) => {
          router.replace(`/(app)/disputes/${result.disputeId}` as never);
        },
        onError: () => Alert.alert('Error', 'No se pudo abrir la disputa. Intentá de nuevo.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abrir disputa</Text>
        <View style={{ minWidth: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ ¿Por qué abrís esta disputa?</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.reasonRow, reason === r.value && styles.reasonRowActive]}
              onPress={() => setReason(r.value)}
            >
              <View style={[styles.radio, reason === r.value && styles.radioActive]}>
                {reason === r.value && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonText, reason === r.value && styles.reasonTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción (opcional)</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describí el problema con más detalle…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={5}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Al abrir una disputa, el pago queda retenido hasta que se resuelva. El vendedor tendrá 48 horas para responder.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, isOpening && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={isOpening}
        >
          {isOpening
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Abrir disputa</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:         { minWidth: 32 },
  backText:        { fontSize: 22, color: Colors.primary },
  headerTitle:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content:         { padding: 16, gap: 4, paddingBottom: 32 },
  section:         { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
  sectionTitle:    { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  reasonRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reasonRowActive: { },
  radio:           { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive:     { borderColor: Colors.primary },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  reasonText:      { fontSize: 14, color: Colors.textSecondary },
  reasonTextActive:{ color: Colors.textPrimary, fontWeight: '600' },
  textarea:        { backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 12, fontSize: 14, color: Colors.textPrimary, minHeight: 100 },
  charCount:       { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  warning:         { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, marginBottom: 10 },
  warningText:     { fontSize: 12, color: '#92400E', lineHeight: 18 },
  btn:             { backgroundColor: Colors.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled:     { opacity: 0.5 },
  btnText:         { color: '#fff', fontSize: 15, fontWeight: '700' },
});
