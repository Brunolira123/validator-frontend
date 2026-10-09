
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Flag pra evitar loop infinito de refresh
let refreshingPromise: Promise<string> | null = null;

function encerrarSessao() {
  useAuthStore.getState().logout();
  window.location.href = '/login';
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const authStore = useAuthStore.getState();

    // Sem config (request cancelado/erro de setup) ou rota de auth: não tenta refresh
    if (!originalRequest || originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Sem refresh token não há como recuperar a sessão
      if (!authStore.refreshToken) {
        encerrarSessao();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = authStore.refresh().finally(() => {
          refreshingPromise = null;
        });
      }

      try {
        const newToken = await refreshingPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        encerrarSessao();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;