/**
 * SafePay · ScreenContainer
 *
 * Wrapper estándar de cualquier pantalla. Maneja:
 *   - SafeArea (top/bottom) con `react-native-safe-area-context`
 *   - StatusBar style (light por default · forzado en dark theme)
 *   - Background color del theme
 *   - Padding horizontal opcional (default Spacing.xxl = 24)
 *   - Scroll opcional (modo `scroll` envuelve en ScrollView)
 *
 * Uso:
 *   <ScreenContainer>
 *     <Text>…</Text>
 *   </ScreenContainer>
 *
 *   <ScreenContainer scroll padding={false}>
 *     <Custom layout que maneja su propio padding />
 *   </ScreenContainer>
 *
 *   <ScreenContainer edges={['top']}>     // sin safe area bottom (porque hay TabBar)
 *     …
 *   </ScreenContainer>
 */

import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Si true, envuelve los children en un ScrollView con rebote */
  scroll?: boolean;
  /** Activa/desactiva padding horizontal estándar (Spacing.xxl) */
  padding?: boolean;
  /** Cuáles bordes safe-area aplicar. Default ['top', 'bottom']. */
  edges?: ReadonlyArray<Edge>;
  /** Background custom (raro · default Colors.background) */
  backgroundColor?: string;
  /** Props extra para el ScrollView interno (solo si scroll=true) */
  scrollViewProps?: Omit<ScrollViewProps, 'children'>;
  /** Style override del contenedor exterior */
  style?: StyleProp<ViewStyle>;
  /** Style del contenido interno (después del padding) */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ScreenContainer({
  children,
  scroll = false,
  padding = true,
  edges = ['top', 'bottom'],
  backgroundColor = Colors.background,
  scrollViewProps,
  style,
  contentStyle,
  testID,
}: ScreenContainerProps) {
  const innerStyle: StyleProp<ViewStyle> = [
    padding && styles.padded,
    contentStyle,
  ];

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor }, style]}
      edges={edges}
      testID={testID}
    >
      <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={innerStyle}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, innerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: Spacing.xxl },
});

export default ScreenContainer;
