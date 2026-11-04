import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TurmasList } from './TurmasList';
import { TurmaForm } from './TurmaForm';
import { TurmaCreate } from './TurmaCreate';
import { api } from '../../services/api';
import { turmaService, ScheduleConflictError } from '../../services/turmaService';

describe('Módulo de Turmas (CRUD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url === '/turmas' ? [
      { id: '1', codigo: 'MAT0123-T01', disciplina: 'Cálculo Diferencial e Integral I', professor: 'Prof. Dr. Carlos Eduardo', semestre: '2026.1', diaSemana: 'Segunda-feira', horarioInicio: '08:00', horarioFim: '10:00', sala: 'Sala 1', vagas: 40, vagasOcupadas: 3, status: 'aberta' },
      { id: '2', codigo: 'INF-T01', disciplina: 'Estruturas de Dados e Algoritmos', professor: 'Ana', semestre: '2026.1', diaSemana: 'Terça-feira', horarioInicio: '08:00', horarioFim: '10:00', sala: 'Sala 2', vagas: 40, vagasOcupadas: 0, status: 'aberta' },
    ] : url === '/disciplinas' ? [{ id_disciplina: 1, nome: 'Cálculo', codigo: 'CALC' }]
    : url === '/professores' ? [{ id_professor: 2, nome_completo: 'Ana' }]
    : [{ id_sala: 3, codigo: 'Sala 1' }] }));
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

  it('preserva os IDs na edição após carregar os selects', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const dados = { codigo: 'CALC-T01', idDisciplina: 1, idProfessor: 2, idSala: 3, semestre: '2026.2', diaSemana: 'Segunda-feira' as const, horarioInicio: '08:00', horarioFim: '10:00', vagas: 30, status: 'aberta' as const };
    render(<MemoryRouter><TurmaForm initialData={dados} onSubmit={onSubmit} isSubmitting={false} submitButtonText="Salvar" formTitle="Editar" formSubtitle="Turma" /></MemoryRouter>);
    await screen.findByRole('option', { name: 'Cálculo' });
    expect(screen.getByLabelText(/Nome da Disciplina/i)).toHaveValue('1');
    expect(screen.getByLabelText(/Professor\(a\)/i)).toHaveValue('2');
    expect(screen.getByLabelText(/Sala \/ Laboratório/i)).toHaveValue('3');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith(dados);
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
      await screen.findByRole('option', { name: 'Cálculo' });
      await user.selectOptions(screen.getByLabelText(/Nome da Disciplina/i), '1');
      await user.selectOptions(screen.getByLabelText(/Professor\(a\) \/ Docente/i), '2');
      await user.selectOptions(screen.getByLabelText(/Sala \/ Laboratório/i), '3');

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

    it('envia os IDs reais e não simula sucesso quando a API falha', async () => {
      const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('offline'));
      const dados = { codigo: 'CALC-T01', idDisciplina: 1, idProfessor: 2, idSala: 3, semestre: '2026.2', diaSemana: 'Segunda-feira' as const, horarioInicio: '08:00', horarioFim: '10:00', vagas: 30, status: 'aberta' as const };
      await expect(turmaService.criar(dados)).rejects.toThrow('offline');
      expect(post).toHaveBeenCalledWith('/turmas', dados);
      expect(localStorage.getItem('@UNEB:turmas_db')).toBeNull();
    });
  });
});
