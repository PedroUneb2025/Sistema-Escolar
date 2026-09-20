import type { UserRole } from '../types/auth';

export function getDefaultRoute(role: UserRole) {
  if (role === 'ALUNO') return '/aluno/dashboard';
  if (role === 'SECRETARIA' || role === 'ADMIN') return '/secretaria/gestao';
  return '/unauthorized';
}
