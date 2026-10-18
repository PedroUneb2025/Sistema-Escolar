
export type UserRole = 'ADMIN' | 'PROFESSOR' | 'ALUNO' | 'SECRETARIA';

export const mapApiRolesToFrontRoles = (apiRoles: string[]): UserRole[] => {
  const roleMap: Record<string, UserRole> = {
    'ROLE_ADMIN': 'ADMIN',
    'ROLE_ADMINISTRADOR': 'ADMIN',
    'ROLE_PROFESSOR': 'PROFESSOR',
    'ROLE_TEACHER': 'PROFESSOR',
    'ROLE_ALUNO': 'ALUNO',
    'ROLE_STUDENT': 'ALUNO',
    'ROLE_SECRETARIA': 'SECRETARIA',
  };

  return apiRoles
    .map((role) => roleMap[role.toUpperCase()])
    .filter((role): role is UserRole => Boolean(role));
};