import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pendingTxId     = useAuthStore((s) => s.pendingTxId);
  const setPendingTx    = useAuthStore((s) => s.setPendingTx);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome' as never);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (pendingTxId) {
      setPendingTx(null);
      router.push(`/(app)/transactions/${pendingTxId}` as never);
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transactions/[id]" />
      <Stack.Screen name="transactions/new" />
      <Stack.Screen name="transactions/pay" />
      <Stack.Screen name="transactions/photos" />
      <Stack.Screen name="transactions/tracking" />
      <Stack.Screen name="transactions/archived" />
      <Stack.Screen name="disputes/[id]" />
      <Stack.Screen name="disputes/new" />
    </Stack>
  );
}
