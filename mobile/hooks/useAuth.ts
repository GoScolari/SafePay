import { useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface RegisterPayload { phone: string; fullName: string }
interface LoginPayload    { phone: string }
interface VerifyOtpPayload { phone: string; code: string }

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const { setTokens, clearAuth } = useAuthStore();

  const clearError = () => setError(null);

  const register = async (payload: RegisterPayload) => {
    setLoading(true); setError(null);
    try {
      await api.post('/auth/register', payload);
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: payload.phone, mode: 'register' } });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (payload: LoginPayload) => {
    setLoading(true); setError(null);
    try {
      await api.post('/auth/login', payload);
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: payload.phone, mode: 'login' } });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Teléfono no registrado.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (payload: VerifyOtpPayload) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post<{ accessToken: string; user: any }>('/auth/verify-otp', payload);
      setTokens(data.accessToken, data.user);
      router.replace('/(app)');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Código incorrecto. Intenta de nuevo.');
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
    router.replace('/(auth)/login');
  };

  return { loading, error, clearError, register, login, verifyOtp, logout };
}
