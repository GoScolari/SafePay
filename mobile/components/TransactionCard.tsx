import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Transaction } from '@/stores/transaction.store';
import { TX_STATUS_LABEL, TX_STATUS_COLOR } from '@/constants/txStatus';
import { Colors } from '@/constants/colors';
import { formatCLP, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

export function TransactionCard({ tx }: { tx: Transaction }) {
  const userId = useAuthStore((s) => s.user?.id);
  const isInitiator = tx.initiatorId === userId;
  const counterpartName = isInitiator
    ? tx.counterpart?.fullName ?? 'Esperando contraparte'
    : tx.initiator?.fullName ?? 'Desconocido';

  const myRole = isInitiator
    ? tx.initiatorRole === 'seller' ? 'Vendedor' : 'Comprador'
    : tx.initiatorRole === 'seller' ? 'Comprador' : 'Vendedor';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/transactions/${tx.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.description} numberOfLines={1}>{tx.description}</Text>
          <Text style={styles.counterpart}>{myRole} · {counterpartName}</Text>
          <Text style={styles.date}>{formatDate(tx.createdAt)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatCLP(tx.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: TX_STATUS_COLOR[tx.status] + '20' }]}>
            <Text style={[styles.badgeText, { color: TX_STATUS_COLOR[tx.status] }]}>
              {TX_STATUS_LABEL[tx.status]}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row:          { flexDirection: 'row', gap: 12 },
  info:         { flex: 1, gap: 3 },
  description:  { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  counterpart:  { fontSize: 13, color: Colors.textSecondary },
  date:         { fontSize: 12, color: Colors.textMuted },
  right:        { alignItems: 'flex-end', gap: 6 },
  amount:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
});
