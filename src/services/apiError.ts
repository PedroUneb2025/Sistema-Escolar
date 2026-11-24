import axios from 'axios';

export function getApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  if (!error.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  if (error.response.status === 401) return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if (error.response.status === 403) return 'Seu perfil não tem permissão para realizar esta operação.';
  if (error.response.status === 429) {
    const detail429: unknown = error.response.data?.detail;
    return typeof detail429 === 'string' ? detail429 : 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  }
  if (error.response.status >= 500) return 'O servidor está indisponível no momento. Tente novamente.';
  const detail: unknown = error.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg ?? 'Campo inválido').join(' ');
  return fallback;
}

/**
 * Segundos de espera quando o login foi barrado por excesso de tentativas (HTTP 429).
 * Lê o cabeçalho Retry-After; se o navegador não o expuser, usa os minutos da mensagem
 * ("Tente de novo em 2 minutos"). Devolve null quando o erro não é um 429.
 */
export function getRetryAfterSeconds(error: unknown): number | null {
  // O AuthContext relança o erro como Error com a causa original (o erro do Axios).
  const origem = error instanceof Error && error.cause ? error.cause : error;
  if (!axios.isAxiosError(origem) || origem.response?.status !== 429) return null;

  const segundos = Number.parseInt(String(origem.response.headers?.['retry-after'] ?? ''), 10);
  if (Number.isFinite(segundos) && segundos > 0) return segundos;

  const detail: unknown = origem.response.data?.detail;
  const minutos = typeof detail === 'string' ? /em (\d+) minuto/.exec(detail) : null;
  return minutos ? Number(minutos[1]) * 60 : 60;
}
