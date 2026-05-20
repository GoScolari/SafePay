import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { ActionButton } from '@/components/ActionButton';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { useToast } from '@/components/chrome/Toast';
import { useAuth } from '@/hooks/useAuth';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const toast = useToast();
  const { postPayTx } = useLocalSearchParams<{ postPayTx?: string }>();
  const { sendOtp, isPending } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const isPhoneValid = phone.length === 9 && phone.startsWith('9');
  const isNameValid  = fullName.trim().length >= 3;
  const canSubmit    = isPhoneValid && isNameValid && acceptedTerms && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await sendOtp({
        phone: `+56${phone}`,
        fullName: fullName.trim(),
        mode: 'register',
      });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone, mode: 'register', postPayTx },
      } as never);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        toast.info('Ya tenés cuenta con ese teléfono', 'Iniciá sesión en lugar de registrarte.');
        router.replace('/(auth)/login' as never);
      } else {
        toast.error('No pudimos crear la cuenta', 'Probá de nuevo en unos segundos.');
      }
    }
  };

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="back"
        title="Crear cuenta"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Creá tu cuenta</Text>
            <Text style={styles.sub}>
              Te enviamos un código por SMS para verificar tu número.
            </Text>
          </View>

          {postPayTx ? <PostPayBanner /> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Camila Rodríguez"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoComplete="name"
              autoFocus
              style={[styles.input, nameFocused && styles.inputFocused]}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            <PhoneInput value={phone} onChangeText={setPhone} />
          </View>

          <Pressable
            style={styles.checkRow}
            onPress={() => setAcceptedTerms(v => !v)}
          >
            <View style={[styles.checkBox, acceptedTerms && styles.checkBoxActive]}>
              {acceptedTerms && (
                <Feather name="check" size={11} color="#fff" strokeWidth={3.4} />
              )}
            </View>
            <Text style={styles.checkText}>
              Acepto los <Text style={styles.checkLink}>términos</Text> y la{' '}
              <Text style={styles.checkLink}>política de privacidad</Text>.
            </Text>
          </Pressable>

          <View style={styles.flex} />

          <ActionButton
            label="Crear cuenta y enviar código"
            fullWidth
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isPending}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login' as never)}>
              <Text style={styles.footerLink}>Iniciar sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function PostPayBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerIcon}>
        <Feather name="check" size={16} color="#93C5FD" strokeWidth={3} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.bannerTitle}>Pago confirmado</Text>
        <Text style={styles.bannerBody}>
          Creá tu cuenta para hacer seguimiento de la transacción.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  titleBlock: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.30)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bannerIcon: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: {
    ...Typography.bodySm,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bannerBody: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 7,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 4,
    elevation: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checkBox: {
    width: 18, height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkBoxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkText: {
    ...Typography.bodySm,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  checkLink: {
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
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
