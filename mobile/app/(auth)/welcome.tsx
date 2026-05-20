import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { ActionButton } from '@/components/ActionButton';

import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';

const VALUE_PROPS: Array<{
  icon: React.ComponentProps<typeof Feather>['name'];
  bold: string;
  rest: string;
}> = [
  {
    icon: 'shield',
    bold: 'Tu plata, en custodia.',
    rest: 'SafePay retiene el pago hasta que confirmes la entrega.',
  },
  {
    icon: 'map-pin',
    bold: 'Presencial o courier.',
    rest: 'Funciona con encuentro en persona o envío rastreado.',
  },
  {
    icon: 'message-circle',
    bold: 'Sobre cualquier app.',
    rest: 'Lo usás con tus contactos de Yapo, Facebook o WhatsApp.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer padding={false}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.shieldWrap}>
            <View style={styles.shieldHalo} pointerEvents="none" />
            <View style={styles.shield}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Feather name="shield" size={44} color="#fff" />
            </View>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.brand}>SafePay</Text>
            <Text style={styles.tagline}>
              Pagos protegidos para vender y comprar entre personas en Chile.
            </Text>
          </View>

          <View style={styles.features}>
            {VALUE_PROPS.map(vp => (
              <View key={vp.bold} style={styles.featRow}>
                <View style={styles.featIcon}>
                  <Feather name={vp.icon} size={14} color="#3B82F6" />
                </View>
                <Text style={styles.featText}>
                  <Text style={styles.featBold}>{vp.bold}</Text> {vp.rest}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cta}>
          <ActionButton
            label="Crear cuenta"
            fullWidth
            onPress={() => router.push('/(auth)/register' as never)}
          />
          <ActionButton
            variant="outline"
            label="Ya tengo cuenta"
            fullWidth
            onPress={() => router.push('/(auth)/login' as never)}
          />
          <Text style={styles.terms}>
            Al continuar aceptás los <Text style={styles.termsLink}>términos</Text>
            {' '}y la <Text style={styles.termsLink}>política de privacidad</Text>.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  shieldWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  shieldHalo: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(37, 99, 235, 0.20)',
    opacity: 0.7,
  },
  shield: {
    width: 88, height: 88,
    borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...Shadows.glow,
    shadowRadius: 36,
    shadowOpacity: 0.65,
  },
  textBlock: { alignItems: 'center' },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: Colors.textPrimary,
  },
  tagline: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  features: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  featRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'flex-start',
  },
  featIcon: {
    width: 28, height: 28,
    borderRadius: 9,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featText: {
    ...Typography.bodySm,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
    paddingTop: 2,
  },
  featBold: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  cta: {
    gap: Spacing.sm,
  },
  terms: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  termsLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
