import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  withCredentials: true,
});

// Inyectar access token en cada request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = (globalThis as any).__accessToken as string | undefined;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automático al recibir 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const resp = await axios.post<{ accessToken: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const newToken = resp.data.accessToken;
      (globalThis as any).__accessToken = newToken;
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Borrar token y forzar logout
      (globalThis as any).__accessToken = undefined;
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const setAccessToken = (token: string | null) => {
  (globalThis as any).__accessToken = token ?? undefined;
};
