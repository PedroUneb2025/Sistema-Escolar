// Perfis definidos no seed do backend (backend/app/seed.py, PR #1).
// Lista provisória segundo o próprio backend — confirmar com o time antes de travar em enum.
export type UserRole = 'admin' | 'secretaria' | 'coordenacao' | 'professor' | 'aluno' | 'financeiro';

export interface User {
  id: string;
  email: string;
  status: string;
  perfis: UserRole[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
}
