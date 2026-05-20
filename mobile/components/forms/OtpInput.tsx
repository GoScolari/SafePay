/**
 * SafePay · OtpInput
 *
 * Input visual de N celdas (default 6) para código OTP de SMS.
 *
 * Comportamiento:
 *   - Una sola TextInput "fantasma" invisible captura el input — los cells
 *     son sólo display. Esto resuelve el problema clásico de focus jumping
 *     entre múltiples inputs nativos en Android.
 *   - Auto-foco al mount (`autoFocus` default true).
 *   - Backspace borra el último dígito.
 *   - Paste: pega el código completo si tiene N o más dígitos.
 *   - `onComplete(code)` se dispara cuando se llenan las N celdas.
 *
 * Uso:
 *   <OtpInput length={6} onComplete={(code) => verifyOtp(code)} />
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';

interface OtpInputProps {
  length?: number;
  /** Disparado al llenar las N celdas. El caller decide si hace submit. */
  onComplete?: (code: string) => void;
  /** Cambio en cada keystroke · útil para limpiar errores */
  onChange?: (code: string) => void;
  autoFocus?: boolean;
  /** Marca todas las celdas con border danger */
  error?: boolean;
  /** Deshabilita input (ej. mientras verifica) */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OtpInput({
  length = 6,
  onComplete,
  onChange,
  autoFocus = true,
  error = false,
  disabled = false,
  style,
}: OtpInputProps) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const hiddenRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const t = setTimeout(() => hiddenRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus, disabled]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D+/g, '').slice(0, length);
    setCode(digits);
    onChange?.(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const focusInput = () => hiddenRef.current?.focus();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < length; i++) {
    const char = code[i] ?? '';
    const isFilled = char !== '';
    const isActive = focused && i === code.length;
    cells.push(
      <View
        key={i}
        style={[
          styles.cell,
          isFilled && styles.cellFilled,
          isActive && styles.cellActive,
          error && styles.cellError,
        ]}
      >
        {isFilled ? (
          <Text style={styles.cellText}>{char}</Text>
        ) : isActive ? (
          <Caret />
        ) : null}
      </View>
    );
  }

  return (
    <Pressable onPress={focusInput} style={[styles.row, style]} disabled={disabled}>
      {cells}
      <TextInput
        ref={hiddenRef}
        value={code}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        editable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

function Caret() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible(v => !v), 480);
    return () => clearInterval(t);
  }, []);
  return <View style={[styles.caret, { opacity: visible ? 1 : 0 }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  cell: {
    width: 52,
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  cellActive: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 8,
    elevation: 4,
  },
  cellError: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cellText: {
    ...Typography.h2,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  caret: {
    width: 2,
    height: 22,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
  },
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -1,
    left: -1,
  },
});

export default OtpInput;
