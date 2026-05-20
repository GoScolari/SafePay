import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { type TxStatus } from '@/constants/txStatus';
import { StatusBadge } from './StatusBadge';

export interface TxCardData {
  id: string;
  status: TxStatus;
  userRole: 'buyer' | 'seller';
  mode: 'shipping' | 'presential';
  title: string;
  amount: number;
  counterpartyName: string | null;
  timeLabel: string;
}

interface TransactionCardProps {
  tx: TxCardData;
  onPress?: (tx: TxCardData) => void;
  urgent?: boolean;
  urgentLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function TransactionCard({
  tx,
  onPress,
  urgent = false,
  urgentLabel,
  style,
}: TransactionCardProps) {
  const isCompleted = tx.status === 'COMPLETADO';
  const isExpired   = tx.status === 'EXPIRADO';
  const isCancelled = tx.status === 'CANCELADO';

  const completedOpacity = isCompleted ? 0.85 : 1;
  const terminalOpacity  = isExpired || isCancelled ? 0.55 : completedOpacity;

  const roleLabel = buildRoleLabel(tx);
  const amountLabel = buildAmountLabel(tx);

  return (
    <Pressable
      onPress={() => onPress?.(tx)}
      style={({ pressed }) => [
        styles.card,
        Shadows.card,
        urgent && styles.urgent,
        { opacity: terminalOpacity },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.topLeft}>
          <Text style={[styles.role, urgent && styles.roleUrgent]} numberOfLines={1}>
            {urgent ? '⚠ ' : ''}{roleLabel}
          </Text>
          <Text style={styles.title} numberOfLines={2}>{tx.title}</Text>
        </View>
        <StatusBadge status={tx.status} size="sm" />
      </View>

      <View style={styles.divider} />

      <View style={styles.bottom}>
        <View>
          <Text style={styles.amountLabel}>{amountLabel}</Text>
          <Text
            style={[
              styles.amountVal,
              (isExpired || isCancelled) && styles.amountMuted,
            ]}
            numberOfLines={1}
          >
            {formatCLP(tx.amount)}
          </Text>
        </View>
        <View style={styles.metaRight}>
          {tx.counterpartyName ? (
            <Text style={styles.counter} numberOfLines={1}>
              {tx.userRole === 'seller' ? 'Comprador · ' : 'Vendedor · '}
              <Text style={styles.counterStrong}>{tx.counterpartyName}</Text>
            </Text>
          ) : (
            <Text style={styles.counter}>Link compartido</Text>
          )}
          <Text style={[styles.time, urgent && styles.timeUrgent]} numberOfLines={1}>
            {urgent && urgentLabel ? urgentLabel : tx.timeLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function buildRoleLabel(tx: TxCardData): string {
  const role = tx.userRole === 'seller' ? 'Venta' : 'Compra';
  if (tx.status === 'PROPUESTA') {
    return tx.userRole === 'seller' ? 'Venta · esperando comprador' : 'Compra · esperando vendedor';
  }
  if (tx.status === 'EXPIRADO') {
    return `${role} · sin respuesta`;
  }
  return `${role} · ${tx.mode === 'shipping' ? 'courier' : 'presencial'}`;
}

function buildAmountLabel(tx: TxCardData): string {
  switch (tx.status) {
    case 'PROPUESTA':   return 'Precio acordado';
    case 'CONFIRMADA':  return 'A pagar';
    case 'PAGADO':
    case 'EN_TRANSITO': return tx.userRole === 'seller' ? 'En retención' : 'Pagado';
    case 'ENTREGADO':   return 'En retención';
    case 'EN_DISPUTA':  return 'En retención';
    case 'COMPLETADO':  return tx.userRole === 'seller' ? 'Liberado' : 'Pagado';
    case 'CANCELADO':   return 'Cancelado';
    case 'REEMBOLSADO': return 'Reembolsado';
    case 'EXPIRADO':    return 'Sin cargo';
  }
}

function formatCLP(amount: number): string {
  return `$ ${amount.toLocaleString('es-CL')}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  urgent: {
    borderColor: 'rgba(249, 115, 22, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  topLeft: {
    flex: 1,
    minWidth: 0,
  },
  role: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  roleUrgent: {
    color: '#FDBA74',
  },
  title: {
    ...Typography.h3,
    fontSize: 16,
    lineHeight: 21,
    marginTop: 4,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  amountVal: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  amountMuted: { color: Colors.textMuted },
  metaRight: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  counter: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  counterStrong: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  timeUrgent: {
    color: '#FDBA74',
    fontWeight: '600',
  },
});

export default TransactionCard;
