import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';

function renderApplication(initialRoute = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

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

  it('faz login, valida o MFA e abre a rota protegida do aluno', async () => {
    const user = userEvent.setup();
    renderApplication();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled());
    await user.type(screen.getByLabelText('E-mail institucional'), 'aluno@uneb.br');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('heading', { name: 'Confirme que é você' })).toBeVisible();

    await user.type(screen.getByLabelText('Código de verificação'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verificar e entrar' }));

    expect(await screen.findByRole('heading', { name: 'Olá, Maria!' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Navegação acadêmica' })).toBeVisible();
  });

  it('bloqueia uma rota quando o perfil não possui permissão', async () => {
    sessionStorage.setItem('@UNEB:token', 'token-secretaria');
    sessionStorage.setItem(
      '@UNEB:user',
      JSON.stringify({
        id: 'SEC-001',
        nome: 'Ana Secretaria',
        email: 'secretaria@uneb.br',
        role: 'SECRETARIA',
        curso: 'Secretaria Acadêmica',
        mfaVerified: true,
      }),
    );

    renderApplication('/aluno/dashboard');

    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  });
});
