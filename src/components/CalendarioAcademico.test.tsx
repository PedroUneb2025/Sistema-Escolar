import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CalendarioAcademico } from './CalendarioAcademico';

describe('CalendarioAcademico - Calendário Institucional UNEB SAGRES', () => {
  it('renderiza o cabeçalho e a navegação de mês', () => {
    render(<CalendarioAcademico />);

    expect(screen.getByRole('heading', { name: 'Calendário Acadêmico' })).toBeVisible();
    expect(screen.getByText(/novembro de 2026/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeVisible();
  });

  it('exibe a lista de eventos acadêmicos de novembro de 2026', () => {
    render(<CalendarioAcademico />);

    expect(screen.getByText(/02\/11 - Finados/i)).toBeVisible();
    expect(screen.getByText(/15\/11 - Proclamação da República/i)).toBeVisible();
    expect(screen.getByText(/19\/11 - Avaliação 3: ET0024/i)).toBeVisible();
    expect(screen.getByText(/VEM ME VER ANO II - UNEB CAMPUS VII/i)).toBeVisible();
  });

  it('permite avançar para dezembro e voltar para novembro', async () => {
    render(<CalendarioAcademico />);

    const user = userEvent.setup();
    const btnProximo = screen.getByRole('button', { name: 'Próximo mês' });
    await user.click(btnProximo);

    expect(screen.getByText(/dezembro de 2026/i)).toBeVisible();
    expect(screen.getByText(/25\/12 - Natal/i)).toBeVisible();

    const btnAnterior = screen.getByRole('button', { name: 'Mês anterior' });
    await user.click(btnAnterior);

    expect(screen.getByText(/novembro de 2026/i)).toBeVisible();
    expect(screen.getByText(/02\/11 - Finados/i)).toBeVisible();
  });
});
