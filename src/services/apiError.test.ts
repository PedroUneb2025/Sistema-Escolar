import { describe, expect, it } from 'vitest';
import { getApiError, getRetryAfterSeconds } from './apiError';

const erro429 = (headers: Record<string, string>, detail?: unknown) => ({
  isAxiosError: true,
  response: { status: 429, headers, data: detail === undefined ? {} : { detail } },
});

describe('getRetryAfterSeconds', () => {
  it('lê o cabeçalho Retry-After', () => {
    expect(getRetryAfterSeconds(erro429({ 'retry-after': '30' }))).toBe(30);
  });

  it('acha o erro do Axios dentro da causa de um Error', () => {
    const erro = new Error('Muitas tentativas.', { cause: erro429({ 'retry-after': '900' }) });
    expect(getRetryAfterSeconds(erro)).toBe(900);
  });

  it('sem o cabeçalho, usa os minutos da mensagem', () => {
    expect(getRetryAfterSeconds(erro429({}, 'Muitas tentativas. Tente de novo em 8 minutos'))).toBe(480);
    expect(getRetryAfterSeconds(erro429({}, 'Muitas tentativas. Tente de novo em 1 minuto'))).toBe(60);
  });

  it('sem cabeçalho nem minutos, espera 1 minuto', () => {
    expect(getRetryAfterSeconds(erro429({}))).toBe(60);
    expect(getRetryAfterSeconds(erro429({ 'retry-after': 'abc' }))).toBe(60);
  });

  it('devolve null quando não é um 429', () => {
    expect(getRetryAfterSeconds({ isAxiosError: true, response: { status: 401 } })).toBeNull();
    expect(getRetryAfterSeconds(new Error('qualquer'))).toBeNull();
    expect(getRetryAfterSeconds(undefined)).toBeNull();
  });
});

describe('getApiError com 429', () => {
  it('mostra a mensagem da API', () => {
    expect(getApiError(erro429({}, 'Muitas tentativas. Tente de novo em 2 minutos'), 'x'))
      .toBe('Muitas tentativas. Tente de novo em 2 minutos');
  });

  it('usa um texto padrão se a API não mandar o detail', () => {
    expect(getApiError(erro429({}), 'x')).toBe('Muitas tentativas. Aguarde um pouco e tente novamente.');
  });
});
