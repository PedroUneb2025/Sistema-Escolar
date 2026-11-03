import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TurmasList } from './TurmasList';
import { TurmaCreate } from './TurmaCreate';
import { turmaService, ScheduleConflictError } from '../../services/turmaService';

describe('Módulo de Turmas (CRUD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    turmaService.restaurarDadosPadrao();
  });

  it('renderiza a lista de turmas com dados e métricas', async () => {
    render(
      <MemoryRouter>
        <TurmasList />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Turmas e Horários' })).toBeVisible();
    expect(await screen.findByText('Cálculo Diferencial e Integral I')).toBeVisible();
    expect(screen.getByText('MAT0123-T01')).toBeVisible();
    expect(screen.getByText('Prof. Dr. Carlos Eduardo')).toBeVisible();
  });

  it('permite filtrar turmas pelo campo de busca', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TurmasList />
      </MemoryRouter>,
    );

    await screen.findByText('Cálculo Diferencial e Integral I');
    const inputBusca = screen.getByRole('textbox', { name: 'Buscar turmas' });

    await user.type(inputBusca, 'Estruturas de Dados');

    expect(screen.getByText('Estruturas de Dados e Algoritmos')).toBeVisible();
    expect(screen.queryByText('Cálculo Diferencial e Integral I')).toBeNull();
  });

  it('abre o modal de confirmação de exclusão ao clicar no botão Excluir', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TurmasList />
      </MemoryRouter>,
    );

    const botoesExcluir = await screen.findAllByRole('button', { name: /excluir turma/i });
    await user.click(botoesExcluir[0]);

    expect(
      screen.getByRole('heading', { name: 'Confirmar exclusão de turma' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sim, excluir turma' })).toBeVisible();
  });

  describe('Regra de Negócio: Tratamento de Conflito de Horário', () => {
    it('exibe alerta visual claro de conflito de horário quando a API retorna erro de validação', async () => {
      // Mock do turmaService.criar para simular o retorno de conflito do backend
      vi.spyOn(turmaService, 'criar').mockRejectedValueOnce(
        new ScheduleConflictError(
          'Conflito de horário detectado: a sala "Pavilhão 2 - Sala 104" já está ocupada na Segunda-feira das 08:00 às 10:00.',
        ),
      );

      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/turmas/nova']}>
          <Routes>
            <Route path="/turmas/nova" element={<TurmaCreate />} />
          </Routes>
        </MemoryRouter>,
      );

      // Preenche os campos do formulário
      await user.type(screen.getByLabelText(/Código da Turma/i), 'MAT0123-T02');
      await user.type(screen.getByLabelText(/Nome da Disciplina/i), 'Cálculo Diferencial');
      await user.type(screen.getByLabelText(/Professor\(a\) \/ Docente/i), 'Prof. Dr. Roberto');
      await user.type(screen.getByLabelText(/Sala \/ Laboratório/i), 'Pavilhão 2 - Sala 104');

      // Submete o formulário
      const botaoSubmit = screen.getByRole('button', { name: 'Cadastrar Turma' });
      await user.click(botaoSubmit);

      // REGRA DE NEGÓCIO: Verifica se o alerta visual claro é exibido com o título e a mensagem
      const alertaConflito = await screen.findByTestId('conflict-schedule-alert');
      expect(alertaConflito).toBeVisible();
      expect(screen.getByText('Aviso: Conflito de Horário Detectado')).toBeVisible();
      expect(
        screen.getByText(
          'Conflito de horário detectado: a sala "Pavilhão 2 - Sala 104" já está ocupada na Segunda-feira das 08:00 às 10:00.',
        ),
      ).toBeVisible();
      expect(screen.getByText('Como resolver:')).toBeVisible();
    });

    it('exibe alerta visual quando o usuário aciona a simulação de conflito de horário no modo de teste', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/turmas/nova']}>
          <Routes>
            <Route path="/turmas/nova" element={<TurmaCreate />} />
          </Routes>
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText(/Código da Turma/i), 'MAT0999-T01');
      await user.type(screen.getByLabelText(/Nome da Disciplina/i), 'Geometria Analítica');
      await user.type(screen.getByLabelText(/Professor\(a\) \/ Docente/i), 'Profa. Dra. Elena');
      await user.type(screen.getByLabelText(/Sala \/ Laboratório/i), 'Sala 101');

      // Ativa o checkbox de teste de conflito de horário
      const checkboxSimular = screen.getByLabelText(/Forçar erro de validação de 'conflito de horário'/i);
      await user.click(checkboxSimular);

      // Submete
      await user.click(screen.getByRole('button', { name: 'Cadastrar Turma' }));

      // REGRA DE NEGÓCIO: Confirma que o alerta visual foi renderizado na tela
      await waitFor(() => {
        expect(screen.getByTestId('conflict-schedule-alert')).toBeVisible();
      });
      expect(screen.getByText('Aviso: Conflito de Horário Detectado')).toBeVisible();
    });
  });
});
