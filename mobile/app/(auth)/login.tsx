import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const [digits, setDigits] = useState('');
  const { loading, error, login, clearError } = useAuth();

  // Números chilenos: 9 seguido de 8 dígitos (ej: 9 1234 5678)
  const isValid = digits.length === 8;

  const borderColor = digits.length === 0
    ? Colors.border
    : isValid ? Colors.secondary : Colors.danger;

  const handleChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 8);
    setDigits(raw);
    clearError();
  };

  const handleSubmit = () => {
    if (!isValid) return;
    login({ phone: `+569${digits}` });
  };

  const displayValue = digits.length <= 4
    ? digits
    : `${digits.slice(0, 4)} ${digits.slice(4)}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>SafePay</Text>
        <Text style={styles.subtitle}>Pagos seguros entre personas</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Teléfono</Text>
          <View style={[styles.inputRow, { borderColor }]}>
            <Text style={styles.prefix}>+56 9</Text>
            <View style={styles.separator} />
            <TextInput
              style={styles.input}
              placeholder="1234 5678"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={displayValue}
              onChangeText={handleChange}
              autoFocus
            />
          </View>

          {digits.length > 0 && !isValid && (
            <Text style={styles.hint}>Ingresá los 8 dígitos restantes</Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Enviar código</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/register" style={styles.link}>
            ¿No tenés cuenta? <Text style={styles.linkBold}>Registrate</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo:        { fontSize: 36, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: 6 },
  subtitle:    { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  form:        { gap: 12 },
  label:       { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  inputRow:    {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  prefix:      { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginRight: 8 },
  separator:   { width: 1, height: 22, backgroundColor: Colors.border, marginRight: 10 },
  input:       { flex: 1, fontSize: 16, color: Colors.textPrimary, padding: 0 },
  hint:        { fontSize: 13, color: Colors.danger, marginTop: -4 },
  error:       { fontSize: 13, color: Colors.danger },
  btn:         {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:        { textAlign: 'center', marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  linkBold:    { color: Colors.primary, fontWeight: '600' },
});
