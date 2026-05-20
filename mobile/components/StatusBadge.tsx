import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { StatusTones } from '@/constants/colors';
import { Radii, Typography } from '@/constants/theme';
import { TX_STATUS_LABEL, type TxStatus } from '@/constants/txStatus';

export type StatusBadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: TxStatus;
  size?: StatusBadgeSize;
  style?: StyleProp<ViewStyle>;
}

export function StatusBadge({ status, size = 'md', style }: StatusBadgeProps) {
  const tone = StatusTones[status] ?? StatusTones.EXPIRADO;
  const label = TX_STATUS_LABEL[status] ?? status;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        isSm ? styles.pillSm : styles.pillMd,
        { backgroundColor: tone.tintSoft, borderColor: withAlpha(tone.tint, 0.32) },
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          isSm ? styles.dotSm : styles.dotMd,
          { backgroundColor: tone.tint },
        ]}
      />
      <Text
        style={[
          isSm ? styles.labelSm : styles.labelMd,
          { color: tone.onTint },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  pillMd: { paddingVertical: 5, paddingHorizontal: 12, paddingLeft: 10, gap: 8 },
  pillSm: { paddingVertical: 3, paddingHorizontal: 9, paddingLeft: 8, gap: 6 },

  dot: { borderRadius: Radii.full },
  dotMd: { width: 8, height: 8 },
  dotSm: { width: 6, height: 6 },

  labelMd: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 12,
  },
  labelSm: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 11,
  },
});

export default StatusBadge;
