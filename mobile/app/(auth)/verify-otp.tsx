import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { OtpInput } from '@/components/forms/OtpInput';
import { useToast } from '@/components/chrome/Toast';
import { useAuth } from '@/hooks/useAuth';
import { formatChileanPhone } from '@/components/forms/PhoneInput';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const toast = useToast();
  const { phone, mode, postPayTx } = useLocalSearchParams<{
    phone: string;
    mode: 'login' | 'register';
    postPayTx?: string;
  }>();
  const { verifyOtp, sendOtp, isPending } = useAuth();

  const [error, setError] = useState(false);
  const [remaining, setRemaining] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const handleComplete = async (code: string) => {
    if (isPending) return;
    setError(false);
    try {
      await verifyOtp({ phone: `+56${phone}`, code });
      if (postPayTx) {
        router.replace(`/transactions/${postPayTx}` as never);
      } else {
        router.replace('/(app)' as never);
      }
    } catch {
      setError(true);
      toast.error('Código incorrecto', 'Revisá el SMS y reintentá.');
    }
  };

  const handleResend = async () => {
    if (remaining > 0) return;
    try {
      await sendOtp({ phone: `+56${phone}`, mode: mode ?? 'login' });
      setRemaining(RESEND_SECONDS);
      toast.success('Código reenviado');
    } catch {
      toast.error('No pudimos reenviar el código');
    }
  };

  const displayPhone = `+56 ${formatChileanPhone(phone ?? '')}`;

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="back"
        title="Verificación"
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Ingresá el código</Text>
          <Text style={styles.target}>
            Te enviamos un SMS a{' '}
            <Text style={styles.targetStrong}>{displayPhone}</Text>
          </Text>
        </View>

        <View style={styles.otpWrap}>
          <OtpInput
            length={OTP_LENGTH}
            onComplete={handleComplete}
            onChange={() => error && setError(false)}
            error={error}
            disabled={isPending}
          />
        </View>

        <View style={styles.resendRow}>
          {remaining > 0 ? (
            <Text style={styles.resendDisabled}>
              Reenviar código en{' '}
              <Text style={styles.resendStrong}>
                0:{remaining.toString().padStart(2, '0')}
              </Text>
            </Text>
          ) : (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendActive}>Reenviar código</Text>
            </Pressable>
          )}
        </View>

        {isPending && (
          <View style={styles.verifying}>
            <Text style={styles.verifyingText}>Verificando…</Text>
          </View>
        )}

        <View style={styles.flex} />

        <View style={styles.changeWrap}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.changeLink}>Cambiar número</Text>
          </Pressable>
        </View>
      </View>
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
    alignItems: 'center',
  },
  title: {
    ...Typography.h1,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  target: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 21,
  },
  targetStrong: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  otpWrap: {
    paddingVertical: Spacing.md,
  },
  resendRow: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  resendDisabled: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textMuted,
  },
  resendStrong: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  resendActive: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  verifying: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  verifyingText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: '#6EE7B7',
  },
  changeWrap: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  changeLink: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
