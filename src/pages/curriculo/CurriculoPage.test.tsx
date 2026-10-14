import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';
import { CurriculoPage, type CurriculoKind } from './CurriculoPage';

const course = { id_curso: 1, codigo: 'SI', nome: 'Sistemas de Informação', grau: 'Bacharelado' };
function renderPage(kind: CurriculoKind, mode: 'list' | 'create' | 'edit' = 'list') {
  const path = `/curriculo/${kind}`;
  return render(<MemoryRouter initialEntries={[mode === 'edit' ? `${path}/3/editar` : mode === 'create' ? `${path}/novo` : path]}><Routes>
    <Route path={path} element={<CurriculoPage kind={kind} />} />
    <Route path={`${path}/novo`} element={<CurriculoPage kind={kind} mode="create" />} />
    <Route path={`${path}/:id/editar`} element={<CurriculoPage kind={kind} mode="edit" />} />
  </Routes></MemoryRouter>);
}
afterEach(() => vi.restoreAllMocks());

describe('gestão curricular pela API', () => {
  it('lista cursos e filtra por nome', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [course] });
    const user = userEvent.setup();
    renderPage('cursos');
    expect(await screen.findByText(course.nome)).toBeVisible();
    await user.type(screen.getByRole('searchbox'), 'outro');
    expect(screen.getByText('Nenhum resultado para os filtros selecionados.')).toBeVisible();
  });

  it('cria curso e recarrega a listagem', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [course] });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: course });
    const user = userEvent.setup();
    renderPage('cursos', 'create');
    await user.type(await screen.findByLabelText('Código *'), 'SI');
    await user.type(screen.getByLabelText('Nome *'), course.nome);
    await user.type(screen.getByLabelText('Grau *'), course.grau);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(post).toHaveBeenCalledWith('/cursos', { codigo: 'SI', nome: course.nome, grau: course.grau });
    expect(await screen.findByText('Dados salvos com sucesso.')).toBeVisible();
    expect(await screen.findByText(course.nome)).toBeVisible();
  });

  it('edita disciplina e mantém formulário após conflito', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id_disciplina: 3, codigo: 'ALG', nome: 'Algoritmos', ementa: null } });
    const put = vi.spyOn(api, 'put').mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Código já cadastrado' } } });
    const user = userEvent.setup();
    renderPage('disciplinas', 'edit');
    await user.type(await screen.findByLabelText('Ementa'), 'Introdução');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(put).toHaveBeenCalledWith('/disciplinas/3', { codigo: 'ALG', nome: 'Algoritmos', ementa: 'Introdução' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Código já cadastrado');
    expect(screen.getByLabelText('Ementa')).toHaveValue('Introdução');
  });

  it('cria matriz com curso e carga horária numéricos', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/cursos' ? [course] : [] }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage('matrizes', 'create');
    await user.selectOptions(await screen.findByLabelText('Curso *'), '1');
    await user.type(screen.getByLabelText('Versão/ano *'), '2026');
    await user.type(screen.getByLabelText('Carga horária total (horas) *'), '3000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(post).toHaveBeenCalledWith('/matrizes', { id_curso: 1, versao_ano: '2026', carga_horaria_total: 3000, ativo: true });
  });

  it('edita somente os campos permitidos da matriz e exibe negativa de acesso', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/cursos' ? [course] : { id_matriz: 3, id_curso: 1, versao_ano: '2026', carga_horaria_total: 3000, ativo: true } }));
    const put = vi.spyOn(api, 'put').mockRejectedValue({ isAxiosError: true, response: { status: 403 } });
    const user = userEvent.setup();
    renderPage('matrizes', 'edit');
    expect(await screen.findByLabelText('Curso *')).toBeDisabled();
    expect(screen.getByLabelText('Versão/ano *')).toBeDisabled();
    await user.click(screen.getByLabelText('Matriz ativa'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(put).toHaveBeenCalledWith('/matrizes/3', { carga_horaria_total: 3000, ativo: false });
    expect(await screen.findByRole('alert')).toHaveTextContent('Seu perfil não tem permissão');
  });

  it('permite repetir uma listagem após falha sem simular dados', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValueOnce({ isAxiosError: true }).mockResolvedValueOnce({ data: [] });
    const user = userEvent.setup();
    renderPage('disciplinas');
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum registro cadastrado.')).toBeVisible();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
