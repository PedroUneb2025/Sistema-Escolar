import type { UserRole } from '../types/auth';

/**
 * Um usuário pode ter mais de um perfil (`perfis: UserRole[]`); a ordem abaixo
 * define a prioridade de para onde mandar quando isso acontecer.
 */
const ROUTE_BY_ROLE: Partial<Record<UserRole, string>> = {
  admin: '/secretaria/gestao',
  secretaria: '/secretaria/gestao',
  coordenacao: '/secretaria/gestao',
  aluno: '/aluno/dashboard',
};

export function getDefaultRoute(perfis: UserRole[]) {
  for (const perfil of Object.keys(ROUTE_BY_ROLE) as UserRole[]) {
    if (perfis.includes(perfil)) return ROUTE_BY_ROLE[perfil]!;
  }

  return '/unauthorized';
}
