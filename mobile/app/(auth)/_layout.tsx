import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace('/(app)');
  }, [isAuthenticated]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
