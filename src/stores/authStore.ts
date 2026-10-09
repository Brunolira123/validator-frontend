import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { authApi } from '../api/auth';
import type { UsuarioResponse } from '../types/api';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  usuario: UsuarioResponse | null;
  isAuthenticated: boolean;

  login: (login: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      usuario: null,
      isAuthenticated: false,

      login: async (login, senha) => {
        const response = await authApi.login({ login, senha });
        set({
          token: response.token,
          refreshToken: response.refreshToken,
          usuario: response.usuario,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const rt = get().refreshToken;
        if (rt) {
          try {
            await authApi.logout(rt);
          } catch {
            // ignora erro no logout
          }
        }
        set({
          token: null,
          refreshToken: null,
          usuario: null,
          isAuthenticated: false,
        });
      },

      refresh: async () => {
        const rt = get().refreshToken;
        if (!rt) throw new Error('Sem refresh token');
        const response = await authApi.refresh(rt);
        set({ token: response.token });
        return response.token;
      },
    }),
    {
      name: 'validator-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);