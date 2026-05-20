import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';

export type ActionButtonVariant = 'primary' | 'danger' | 'outline';

interface ActionButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ActionButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const PRIMARY_GRADIENT = ['#3B82F6', '#1D4ED8'] as const;
const DANGER_GRADIENT  = ['#F97316', '#DC2626'] as const;

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  testID,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        isOutline && styles.outline,
        !isOutline && Shadows.glow,
        variant === 'danger' && { shadowColor: Colors.danger },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {!isOutline && (
        <LinearGradient
          colors={variant === 'danger' ? DANGER_GRADIENT : PRIMARY_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={isOutline ? Colors.textPrimary : Colors.textOnPrimary}
            size="small"
          />
        ) : (
          <>
            {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
            <Text
              style={[styles.label, isOutline ? styles.labelOutline : styles.labelOnPrimary]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
    paddingHorizontal: Spacing.xxl,
  },
  fullWidth: {
    minWidth: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  outline: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.bodyLg,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  labelOnPrimary: { color: Colors.textOnPrimary },
  labelOutline:   { color: Colors.textPrimary },
});

export default ActionButton;
