import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { ActionButton } from '@/components/ActionButton';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { useToast } from '@/components/chrome/Toast';
import { useAuth } from '@/hooks/useAuth';

import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const { sendOtp, isPending } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValid = phone.length === 9 && phone.startsWith('9');

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Ingresá un número válido (9 dígitos, empieza con 9)');
      return;
    }
    try {
      setError(null);
      await sendOtp({ phone: `+56${phone}`, mode: 'login' });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone, mode: 'login' },
      } as never);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setError('No encontramos una cuenta con ese teléfono');
        toast.info('¿No tenés cuenta?', 'Tocá "Crear cuenta" abajo para registrarte.');
      } else {
        toast.error('No pudimos enviar el código', 'Probá de nuevo en unos segundos.');
      }
    }
  };

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="back"
        title="Iniciar sesión"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Bienvenido de vuelta</Text>
            <Text style={styles.sub}>
              Ingresá tu teléfono y te enviamos un código por SMS para verificar tu identidad.
            </Text>
          </View>

          <View>
            <Text style={styles.label}>Teléfono</Text>
            <PhoneInput
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (error) setError(null);
              }}
              autoFocus
              error={error}
            />
            {!error && (
              <Text style={styles.hint}>
                Usamos tu número solo para confirmar tu identidad. No publicamos nada.
              </Text>
            )}
          </View>

          <View style={styles.flex} />

          <ActionButton
            label="Enviar código"
            fullWidth
            onPress={handleSubmit}
            disabled={!isValid || isPending}
            loading={isPending}
            rightIcon={<Feather name="arrow-right" size={16} color={Colors.textOnPrimary} />}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No tenés cuenta?{' '}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/register' as never)}>
              <Text style={styles.footerLink}>Crear cuenta</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  titleBlock: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sub: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 21,
  },
  label: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 7,
  },
  hint: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  footer: {
    paddingTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
