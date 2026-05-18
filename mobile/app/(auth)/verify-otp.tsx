import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

const OTP_TTL = 120; // segundos

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL);
  const inputRef = useRef<TextInput>(null);
  const { loading, error, verifyOtp, login, clearError } = useAuth();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const expired = secondsLeft <= 0;

  const handleSubmit = () => {
    if (code.length !== 6 || expired) return;
    verifyOtp({ phone, code });
  };

  const handleResend = useCallback(() => {
    clearError();
    setCode('');
    setSecondsLeft(OTP_TTL);
    login({ phone });
  }, [phone]);

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
              editable={!expired}
            />
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.digit, code.length === i && !expired && styles.digitActive, expired && styles.digitExpired]}>
                <Text style={styles.digitText}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Contador */}
        {expired ? (
          <Text style={styles.timerExpired}>Código expirado — reenviar para continuar</Text>
        ) : (
          <Text style={[styles.timer, secondsLeft <= 30 && styles.timerWarning]}>
            El código expira en <Text style={{ fontWeight: '700' }}>{formatTime(secondsLeft)}</Text>
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (loading || code.length !== 6 || expired) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading || code.length !== 6 || expired}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verificar</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendBtn}>
          <Text style={[styles.resendText, expired && styles.resendTextHighlight]}>
            {expired ? '↻ Reenviar código' : 'Reenviar código'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  inner:             { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  logo:              { fontSize: 36, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  title:             { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  subtitle:          { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  phone:             { fontWeight: '700', color: Colors.textPrimary },
  codeBox:           { flexDirection: 'row', justifyContent: 'center', gap: 10, position: 'relative' },
  hiddenInput:       { position: 'absolute', opacity: 0, width: 1, height: 1 },
  digit:             {
    width: 46, height: 56,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  digitActive:       { borderColor: Colors.primary },
  digitExpired:      { borderColor: Colors.textMuted, backgroundColor: Colors.background },
  digitText:         { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  timer:             { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  timerWarning:      { color: Colors.warning },
  timerExpired:      { fontSize: 13, color: Colors.danger, textAlign: 'center', fontWeight: '600' },
  error:             { fontSize: 13, color: Colors.danger, textAlign: 'center' },
  btn:               {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled:       { opacity: 0.4 },
  btnText:           { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn:         { alignItems: 'center', paddingVertical: 4 },
  resendText:        { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  resendTextHighlight: { color: Colors.primary, fontWeight: '800' },
});
