/**
 * SafePay · PhoneInput
 *
 * Input para teléfono chileno con prefijo +56 fijo y formato visual
 * `9 9999 9999` mientras tipea. El valor que devuelve `onChange` es siempre
 * el string crudo de 9 dígitos (sin espacios ni +56).
 *
 * Uso:
 *   const [phone, setPhone] = useState('');
 *   <PhoneInput value={phone} onChangeText={setPhone} />
 *
 *   // phone = "912345678" (9 dígitos crudos)
 *   // displayed = "9 1234 5678"
 */

import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';

interface PhoneInputProps {
  value: string; // 9 dígitos crudos
  onChangeText: (raw: string) => void;
  /** País code prefix sin el `+` · default 'CL' (+56) */
  countryCode?: '56';
  placeholder?: string;
  /** Auto-focus al mount */
  autoFocus?: boolean;
  /** Mensaje de error · si está set pinta el border en danger */
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

const MAX_DIGITS = 9;

export function PhoneInput({
  value,
  onChangeText,
  countryCode = '56',
  placeholder = '9 1234 5678',
  autoFocus = false,
  error,
  style,
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isValid = value.length === 9 && value.startsWith('9');

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D+/g, '').slice(0, MAX_DIGITS);
    onChangeText(digits);
  };

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.wrap,
          focused && !isValid && !error && styles.focused,
          isValid && styles.valid,
          error ? styles.errored : null,
          style,
        ]}
      >
        <Text style={styles.prefix}>+{countryCode}</Text>
        <View style={styles.divider} />
        <TextInput
          ref={inputRef}
          value={formatChileanPhone(value)}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          autoFocus={autoFocus}
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={15}
          style={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

/** "912345678" → "9 1234 5678". Acepta cualquier substring durante typing. */
export function formatChileanPhone(digits: string): string {
  if (!digits) return '';
  const head = digits.slice(0, 1);
  const mid  = digits.slice(1, 5);
  const tail = digits.slice(5, 9);
  return [head, mid, tail].filter(Boolean).join(' ');
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  focused: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  errored: {
    borderColor: Colors.danger,
  },
  valid: {
    borderColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  prefix: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
    paddingRight: Spacing.sm,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.divider,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  errorText: {
    ...Typography.caption,
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 6,
    lineHeight: 16,
  },
});

export default PhoneInput;
