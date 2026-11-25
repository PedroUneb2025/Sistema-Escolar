import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { GestaoSecretaria } from './GestaoSecretaria';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'secretaria@example.test', perfis: ['secretaria'] } }),
}));
afterEach(() => vi.restoreAllMocks());

it('conta alunos ativos de todas as páginas e somente turmas abertas', async () => {
  vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    if (url === '/turmas') return { data: [{ status: 'aberta' }, { status: 'fechada' }] };
    if ((config?.params as { offset?: number } | undefined)?.offset === 500) return { data: [{ status: 'ativo' }] };
    return { data: [{ status: 'ativo' }, ...Array(499).fill({ status: 'inativo' })] };
  });
  render(<MemoryRouter><GestaoSecretaria /></MemoryRouter>);
  expect(await screen.findByText('2')).toBeVisible();
  expect(await screen.findByText('1')).toBeVisible();
  expect(screen.queryByText('Solicitações')).not.toBeInTheDocument();
});

it('distingue uma consulta indisponível de uma contagem igual a zero', async () => {
  vi.spyOn(api, 'get').mockImplementation(async url => {
    if (url === '/turmas') throw new Error('offline');
    return { data: [] };
  });
  render(<MemoryRouter><GestaoSecretaria /></MemoryRouter>);
  const [alunos, turmas] = screen.getAllByRole('article');
  expect(await within(alunos).findByText('0')).toBeVisible();
  expect(await within(turmas).findByText('Indisponível')).toBeVisible();
});
