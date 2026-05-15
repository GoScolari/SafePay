import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  role: string;
  phoneVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  pendingTxId: string | null;
  setTokens: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  setPendingTx: (txId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,
      pendingTxId:     null,

      setTokens: (accessToken, user) => {
        setAccessToken(accessToken);
        set({ accessToken, user, isAuthenticated: true });
      },

      clearAuth: () => {
        setAccessToken(null);
        set({ accessToken: null, user: null, isAuthenticated: false });
      },

      setPendingTx: (txId) => set({ pendingTxId: txId }),
    }),
    {
      name:    'safepay-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
      },
    },
  ),
);
