// Perfis definidos no seed do backend (backend/app/seed.py, PR #1).
export type UserRole = 'admin' | 'secretaria' | 'coordenacao' | 'professor' | 'aluno' | 'financeiro';

export interface User {
  id: string;
  nome?: string;
  email: string;
  status?: string;
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

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  temPerfil: (perfilRequerido: UserRole) => boolean;
  temAlgumPerfil: (perfisPermitidos: UserRole[]) => boolean;
}