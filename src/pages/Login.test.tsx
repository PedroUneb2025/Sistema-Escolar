import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';
import { api } from '../services/api';

function renderApplication(initialRoute = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

// A integração real (login/autenticação) fala com a API do backend
// (POST /auth/login em application/x-www-form-urlencoded + GET /auth/me,
// ver backend/README.md do PR feature/backend-setup). Aqui mockamos a
// camada HTTP (src/services/api.ts) em vez de bater num backend de verdade.
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    api: { ...actual.api, post: vi.fn(), get: vi.fn() },
  };
});

const mockedApi = vi.mocked(api);

afterEach(() => {
  vi.clearAllMocks();
});

describe('fluxo de autenticação', () => {
  it('mostra mensagens de validação quando os campos estão vazios', async () => {
    const user = userEvent.setup();
    renderApplication();

    const submitButton = screen.getByRole('button', { name: 'Continuar' });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    expect(await screen.findByText('Informe seu e-mail institucional.')).toBeVisible();
    expect(screen.getByText('Informe sua senha.')).toBeVisible();
  });

  it('faz login e abre a rota protegida do aluno', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'token-aluno', token_type: 'bearer' },
    });
    mockedApi.get.mockResolvedValueOnce({
      data: { id_usuario: 20260001, email: 'aluno@uneb.br', status: 'ativo', perfis: ['aluno'] },
    });

    const user = userEvent.setup();
    renderApplication();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled());
    await user.type(screen.getByLabelText('E-mail institucional'), 'aluno@uneb.br');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/auth/login',
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Olá, aluno!' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Navegação acadêmica' })).toBeVisible();
  });

  it('mostra erro quando as credenciais são inválidas (401)', async () => {
    mockedApi.post.mockRejectedValueOnce({ response: { status: 401 } });

    const user = userEvent.setup();
    renderApplication();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled());
    await user.type(screen.getByLabelText('E-mail institucional'), 'aluno@uneb.br');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('E-mail ou senha incorretos. Confira os dados e tente novamente.'),
    ).toBeVisible();
  });

  it('bloqueia uma rota quando o perfil não possui permissão', async () => {
    sessionStorage.setItem('@UNEB:token', 'token-secretaria');
    sessionStorage.setItem(
      '@UNEB:user',
      JSON.stringify({
        id: 'SEC-001',
        email: 'secretaria@uneb.br',
        status: 'ativo',
        perfis: ['secretaria'],
      }),
    );

    renderApplication('/aluno/dashboard');

    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  });
});
