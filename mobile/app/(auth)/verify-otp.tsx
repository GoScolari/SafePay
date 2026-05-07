import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { loading, error, verifyOtp, login, clearError } = useAuth();

  const handleSubmit = () => {
    if (code.length !== 6) return;
    verifyOtp({ phone, code });
  };

  const handleResend = () => {
    clearError();
    setCode('');
    login({ phone });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>SafePay</Text>
        <Text style={styles.title}>Verificar teléfono</Text>
        <Text style={styles.subtitle}>
          Ingresá el código de 6 dígitos{'\n'}que enviamos a <Text style={styles.phone}>{phone}</Text>
        </Text>

        <TouchableOpacity activeOpacity={0.8} onPress={() => inputRef.current?.focus()}>
          <View style={styles.codeBox}>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(t) => { setCode(t.replace(/\D/g, '')); clearError(); }}
              autoFocus
            />
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.digit, code.length === i && styles.digitActive]}>
                <Text style={styles.digitText}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (loading || code.length !== 6) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading || code.length !== 6}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verificar</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendBtn}>
          <Text style={styles.resendText}>Reenviar código</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  logo:        { fontSize: 36, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  title:       { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  subtitle:    { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  phone:       { fontWeight: '700', color: Colors.textPrimary },
  codeBox:     { flexDirection: 'row', justifyContent: 'center', gap: 10, position: 'relative' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  digit:       {
    width: 46, height: 56,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  digitActive: { borderColor: Colors.primary },
  digitText:   { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  error:       { fontSize: 13, color: Colors.danger, textAlign: 'center' },
  btn:         {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn:   { alignItems: 'center', paddingVertical: 4 },
  resendText:  { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
