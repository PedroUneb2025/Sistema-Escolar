import axios from 'axios';
import { isDemoSession, demoAdapter } from './demoMode';
import type { LoginResponse } from '../types/auth';

const AUTH_STORAGE_KEYS = {
  token: '@UNEB:token',
  user: '@UNEB:user',
} as const;

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');

export const api = axios.create({
  timeout: 15000,
  baseURL: configuredApiUrl || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  if (isDemoSession()) {
    config.adapter = demoAdapter;
    config.headers.delete('Authorization');
    return config;
  }
  const token =
    sessionStorage.getItem(AUTH_STORAGE_KEYS.token) ??
    localStorage.getItem(AUTH_STORAGE_KEYS.token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 && error.config?.url !== '/auth/login') {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
      localStorage.removeItem(AUTH_STORAGE_KEYS.token);
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  },
);

export interface MeResponse {
  id_usuario: number;
  email: string;
  status: string;
  perfis: string[];
}

/** POST /auth/login — form-urlencoded com username (e-mail) e password. */
export async function loginRequest(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password });
  const { data } = await api.post<LoginResponse>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

/** GET /auth/me — retorna dados do usuário e perfis. */
export async function fetchCurrentUser() {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data;
}
