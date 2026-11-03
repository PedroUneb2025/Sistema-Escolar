import axios from 'axios';

export function getApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  if (!error.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  if (error.response.status === 401) return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if (error.response.status === 403) return 'Seu perfil não tem permissão para realizar esta operação.';
  if (error.response.status >= 500) return 'O servidor está indisponível no momento. Tente novamente.';
  const detail: unknown = error.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg ?? 'Campo inválido').join(' ');
  return fallback;
}
