import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
const SESSION_KEY = "uneb-demo-session";
const MFA_DURATION = 5 * 60 * 1000;

const DEMO_ACCOUNT = {
  email: "aluno@uneb.br",
  password: "123456",
  mfaCode: "123456",
  user: {
    id: "20260001",
    name: "Maria Estudante",
    email: "aluno@uneb.br",
    role: "Estudante",
    course: "Sistemas de Informação",
  },
};

const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const readStoredUser = () => {
  try {
    const storedSession = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    try {
      await delay(900);

      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
        throw new Error("E-mail ou senha incorretos.");
      }

      setMfaChallenge({
        email: normalizedEmail,
        maskedDestination: "••••@uneb.br",
        expiresAt: Date.now() + MFA_DURATION,
      });

      return { requiresMfa: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMfa = useCallback(async ({ code, remember = false }) => {
    setIsLoading(true);
    try {
      await delay(800);

      if (!mfaChallenge || Date.now() > mfaChallenge.expiresAt) {
        setMfaChallenge(null);
        throw new Error("O código expirou. Faça o login novamente.");
      }

      if (code !== DEMO_ACCOUNT.mfaCode) {
        throw new Error("Código de verificação inválido.");
      }

      setUser(DEMO_ACCOUNT.user);
      setMfaChallenge(null);

      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_ACCOUNT.user));
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_ACCOUNT.user));
      }

      return DEMO_ACCOUNT.user;
    } finally {
      setIsLoading(false);
    }
  }, [mfaChallenge]);

  const cancelMfa = useCallback(() => setMfaChallenge(null), []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setMfaChallenge(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    mfaChallenge,
    login,
    verifyMfa,
    cancelMfa,
    logout,
  }), [user, isLoading, mfaChallenge, login, verifyMfa, cancelMfa, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
