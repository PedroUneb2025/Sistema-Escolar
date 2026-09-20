import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuthContextValue,
  AuthState,
  LoginCredentials,
  MFAChallenge,
  User,
} from '../types/auth';

const AUTH_STORAGE_KEYS = {
  token: '@UNEB:token',
  user: '@UNEB:user',
} as const;

const MFA_CODE = '123456';
const MFA_DURATION = 5 * 60 * 1000;

interface DemoAccount {
  password: string;
  user: Omit<User, 'mfaVerified'>;
}

const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  'aluno@uneb.br': {
    password: '123456',
    user: {
      id: '20260001',
      nome: 'Maria Estudante',
      email: 'aluno@uneb.br',
      role: 'ALUNO',
      curso: 'Sistemas de Informação',
    },
  },
  'secretaria@uneb.br': {
    password: '123456',
    user: {
      id: 'SEC-001',
      nome: 'Ana Secretaria',
      email: 'secretaria@uneb.br',
      role: 'SECRETARIA',
      curso: 'Secretaria Acadêmica',
    },
  },
  'admin@uneb.br': {
    password: '123456',
    user: {
      id: 'ADM-001',
      nome: 'Carlos Administrador',
      email: 'admin@uneb.br',
      role: 'ADMIN',
      curso: 'Administração do sistema',
    },
  },
};

const initialAuthState: AuthState = {
  user: null,
  token: null,
  mfaChallenge: null,
  isAuthenticated: false,
  isLoading: true,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

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
        mfaChallenge: null,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    clearStoredSession();
    setState({ ...initialAuthState, isLoading: false });
  }, []);

  const login = useCallback(async ({ email, password }: LoginCredentials) => {
    setState((current) => ({ ...current, isLoading: true }));

    try {
      await delay(700);
      const normalizedEmail = email.trim().toLowerCase();
      const account = DEMO_ACCOUNTS[normalizedEmail];

      if (!account || account.password !== password) {
        throw new Error('E-mail ou senha incorretos. Confira os dados e tente novamente.');
      }

      const pendingUser: User = { ...account.user, mfaVerified: false };
      const challenge: MFAChallenge = {
        user: pendingUser,
        token: `demo-token-${pendingUser.role.toLowerCase()}`,
        maskedDestination: normalizedEmail.replace(/^(.{2}).*(@.*)$/, '$1••••$2'),
        expiresAt: Date.now() + MFA_DURATION,
      };

      setState({
        user: null,
        token: null,
        mfaChallenge: challenge,
        isAuthenticated: false,
        isLoading: false,
      });

      return { requiresMFA: true as const };
    } catch (error) {
      setState((current) => ({ ...current, isLoading: false }));
      throw error;
    }
  }, []);

  const verifyMFA = useCallback(
    async (code: string, remember = false) => {
      const challenge = state.mfaChallenge;
      setState((current) => ({ ...current, isLoading: true }));

      try {
        await delay(600);

        if (!challenge || Date.now() > challenge.expiresAt) {
          throw new Error('O código expirou. Volte ao login para solicitar um novo.');
        }

        if (code !== MFA_CODE) {
          throw new Error('Código de verificação inválido.');
        }

        const verifiedUser: User = { ...challenge.user, mfaVerified: true };
        const storage = remember ? localStorage : sessionStorage;

        clearStoredSession();
        storage.setItem(AUTH_STORAGE_KEYS.token, challenge.token);
        storage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(verifiedUser));

        setState({
          user: verifiedUser,
          token: challenge.token,
          mfaChallenge: null,
          isAuthenticated: true,
          isLoading: false,
        });

        return verifiedUser;
      } catch (error) {
        setState((current) => ({ ...current, isLoading: false }));
        throw error;
      }
    },
    [state.mfaChallenge],
  );

  const cancelMFA = useCallback(() => {
    setState((current) => ({ ...current, mfaChallenge: null, isLoading: false }));
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setState({ ...initialAuthState, isLoading: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, verifyMFA, cancelMFA, logout }),
    [cancelMFA, login, logout, state, verifyMFA],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
