import { View, Text, StyleSheet } from 'react-native';
import { calculateFee, formatCLP } from '@/lib/utils';
import { Colors } from '@/constants/colors';

interface Props {
  amount: number;
  feePayer: 'seller' | 'buyer' | 'split';
  initiatorRole: 'seller' | 'buyer';
}

export function FeePreview({ amount, feePayer, initiatorRole }: Props) {
  if (amount < 1000) return null;

  const fee = calculateFee(amount);
  const buyerTotal = feePayer === 'buyer'
    ? amount + fee
    : feePayer === 'split'
    ? amount + Math.ceil(fee / 2)
    : amount;
  const sellerReceives = feePayer === 'seller'
    ? amount - fee
    : feePayer === 'split'
    ? amount - Math.floor(fee / 2)
    : amount;

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Precio del artículo', value: formatCLP(amount) },
    { label: 'Comisión SafePay',    value: formatCLP(fee) },
    { label: 'Total que paga el comprador', value: formatCLP(buyerTotal), highlight: true },
    { label: 'Recibe el vendedor',  value: formatCLP(sellerReceives), highlight: true },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen de costos</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <Text style={styles.label}>{r.label}</Text>
          <Text style={[styles.value, r.highlight && styles.highlight]}>{r.value}</Text>
        </View>
      ))}
      <Text style={styles.note}>
        Comisión: {feePayer === 'buyer' ? 'la paga el comprador' : feePayer === 'seller' ? 'la paga el vendedor' : 'la pagan entre los dos'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary + '0D',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  title:     { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  label:     { fontSize: 13, color: Colors.textSecondary },
  value:     { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  highlight: { color: Colors.primary },
  note:      { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});
