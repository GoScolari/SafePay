import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface SendOtpPayload {
  phone: string;
  mode: 'login' | 'register';
  fullName?: string;
}
interface VerifyOtpPayload { phone: string; code: string }

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setTokens, clearAuth } = useAuthStore();

  const sendOtp = async (payload: SendOtpPayload) => {
    setLoading(true);
    try {
      if (payload.mode === 'register') {
        await api.post('/auth/register', { phone: payload.phone, fullName: payload.fullName });
      } else {
        await api.post('/auth/login', { phone: payload.phone });
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (payload: VerifyOtpPayload) => {
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: any }>('/auth/verify-otp', payload);
      setTokens(data.accessToken, data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignorar errores de red en logout */ }
    await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
    clearAuth();
  };

  return { isPending: loading, loading, sendOtp, verifyOtp, logout };
}
