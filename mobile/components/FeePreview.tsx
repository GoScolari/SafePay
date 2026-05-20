import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';

export type FeePayer = 'buyer' | 'seller' | 'split';
export type ViewerRole = 'buyer' | 'seller';

interface FeePreviewProps {
  amount: number;
  fee: number;
  feePayer: FeePayer;
  viewerRole: ViewerRole;
  style?: StyleProp<ViewStyle>;
}

export function FeePreview({ amount, fee, feePayer, viewerRole, style }: FeePreviewProps) {
  const view = computeView({ amount, fee, feePayer, viewerRole });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.mode}>{view.modeLabel}</Text>
        <View style={[styles.tag, { backgroundColor: view.tagBg }]}>
          <Text style={[styles.tagText, { color: view.tagColor }]}>{view.tagText}</Text>
        </View>
      </View>

      <View style={styles.rows}>
        <Row label={view.amountRowLabel} value={formatCLP(amount)} />
        {view.feeRowLabel && (
          <Row
            label={view.feeRowLabel}
            value={view.feeRowValue ?? ''}
            muted
          />
        )}
      </View>

      <View style={styles.total}>
        <Text style={styles.totalLabel}>{view.totalLabel}</Text>
        <Text style={styles.totalVal}>{formatCLP(view.totalAmount)}</Text>
      </View>

      <Text style={styles.hint}>{view.hint}</Text>
    </View>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.rowMuted]}>{label}</Text>
      <Text style={[styles.rowValue, muted && styles.rowMuted]}>{value}</Text>
    </View>
  );
}

interface ComputedView {
  modeLabel: string;
  tagText: string;
  tagBg: string;
  tagColor: string;
  amountRowLabel: string;
  feeRowLabel: string | null;
  feeRowValue: string | null;
  totalLabel: string;
  totalAmount: number;
  hint: string;
}

function computeView(p: {
  amount: number; fee: number; feePayer: FeePayer; viewerRole: ViewerRole;
}): ComputedView {
  const { amount, fee, feePayer, viewerRole } = p;

  if (viewerRole === 'buyer') {
    if (feePayer === 'buyer') {
      return {
        modeLabel: 'Vista del comprador',
        tagText: 'asumís el costo',
        tagBg: 'rgba(37, 99, 235, 0.18)',
        tagColor: '#93C5FD',
        amountRowLabel: 'Producto',
        feeRowLabel: 'Costo servicio SafePay',
        feeRowValue: formatCLP(fee),
        totalLabel: 'Total a pagar',
        totalAmount: amount + fee,
        hint: 'Tu pago queda retenido hasta confirmar la recepción.',
      };
    }
    if (feePayer === 'seller') {
      return {
        modeLabel: 'Vista del comprador',
        tagText: 'el vendedor asume',
        tagBg: 'rgba(16, 185, 129, 0.18)',
        tagColor: '#6EE7B7',
        amountRowLabel: 'Producto',
        feeRowLabel: null,
        feeRowValue: null,
        totalLabel: 'Total a pagar',
        totalAmount: amount,
        hint: 'El costo del servicio lo asume el vendedor. Tu pago queda retenido hasta confirmar la recepción.',
      };
    }
    const half = Math.ceil(fee / 2);
    return {
      modeLabel: 'Modo dividido',
      tagText: 'split 50 / 50',
      tagBg: 'rgba(139, 92, 246, 0.18)',
      tagColor: '#C4B5FD',
      amountRowLabel: 'Producto',
      feeRowLabel: 'Tu mitad del servicio',
      feeRowValue: formatCLP(half),
      totalLabel: 'Total a pagar',
      totalAmount: amount + half,
      hint: 'La otra mitad la asume el vendedor en su liquidación.',
    };
  }

  if (feePayer === 'seller') {
    return {
      modeLabel: 'Vista del vendedor',
      tagText: 'asumís el costo',
      tagBg: 'rgba(16, 185, 129, 0.18)',
      tagColor: '#6EE7B7',
      amountRowLabel: 'Precio acordado',
      feeRowLabel: 'Costo servicio SafePay',
      feeRowValue: `− ${formatCLP(fee)}`,
      totalLabel: 'Vas a recibir',
      totalAmount: amount - fee,
      hint: 'Se descuenta de tu liberación final. Tarifa fija por tramo de monto.',
    };
  }
  if (feePayer === 'buyer') {
    return {
      modeLabel: 'Vista del vendedor',
      tagText: 'el comprador asume',
      tagBg: 'rgba(37, 99, 235, 0.18)',
      tagColor: '#93C5FD',
      amountRowLabel: 'Precio acordado',
      feeRowLabel: null,
      feeRowValue: null,
      totalLabel: 'Vas a recibir',
      totalAmount: amount,
      hint: 'El comprador asume el costo del servicio. Vas a recibir el monto íntegro.',
    };
  }
  const halfS = Math.ceil(fee / 2);
  return {
    modeLabel: 'Modo dividido',
    tagText: 'split 50 / 50',
    tagBg: 'rgba(139, 92, 246, 0.18)',
    tagColor: '#C4B5FD',
    amountRowLabel: 'Precio acordado',
    feeRowLabel: 'Tu mitad del servicio',
    feeRowValue: `− ${formatCLP(halfS)}`,
    totalLabel: 'Vas a recibir',
    totalAmount: amount - halfS,
    hint: 'La otra mitad la paga el comprador. Se descuenta de tu liberación.',
  };
}

function formatCLP(amount: number): string {
  return `$ ${amount.toLocaleString('es-CL')}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  mode: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rows: {
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rowValue: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  rowMuted: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.textPrimary,
  },
  totalVal: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 17,
  },
});

export default FeePreview;
