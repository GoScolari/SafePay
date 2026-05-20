import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { type TxStatus } from '@/constants/txStatus';

export type StepperFlow = 'shipping' | 'presential';

interface StatusStepperProps {
  status: TxStatus;
  flow: StepperFlow;
  timestamps?: Partial<Record<TxStatus, string>>;
  style?: StyleProp<ViewStyle>;
}

const SHIPPING_FLOW: ReadonlyArray<TxStatus> = [
  'PROPUESTA', 'CONFIRMADA', 'PAGADO', 'EN_TRANSITO', 'ENTREGADO', 'COMPLETADO',
];
const PRESENTIAL_FLOW: ReadonlyArray<TxStatus> = [
  'PROPUESTA', 'CONFIRMADA', 'PAGADO', 'ENTREGADO', 'COMPLETADO',
];

const STEP_LABEL: Record<TxStatus, string> = {
  PROPUESTA:   'Propuesta creada',
  CONFIRMADA:  'Contraparte aceptó',
  PAGADO:      'Pago retenido',
  EN_TRANSITO: 'En tránsito',
  ENTREGADO:   'Entregado',
  COMPLETADO:  'Pago liberado',
  CANCELADO:   'Cancelado',
  REEMBOLSADO: 'Reembolsado al comprador',
  EN_DISPUTA:  'Disputa abierta',
  EXPIRADO:    'Propuesta expirada',
};

const ALTERNATE_ENDINGS = new Set<TxStatus>(['EXPIRADO', 'CANCELADO', 'EN_DISPUTA', 'REEMBOLSADO']);

const DIVERGENCE_AFTER: Record<Exclude<TxStatus, 'PROPUESTA' | 'CONFIRMADA' | 'PAGADO' | 'EN_TRANSITO' | 'ENTREGADO' | 'COMPLETADO'>, TxStatus> = {
  EXPIRADO:    'PROPUESTA',
  CANCELADO:   'PAGADO',
  EN_DISPUTA:  'ENTREGADO',
  REEMBOLSADO: 'ENTREGADO',
};

type StepKind = 'done' | 'current' | 'future' | 'alt';

interface ComputedStep {
  status: TxStatus;
  kind: StepKind;
  label: string;
  meta?: string;
  isLast: boolean;
}

export function StatusStepper({ status, flow, timestamps, style }: StatusStepperProps) {
  const steps = computeSteps(status, flow, timestamps);

  return (
    <View style={[styles.container, style]}>
      {steps.map((step, i) => (
        <Step key={`${step.status}-${i}`} step={step} />
      ))}
    </View>
  );
}

function computeSteps(
  status: TxStatus,
  flow: StepperFlow,
  timestamps?: Partial<Record<TxStatus, string>>,
): ComputedStep[] {
  const baseFlow = flow === 'shipping' ? SHIPPING_FLOW : PRESENTIAL_FLOW;
  const ts = (s: TxStatus) => timestamps?.[s];

  if (!ALTERNATE_ENDINGS.has(status)) {
    const currentIdx = baseFlow.indexOf(status);
    return baseFlow.map((s, i) => ({
      status: s,
      kind: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future',
      label: STEP_LABEL[s],
      meta: ts(s) ?? defaultFutureMeta(s, status),
      isLast: i === baseFlow.length - 1,
    }));
  }

  const divergePoint = DIVERGENCE_AFTER[status as keyof typeof DIVERGENCE_AFTER];
  const divergeIdx = baseFlow.indexOf(divergePoint);
  const doneSteps: ComputedStep[] = baseFlow.slice(0, divergeIdx + 1).map(s => ({
    status: s,
    kind: 'done',
    label: STEP_LABEL[s],
    meta: ts(s),
    isLast: false,
  }));

  doneSteps.push({
    status,
    kind: 'alt',
    label: STEP_LABEL[status],
    meta: ts(status) ?? altDefaultMeta(status),
    isLast: true,
  });

  return doneSteps;
}

function defaultFutureMeta(stepStatus: TxStatus, currentStatus: TxStatus): string | undefined {
  if (currentStatus === stepStatus) return undefined;
  switch (stepStatus) {
    case 'CONFIRMADA':  return 'esperando contraparte';
    case 'PAGADO':      return 'esperando pago';
    case 'EN_TRANSITO': return 'esperando despacho';
    case 'ENTREGADO':   return 'esperando confirmación';
    case 'COMPLETADO':  return 'al confirmar recepción';
    default:            return undefined;
  }
}

function altDefaultMeta(status: TxStatus): string | undefined {
  switch (status) {
    case 'EXPIRADO':    return 'sin respuesta en el plazo';
    case 'CANCELADO':   return 'cancelado antes del despacho';
    case 'EN_DISPUTA':  return 'el comprador reportó un problema';
    case 'REEMBOLSADO': return 'resuelto a favor del comprador';
    default: return undefined;
  }
}

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 0.82, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,    duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 800, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[styles.dotPulse, { transform: [{ scale }], opacity }]}
    />
  );
}

function Step({ step }: { step: ComputedStep }) {
  const tone = getStepTone(step);
  const isFuture = step.kind === 'future';

  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View style={[styles.dot, tone.dot]}>
          {tone.icon ? (
            <Feather name={tone.icon} size={12} color={tone.iconColor} />
          ) : step.kind === 'current' ? (
            <PulseDot />
          ) : null}
        </View>
        {!step.isLast && <View style={[styles.line, tone.line]} />}
      </View>

      <View style={[styles.content, !step.isLast && styles.contentPadded]}>
        <Text
          style={[styles.label, step.kind === 'alt' && tone.labelStyle, isFuture && styles.labelFuture]}
          numberOfLines={2}
        >
          {step.label}
        </Text>
        {step.meta ? (
          <Text style={[styles.meta, isFuture && styles.metaFuture]} numberOfLines={2}>
            {step.meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface StepTone {
  dot: object;
  line: object;
  icon: React.ComponentProps<typeof Feather>['name'] | null;
  iconColor: string;
  labelStyle?: { color: string };
}

function getStepTone(step: ComputedStep): StepTone {
  if (step.kind === 'done') {
    return {
      dot: { backgroundColor: Colors.primary, borderColor: Colors.primary },
      line: { backgroundColor: Colors.primary },
      icon: 'check',
      iconColor: '#FFFFFF',
    };
  }
  if (step.kind === 'current') {
    return {
      dot: {
        backgroundColor: Colors.surface,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 4,
      },
      line: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
      icon: null,
      iconColor: Colors.primary,
    };
  }
  if (step.kind === 'future') {
    return {
      dot: { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.12)' },
      line: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
      icon: null,
      iconColor: Colors.textMuted,
    };
  }
  switch (step.status) {
    case 'EN_DISPUTA':
      return {
        dot: {
          backgroundColor: Colors.danger,
          borderColor: Colors.danger,
          shadowColor: Colors.danger,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 7,
          elevation: 4,
        },
        line: { backgroundColor: 'transparent' },
        icon: 'alert-circle',
        iconColor: '#FFFFFF',
        labelStyle: { color: '#FDBA74' },
      };
    case 'REEMBOLSADO':
      return {
        dot: { backgroundColor: Colors.danger, borderColor: Colors.danger },
        line: { backgroundColor: 'transparent' },
        icon: 'rotate-ccw',
        iconColor: '#FFFFFF',
        labelStyle: { color: '#FCA5A5' },
      };
    case 'CANCELADO':
    case 'EXPIRADO':
    default:
      return {
        dot: { backgroundColor: 'rgba(100, 116, 139, 0.20)', borderColor: '#64748B' },
        line: { backgroundColor: 'transparent' },
        icon: 'x',
        iconColor: '#CBD5E1',
        labelStyle: { color: Colors.textSecondary },
      };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotPulse: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -1,
  },
  content: {
    flex: 1,
    paddingTop: 1,
  },
  contentPadded: {
    paddingBottom: Spacing.md,
  },
  label: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  labelFuture: { color: Colors.textMuted },
  meta: {
    ...Typography.bodySm,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaFuture: { color: Colors.textMuted, opacity: 0.7 },
});

export default StatusStepper;
