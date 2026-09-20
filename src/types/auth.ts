export type UserRole = 'ALUNO' | 'PROFESSOR' | 'SECRETARIA' | 'ADMIN';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  curso: string;
  mfaVerified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MFAChallenge {
  user: User;
  token: string;
  maskedDestination: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  mfaChallenge: MFAChallenge | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ requiresMFA: true }>;
  verifyMFA: (code: string, remember?: boolean) => Promise<User>;
  cancelMFA: () => void;
  logout: () => void;
}
