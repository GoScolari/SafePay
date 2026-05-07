import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';

interface InitiateResponse {
  checkoutUrl: string | null;
  paymentId: string;
}

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null | undefined>(undefined);
  const [paymentId, setPaymentId]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

  useEffect(() => {
    if (!id) return;
    api.post<InitiateResponse>('/payments/initiate', { transactionId: id })
      .then((r) => {
        setCheckoutUrl(r.data.checkoutUrl);
        setPaymentId(r.data.paymentId);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['transaction', id] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    router.replace(`/(app)/transactions/${id}` as never);
  };

  const handleFailure = () => {
    Alert.alert('Pago no completado', 'El pago fue cancelado o falló. Podés intentarlo de nuevo.');
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.hint}>Preparando pago…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo iniciar el pago.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Modo dev: sin Mercado Pago configurado
  if (checkoutUrl === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pago simulado</Text>
          <View style={{ minWidth: 32 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.devEmoji}>🧪</Text>
          <Text style={styles.devTitle}>Modo desarrollo</Text>
          <Text style={styles.devSub}>Mercado Pago no está configurado.{'\n'}Simulá el resultado del pago:</Text>
          <TouchableOpacity style={[styles.btn, { marginTop: 24 }]} onPress={handleSuccess}>
            <Text style={styles.btnText}>✅ Simular pago exitoso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOutline, { marginTop: 12 }]} onPress={handleFailure}>
            <Text style={[styles.btnText, { color: Colors.danger }]}>✖ Simular pago fallido</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // WebView real con Mercado Pago
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleFailure} style={styles.backBtn}>
          <Text style={styles.backText}>✖</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago seguro</Text>
        <View style={{ minWidth: 32 }} />
      </View>
      <WebView
        source={{ uri: checkoutUrl as string }}
        onNavigationStateChange={(navState) => {
          const url = navState.url;
          if (url.includes('safepay://') || url.includes('/success') || url.includes('status=approved')) {
            handleSuccess();
          } else if (url.includes('/failure') || url.includes('status=rejected') || url.includes('status=cancelled')) {
            handleFailure();
          }
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:     { minWidth: 32 },
  backText:    { fontSize: 20, color: Colors.primary },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  hint:        { color: Colors.textSecondary, marginTop: 8 },
  errorText:   { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
  devEmoji:    { fontSize: 48 },
  devTitle:    { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  devSub:      { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  btn:         { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', width: '100%' },
  btnOutline:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.danger },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
