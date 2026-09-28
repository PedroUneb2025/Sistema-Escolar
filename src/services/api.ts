import axios from 'axios';
import type { LoginResponse, UserRole } from '../types/auth';

const AUTH_STORAGE_KEYS = {
  token: '@UNEB:token',
  user: '@UNEB:user',
} as const;

export const api = axios.create({
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

    if (status === 401 || status === 403) {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
      localStorage.removeItem(AUTH_STORAGE_KEYS.token);
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);

      if (window.location.hash !== '#/login') {
        window.location.assign(`${window.location.pathname}#/login`);
      }
    }

    return Promise.reject(error);
  },
);

export interface MeResponse {
  id_usuario: number;
  email: string;
  status: string;
  perfis: UserRole[];
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