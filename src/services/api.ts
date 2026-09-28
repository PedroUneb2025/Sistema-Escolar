import axios from 'axios';

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

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface MeResponse {
  id_usuario: number;
  email: string;
  status: string;
  perfis: string[];
}

/**
 * POST /auth/login — contrato do backend (backend/README.md, PR #1):
 * exige application/x-www-form-urlencoded com os campos `username` e `password`
 * (nome fixo de `username` porque o backend usa OAuth2PasswordRequestForm, mesmo
 * que o valor enviado seja o e-mail). Retorna apenas o token; os dados do
 * usuário (incluindo `perfis`) vêm de GET /auth/me.
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

/** GET /auth/me — retorna { id_usuario, email, status, perfis: [...] }. */
export async function fetchCurrentUser() {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data;
}

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

/**
 * POST /auth/login — envia o x-www-form-urlencoded e retorna o token de acesso
 */
export async function loginApi(email: string, pass: string): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', pass);

  const { data } = await api.post<LoginResponse>('/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return data;
}
