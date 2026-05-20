/**
 * SafePay · Toast
 *
 * Sistema de notificaciones efímeras estilo snackbar. Tres piezas:
 *
 *   1. <ToastProvider>      · Provider que se monta arriba en app/_layout.tsx
 *   2. useToast()           · Hook que devuelve { show, success, error, info, dismiss }
 *   3. <ToastView />        · El componente visual (renderizado por el provider, no usar directo)
 *
 * Setup (en app/_layout.tsx):
 *
 *   import { ToastProvider } from '@/components/chrome/Toast';
 *
 *   <SafeAreaProvider>
 *     <ToastProvider>
 *       <QueryClientProvider client={queryClient}>
 *         <Stack />
 *       </QueryClientProvider>
 *     </ToastProvider>
 *   </SafeAreaProvider>
 *
 * Uso desde cualquier pantalla:
 *
 *   const toast = useToast();
 *   toast.success('Link copiado', 'Compartilo por WhatsApp para que pague');
 *   toast.error('Hubo un error al iniciar el pago');
 *   toast.info('El pago está siendo procesado');
 *   toast.show({ tone: 'success', title: 'OK', duration: 6000 });
 *
 * Comportamiento:
 *   - Slide-in desde arriba + auto-dismiss en 4s (configurable)
 *   - Tap en el toast lo cierra
 *   - Máximo 3 toasts apilados (los más viejos se descartan)
 *   - Respeta safe area top
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type ToastTone = 'success' | 'error' | 'info';

interface ToastInput {
  title: string;
  sub?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
  tone: ToastTone;
  duration: number;
}

interface ToastApi {
  show: (input: ToastInput) => string;
  success: (title: string, sub?: string) => string;
  error:   (title: string, sub?: string) => string;
  info:    (title: string, sub?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const MAX_TOASTS = 3;

// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

// ────────────────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const dismissAll = useCallback(() => setItems([]), []);

  const show = useCallback((input: ToastInput): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = {
      id,
      title: input.title,
      sub: input.sub,
      tone: input.tone ?? 'info',
      duration: input.duration ?? 4000,
    };
    setItems(prev => {
      const next = [...prev, item];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (title, sub) => show({ title, sub, tone: 'success' }),
    error:   (title, sub) => show({ title, sub, tone: 'error' }),
    info:    (title, sub) => show({ title, sub, tone: 'info' }),
    dismiss,
    dismissAll,
  }), [show, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stack + Item
// ────────────────────────────────────────────────────────────────────────────

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  if (items.length === 0) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.stack, { top: insets.top + Spacing.sm }]}
    >
      {items.map(item => (
        <ToastView key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

interface ToneStyle {
  iconBg: string;
  iconColor: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}

const TONE_STYLES: Record<ToastTone, ToneStyle> = {
  success: { iconBg: 'rgba(16, 185, 129, 0.18)', iconColor: '#6EE7B7', icon: 'check' },
  error:   { iconBg: 'rgba(239, 68, 68, 0.18)',  iconColor: '#FCA5A5', icon: 'x' },
  info:    { iconBg: Colors.primaryMuted,        iconColor: '#93C5FD', icon: 'info' },
};

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const tone = TONE_STYLES[item.tone];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.bezier(0, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.bezier(0, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (item.duration <= 0) return;
    const t = setTimeout(() => triggerDismiss(), item.duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.duration]);

  const triggerDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss(item.id));
  }, [opacity, translateY, onDismiss, item.id]);

  return (
    <Animated.View
      style={[
        styles.itemWrap,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable onPress={triggerDismiss}>
        <BlurView intensity={30} tint="dark" style={styles.item}>
          <View style={[styles.icon, { backgroundColor: tone.iconBg }]}>
            <Feather name={tone.icon} size={16} color={tone.iconColor} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.sub ? <Text style={styles.sub} numberOfLines={2}>{item.sub}</Text> : null}
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.sm,
    zIndex: 9999,
  },
  itemWrap: {
    width: '100%',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(27, 35, 64, 0.85)',
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...Typography.bodySm,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  sub: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});

export default ToastProvider;
