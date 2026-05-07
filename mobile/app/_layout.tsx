import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { setAccessToken } from '@/lib/api';

export default function RootLayout() {
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
  }, [accessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor={Colors.surface} />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
