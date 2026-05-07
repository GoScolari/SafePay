import { View, Text, StyleSheet } from 'react-native';
import { TxStatus, TX_STATUS_LABEL, TX_STATUS_COLOR, TX_STATUS_FLOW } from '@/constants/txStatus';
import { Colors } from '@/constants/colors';

const SPECIAL: Partial<Record<TxStatus, { emoji: string; label: string; color: string }>> = {
  CANCELADO:   { emoji: '✖️', label: 'Cancelada',  color: Colors.textMuted },
  REEMBOLSADO: { emoji: '↩️', label: 'Reembolsada', color: Colors.danger },
  EN_DISPUTA:  { emoji: '⚠️', label: 'En disputa', color: '#F97316' },
  EXPIRADO:    { emoji: '⏰', label: 'Expirada',   color: Colors.textMuted },
};

export function StatusStepper({ status }: { status: TxStatus }) {
  const special = SPECIAL[status];

  if (special) {
    return (
      <View style={styles.specialContainer}>
        <Text style={styles.specialEmoji}>{special.emoji}</Text>
        <Text style={[styles.specialLabel, { color: special.color }]}>{special.label}</Text>
      </View>
    );
  }

  const currentIndex = TX_STATUS_FLOW.indexOf(status);

  return (
    <View style={styles.container}>
      {TX_STATUS_FLOW.map((s, i) => {
        const done    = i < currentIndex;
        const active  = i === currentIndex;
        const pending = i > currentIndex;
        const color   = done || active ? TX_STATUS_COLOR[s] : Colors.border;

        return (
          <View key={s} style={styles.step}>
            {/* Conector izquierdo */}
            {i > 0 && <View style={[styles.line, { backgroundColor: done ? TX_STATUS_COLOR[TX_STATUS_FLOW[i - 1]] : Colors.border }]} />}

            <View style={styles.dotWrapper}>
              <View style={[styles.dot, { backgroundColor: color, transform: [{ scale: active ? 1.25 : 1 }] }]}>
                {done && <Text style={styles.check}>✓</Text>}
              </View>
              <Text style={[styles.label, { color: pending ? Colors.textMuted : color, fontWeight: active ? '700' : '400' }]}
                numberOfLines={1}>
                {TX_STATUS_LABEL[s]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, marginVertical: 8 },
  step:             { flex: 1, flexDirection: 'row', alignItems: 'center' },
  line:             { flex: 1, height: 2, marginBottom: 14 },
  dotWrapper:       { alignItems: 'center', gap: 4 },
  dot:              { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  check:            { fontSize: 10, color: '#fff', fontWeight: '700' },
  label:            { fontSize: 9, textAlign: 'center', maxWidth: 44 },
  specialContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  specialEmoji:     { fontSize: 22 },
  specialLabel:     { fontSize: 16, fontWeight: '700' },
});
