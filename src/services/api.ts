import axios from 'axios';

const AUTH_STORAGE_KEYS = {
  token: '@UNEB:token',
  user: '@UNEB:user',
} as const;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
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
