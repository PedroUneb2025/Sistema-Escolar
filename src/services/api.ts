import axios from 'axios';
import type { LoginResponse } from '../types/auth';

const AUTH_STORAGE_KEYS = {
  token: '@UNEB:token',
  user: '@UNEB:user',
} as const;

export const api = axios.create({
  timeout: 15000,
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
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

/**
 * POST /auth/login — exige application/x-www-form-urlencoded com `username` e `password`
 */
export async function loginRequest(email: string, password: string) {
  const body = new URLSearchParams();
  body.set('username', email);
  body.set('password', password);

  const { data } = await api.post<LoginResponse>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return data;
}

/** GET /auth/me — retorna dados do usuário e perfis */
export async function fetchCurrentUser() {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data;
}