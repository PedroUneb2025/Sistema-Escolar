import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MatriculaOnline } from './MatriculaOnline';
import { api } from '../../services/api';
import { matriculaService } from '../../services/matriculaService';

const auth = vi.hoisted(() => ({ token: 'token-aluno-real' as string | null }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));
const turma = { id: '1', codigo: 'ALG-01', disciplina: 'Algoritmos', professor: 'Prof. Ana', semestre: '2026.2', diaSemana: 'Segunda-feira', horarioInicio: '08:00', horarioFim: '10:00', sala: 'Sala 1', vagas: 30, vagasOcupadas: 10, status: 'aberta' };
const matricula = { id_matricula_turma: 55, id_turma: 1, situacao: 'matriculado', codigo_turma: 'ALG-01', semestre_letivo: '2026.2', disciplina_nome: 'Algoritmos', professor_nome: 'Prof. Ana', sala_codigo: 'Sala 1', dia_semana: 'SEG', hora_inicio: '08:00:00', hora_fim: '10:00:00' };
const show = () => render(<MemoryRouter><MatriculaOnline /></MemoryRouter>);
beforeEach(() => { auth.token = 'token-aluno-real'; sessionStorage.setItem('@UNEB:token', auth.token); });
afterEach(() => vi.restoreAllMocks());
function available() {
  return vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/turmas' ? [turma] : [] }));
}

describe('matrícula online', () => {
  it('seleciona, confirma uma única vez e mostra a matrícula retornada pelo servidor', async () => {
    let enrolled = false;
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/turmas' ? [turma] : enrolled ? [matricula] : [] }));
    const post = vi.spyOn(api, 'post').mockImplementation(async () => { enrolled = true; return { data: matricula }; });
    const user = userEvent.setup(); show();
    await user.click(await screen.findByRole('button', { name: 'Selecionar ALG-01' }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Confirme sua matrícula' })).toBeVisible();
    await user.dblClick(screen.getByRole('button', { name: 'Confirmar matrícula' }));
    expect(post).toHaveBeenCalledExactlyOnceWith('/matriculas', { id_turma: 1 });
    expect(api.get).toHaveBeenCalledWith('/matriculas/minhas', expect.any(Object));
    expect(await screen.findByText(/Matrícula confirmada em Algoritmos/)).toBeVisible();
    expect(within(screen.getByRole('table', { name: 'Matrículas registradas' })).getByText('Matriculado')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Selecionar ALG-01' })).not.toBeInTheDocument();
  });
  it('cancelar a seleção não envia matrícula', async () => {
    available(); const post = vi.spyOn(api, 'post'); const user = userEvent.setup(); show();
    await user.click(await screen.findByRole('button', { name: 'Selecionar ALG-01' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar seleção' }));
    expect(screen.queryByRole('heading', { name: 'Confirme sua matrícula' })).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it('bloqueia turma já matriculada, lotada, fechada e horário conflitante', async () => {
    const turmas = [turma, { ...turma, id: '2', codigo: 'LOT-01', vagasOcupadas: 30 }, { ...turma, id: '3', codigo: 'FECH-01', status: 'fechada' }, { ...turma, id: '4', codigo: 'CONFLITO-01' }];
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/turmas' ? turmas : [matricula] }));
    show();
    expect(await screen.findByText('Já possui matrícula nesta turma')).toBeVisible();
    expect(screen.getByText('Sem vagas')).toBeVisible();
    expect(screen.getByText('Turma fechada')).toBeVisible();
    expect(screen.getByText('Conflito com seu horário atual')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Selecionar / })).not.toBeInTheDocument();
  });
  it('filtra a oferta por busca e semestre', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/turmas' ? [turma, { ...turma, id: '2', codigo: 'MAT-01', disciplina: 'Matemática', semestre: '2027.1' }] : [] }));
    const user = userEvent.setup(); show();
    await screen.findByRole('button', { name: 'Selecionar ALG-01' });
    await user.selectOptions(screen.getByLabelText('Semestre'), '2027.1');
    expect(screen.queryByRole('button', { name: 'Selecionar ALG-01' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'inexistente');
    expect(screen.getByText('Nenhuma turma encontrada com esses filtros.')).toBeVisible();
  });
  it.each([409, 403, 422, 500])('exibe falha HTTP %s sem anunciar sucesso', async (status) => {
    available(); vi.spyOn(api, 'post').mockRejectedValue({ isAxiosError: true, response: { status, data: { detail: 'Matrícula recusada' } } });
    const user = userEvent.setup(); show();
    await user.click(await screen.findByRole('button', { name: 'Selecionar ALG-01' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar matrícula' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByText(/Matrícula confirmada em/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar matrícula' })).toBeDisabled();
  });
  it('permite atualizar após erro na listagem, sem dados fictícios', async () => {
    const get = available(); get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    const user = userEvent.setup(); show();
    expect(await screen.findByRole('alert')).toHaveTextContent('não está disponível');
    expect(screen.queryByText('Algoritmos')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar listas' }));
    expect(await screen.findByRole('button', { name: 'Selecionar ALG-01' })).toBeEnabled();
  });
  it('preserva a confirmação quando só a atualização posterior falha', async () => {
    const get = available();
    vi.spyOn(api, 'post').mockImplementation(async () => { get.mockRejectedValue(new Error('offline')); return { data: matricula }; });
    const user = userEvent.setup(); show();
    await user.click(await screen.findByRole('button', { name: 'Selecionar ALG-01' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar matrícula' }));
    expect(await screen.findByText(/Matrícula confirmada em/)).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent('mas não foi possível atualizar');
    expect(within(screen.getByRole('table', { name: 'Matrículas registradas' })).getByText('55')).toBeVisible();
  });
  it('rejeita resposta de matrícula incompatível e resposta de outra turma', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({ data: { ...matricula, id_turma: 2 } });
    await expect(matriculaService.matricular({ id_turma: 1 })).rejects.toThrow('incompatíveis');
    await expect(matriculaService.matricular({ id_turma: 1 })).rejects.toThrow('Não foi possível confirmar');
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('bloqueia contas de demonstração sem consultar a API', async () => {
    auth.token = 'temp-token-aluno'; sessionStorage.setItem('@UNEB:token', auth.token);
    const get = vi.spyOn(api, 'get'); const post = vi.spyOn(api, 'post'); show();
    expect(screen.getByRole('alert')).toHaveTextContent('conta real de aluno');
    await expect(matriculaService.matricular({ id_turma: 1 })).rejects.toThrow('conta real');
    expect(get).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
  });
  it('carrega mais de uma página de turmas', async () => {
    const pagina = Array.from({ length: 500 }, (_, i) => ({ ...turma, id: String(i + 1) }));
    const get = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: pagina }).mockResolvedValueOnce({ data: [{ ...turma, id: '501' }] });
    expect(await matriculaService.listarTurmas()).toHaveLength(501);
    expect(get).toHaveBeenLastCalledWith('/turmas', { signal: undefined, params: { limite: 500, offset: 500 } });
  });
  it('detecta conflito com matrícula cuja turma não está na oferta', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/turmas' ? [{ ...turma, id: '2' }] : [matricula] }));
    show();
    expect(await screen.findByText('Conflito com seu horário atual')).toBeVisible();
  });
  it('rejeita lista de turmas malformada', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [{ ...turma, id: 'turma-demo' }] });
    await expect(matriculaService.listarTurmas()).rejects.toThrow('incompatíveis');
  });
});
