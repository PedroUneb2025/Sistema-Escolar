import { AxiosError } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from './api';
import { consultaAcademicaService } from './consultaAcademicaService';

afterEach(() => vi.restoreAllMocks());

it('propaga a falha da API sem substituir o histórico por dados de exemplo', async () => {
  const erro = new AxiosError('Sem conexão');
  const get = vi.spyOn(api, 'get').mockRejectedValue(erro);
  await expect(consultaAcademicaService.obterConsultaAcademica()).rejects.toBe(erro);
  expect(get).toHaveBeenCalledTimes(1);
});
