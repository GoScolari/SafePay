import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';

export default function AuthLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(app)' as never);
    }
  }, [isAuthenticated, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#07091A' },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  );
}
