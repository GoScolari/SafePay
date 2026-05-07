import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const { loading, error, login, clearError } = useAuth();

  const handleSubmit = () => {
    if (!phone.trim()) return;
    login({ phone: phone.trim() });
  };

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
          <TextInput
            style={styles.input}
            placeholder="+56 9 1234 5678"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => { setPhone(t); clearError(); }}
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
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
  container:  { flex: 1, backgroundColor: Colors.background },
  inner:      { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo:       { fontSize: 36, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: 6 },
  subtitle:   { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  form:       { gap: 12 },
  label:      { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  input:      {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  error:      { fontSize: 13, color: Colors.danger },
  btn:        {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:       { textAlign: 'center', marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  linkBold:   { color: Colors.primary, fontWeight: '600' },
});
