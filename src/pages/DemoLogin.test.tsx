import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, expect, it, vi } from 'vitest';
vi.hoisted(() => { vi.stubEnv('VITE_ENABLE_DEMO', 'true'); });
import { AuthProvider } from '../context/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';
import { api } from '../services/api';
afterAll(() => vi.unstubAllEnvs());
it('entra pelo botão de teste e encerra a sessão sem chamadas de rede', async () => {
  const original = api.defaults.adapter;
  const network = vi.fn().mockRejectedValue(new Error('Não deveria chamar a rede'));
  api.defaults.adapter = network;
  try {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Entrar em modo de teste' }));
    expect(await screen.findByRole('heading', { name: 'Cursos' })).toBeVisible();
    expect(await screen.findByText('Sistemas de Informação')).toBeVisible();
    expect(network).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
    expect(sessionStorage.getItem('@UNEB:demo-session')).toBeNull();
  } finally { api.defaults.adapter = original; }
});
