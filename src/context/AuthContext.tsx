import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchCurrentUser, loginRequest } from '../services/api';
import type { AuthContextValue, AuthState, LoginCredentials, User } from '../types/auth';

const AUTH_STORAGE_KEYS = {
  token: '@UNEB:token',
  user: '@UNEB:user',
} as const;

const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function restoreStoredUser(value: string | null): User | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
}

function getStoredSession() {
  const localToken = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  const localUser = restoreStoredUser(localStorage.getItem(AUTH_STORAGE_KEYS.user));

  if (localToken && localUser) return { token: localToken, user: localUser };

  const sessionToken = sessionStorage.getItem(AUTH_STORAGE_KEYS.token);
  const sessionUser = restoreStoredUser(sessionStorage.getItem(AUTH_STORAGE_KEYS.user));

  if (sessionToken && sessionUser) return { token: sessionToken, user: sessionUser };

  return null;
}

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    const storedSession = getStoredSession();

    if (storedSession) {
      setState({
        user: storedSession.user,
        token: storedSession.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    clearStoredSession();
    setState({ ...initialAuthState, isLoading: false });
  }, []);

  const login = useCallback(async ({ email, password, remember = false }: LoginCredentials) => {
    setState((current) => ({ ...current, isLoading: true }));

    try {
      // POST /auth/login (application/x-www-form-urlencoded) — devolve só o token.
      const { access_token: token } = await loginRequest(email, password);

      // Guarda o token antes de chamar /auth/me: o interceptor de api.ts lê o
      // token do storage em cada requisição.
      const storage = remember ? localStorage : sessionStorage;
      clearStoredSession();
      storage.setItem(AUTH_STORAGE_KEYS.token, token);

      // GET /auth/me — é daqui que vem o array `perfis`.
      const me = await fetchCurrentUser();
      const user: User = {
        id: String(me.id_usuario),
        email: me.email,
        status: me.status,
        perfis: me.perfis as User['perfis'],
      };

      storage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));

      setState({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      clearStoredSession();
      setState((current) => ({ ...current, isLoading: false }));

      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        throw new Error('E-mail ou senha incorretos. Confira os dados e tente novamente.');
      }

      throw new Error('Não foi possível realizar o login. Tente novamente em instantes.');
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setState({ ...initialAuthState, isLoading: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [login, logout, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
