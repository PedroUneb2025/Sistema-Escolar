import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchCurrentUser, loginRequest, type MeResponse } from '../services/api';
import type { AuthContextValue, AuthState, LoginCredentials, User, UserRole } from '../types/auth';

import { DEMO_ENABLED, isDemoSession, startDemoSession, endDemoSession } from '../services/demoMode';
import { getApiError } from '../services/apiError';

const demoUser: User = { id: 'demo', email: 'secretaria@exemplo.com', status: 'ativo', perfis: ['secretaria'] };
const demoAluno: User = { id: 'aluno-demo', email: 'aluno@uneb.br', nome: 'Aluno Demonstração', status: 'ativo', perfis: ['aluno'] };
const demoDirecao: User = { id: 'direcao-demo', email: 'direcao@uneb.br', nome: 'Direção Acadêmica', status: 'ativo', perfis: ['admin', 'secretaria', 'coordenacao'] };

function toUser(me: MeResponse): User {
  if (!me || !me.id_usuario || !me.email || !Array.isArray(me.perfis) || me.status !== 'ativo') {
    throw new Error('Usuário inválido ou inativo.');
  }

  const perfisFormatados = me.perfis.map((p) => {
    const perfilLimpo = p.replace(/^ROLE_/i, '').toLowerCase();
    return perfilLimpo as UserRole;
  });

  return {
    id: String(me.id_usuario),
    email: me.email,
    status: me.status,
    perfis: perfisFormatados,
  };
}

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

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);

  const logout = useCallback(() => {
    clearStoredSession();
    endDemoSession();
    setState({ ...initialAuthState, isLoading: false });
  }, []);

  const loginDemo = useCallback(() => {
    if (!DEMO_ENABLED) return;
    clearStoredSession();
    startDemoSession();
    setState({ user: demoUser, token: null, isAuthenticated: true, isLoading: false });
  }, []);

  const loginDiretoAluno = useCallback(() => {
    clearStoredSession();
    sessionStorage.setItem(AUTH_STORAGE_KEYS.token, 'temp-token-aluno');
    sessionStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(demoAluno));
    setState({ user: demoAluno, token: 'temp-token-aluno', isAuthenticated: true, isLoading: false });
  }, []);

  const loginDiretoDirecao = useCallback(() => {
    clearStoredSession();
    sessionStorage.setItem(AUTH_STORAGE_KEYS.token, 'temp-token-direcao');
    sessionStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(demoDirecao));
    setState({ user: demoDirecao, token: 'temp-token-direcao', isAuthenticated: true, isLoading: false });
  }, []);

  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem(AUTH_STORAGE_KEYS.token) ?? localStorage.getItem(AUTH_STORAGE_KEYS.token);
    const storedUserRaw = sessionStorage.getItem(AUTH_STORAGE_KEYS.user) ?? localStorage.getItem(AUTH_STORAGE_KEYS.user);
    
    window.addEventListener('auth:expired', logout);

    if (token?.startsWith('temp-token-') && storedUserRaw) {
      try {
        const parsed = JSON.parse(storedUserRaw) as User;
        setState({ user: parsed, token, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        // ignora e continua
      }
    }

    if (isDemoSession()) {
      setState({ user: demoUser, token: null, isAuthenticated: true, isLoading: false });
    } else if (token && !token.startsWith('mock-')) {
      fetchCurrentUser()
        .then((me) => {
          if (active) setState({ user: toUser(me), token, isAuthenticated: true, isLoading: false });
        })
        .catch(() => {
          if (active) logout();
        });
    } else {
      logout();
    }

    return () => {
      active = false;
      window.removeEventListener('auth:expired', logout);
    };
  }, [logout]);

  const login = useCallback(
    async ({ email, password, remember = false }: LoginCredentials) => {
      endDemoSession();
      clearStoredSession();
      setState({ ...initialAuthState, isLoading: true });

      try {
        const { access_token: token } = await loginRequest(email.trim(), password);

        if (!token || typeof token !== 'string') {
          throw new Error('Resposta de autenticação inválida.');
        }

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(AUTH_STORAGE_KEYS.token, token);

        const meData = await fetchCurrentUser();
        const user = toUser(meData);
        
        storage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
        
        setState({ user, token, isAuthenticated: true, isLoading: false });
        return user;
      } catch (error) {
        logout();
        throw new Error(getApiError(error, 'Não foi possível entrar. Tente novamente.'), { cause: error });
      }
    },
    [logout],
  );

  const temPerfil = useCallback(
    (perfilRequerido: UserRole): boolean => {
      if (!state.user?.perfis) return false;
      return state.user.perfis.includes(perfilRequerido);
    },
    [state.user],
  );

  const temAlgumPerfil = useCallback(
    (perfisPermitidos: UserRole[]): boolean => {
      if (!state.user?.perfis) return false;
      return state.user.perfis.some((p) => perfisPermitidos.includes(p));
    },
    [state.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, loginDemo, loginDiretoAluno, loginDiretoDirecao, logout, temPerfil, temAlgumPerfil }),
    [login, loginDemo, loginDiretoAluno, loginDiretoDirecao, logout, temPerfil, temAlgumPerfil, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};  