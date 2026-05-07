import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [phone,    setPhone]    = useState('');
  const { loading, error, register, clearError } = useAuth();

  const handleSubmit = () => {
    if (!fullName.trim() || !phone.trim()) return;
    register({ fullName: fullName.trim(), phone: phone.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>SafePay</Text>
        <Text style={styles.title}>Crear cuenta</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan Pérez"
            placeholderTextColor={Colors.textMuted}
            value={fullName}
            onChangeText={(t) => { setFullName(t); clearError(); }}
            autoCapitalize="words"
            autoFocus
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="+56 9 1234 5678"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => { setPhone(t); clearError(); }}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Crear cuenta</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/login" style={styles.link}>
            ¿Ya tenés cuenta? <Text style={styles.linkBold}>Iniciar sesión</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  inner:       { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  logo:        { fontSize: 36, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: 4 },
  title:       { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 32 },
  form:        { gap: 12 },
  label:       { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  input:       {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  error:       { fontSize: 13, color: Colors.danger },
  btn:         {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:        { textAlign: 'center', marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  linkBold:    { color: Colors.primary, fontWeight: '600' },
});
