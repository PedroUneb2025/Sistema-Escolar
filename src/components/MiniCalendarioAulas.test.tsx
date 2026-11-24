import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MiniCalendarioAulas } from './MiniCalendarioAulas';
import { api } from '../services/api';
import { consultaAcademicaService } from '../services/consultaAcademicaService';

describe('MiniCalendarioAulas - Quadro de Horários Semanal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza o quadro de horários com as turmas matriculadas', async () => {
    const mockMatriculas = [
      {
        id_matricula_turma: 10,
        id_turma: 1,
        codigo_turma: 'T01',
        semestre_letivo: '2026.2',
        disciplina_codigo: 'ET0021',
        disciplina_nome: 'Aplicações Orientadas a Objetos',
        professor_nome: 'Prof. Carlos Eduardo',
        sala_codigo: '004 / DCET-II',
        dia_semana: 'SEG',
        hora_inicio: '07:30:00',
        hora_fim: '08:20:00',
        situacao: 'matriculado',
      },
      {
        id_matricula_turma: 11,
        id_turma: 2,
        codigo_turma: 'T01',
        semestre_letivo: '2026.2',
        disciplina_codigo: 'ET0022',
        disciplina_nome: 'Arquitetura de Software',
        professor_nome: 'Profa. Mariana Silva',
        sala_codigo: 'LINF3 / DCET-II',
        dia_semana: 'TER',
        hora_inicio: '09:10:00',
        hora_fim: '10:00:00',
        situacao: 'matriculado',
      },
    ];

    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatriculas });

    render(<MiniCalendarioAulas />);

    // Aguarda carregar
    expect(await screen.findByRole('heading', { name: 'Meus horários' })).toBeVisible();

    // Verifica que as disciplinas aparecem no quadro
    expect(screen.getAllByText('ET0021').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ET0022').length).toBeGreaterThan(0);

    // Verifica a legenda detalhada
    expect(screen.getByText(/Aplicações Orientadas a Objetos/i)).toBeVisible();
    expect(screen.getByText(/Arquitetura de Software/i)).toBeVisible();
    expect(screen.getByText(/004 \/ DCET-II/i)).toBeVisible();
  });

  it('exibe apenas turmas com situação matriculado, ignorando trancadas ou aprovadas', async () => {
    const mockMatriculas = [
      {
        id_matricula_turma: 20,
        codigo_turma: 'T01',
        disciplina_codigo: 'ET0019',
        disciplina_nome: 'Desenvolvimento Web II',
        professor_nome: 'Prof. Roberto',
        sala_codigo: 'Sala 1',
        dia_semana: 'QUA',
        hora_inicio: '07:30:00',
        hora_fim: '08:20:00',
        situacao: 'matriculado',
      },
      {
        id_matricula_turma: 21,
        codigo_turma: 'T02',
        disciplina_codigo: 'ET0099',
        disciplina_nome: 'Disciplina Trancada',
        professor_nome: 'Prof. Inativo',
        sala_codigo: 'Sala 2',
        dia_semana: 'QUI',
        hora_inicio: '07:30:00',
        hora_fim: '08:20:00',
        situacao: 'trancado',
      },
    ];

    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatriculas });

    render(<MiniCalendarioAulas />);

    expect(await screen.findByRole('heading', { name: 'Meus horários' })).toBeVisible();

    // ET0019 deve estar visível
    expect(screen.getAllByText('ET0019').length).toBeGreaterThan(0);

    // ET0099 (trancado) não deve aparecer
    expect(screen.queryByText('ET0099')).not.toBeInTheDocument();
    expect(screen.queryByText(/Disciplina Trancada/i)).not.toBeInTheDocument();
  });

  it('mostra mensagem amigável quando não houver aulas e não uma tela em branco', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] });

    render(<MiniCalendarioAulas />);

    expect(
      await screen.findByText('Você não possui aulas com matrícula ativa para este semestre.')
    ).toBeVisible();
  });

  it('exibe erro do servidor na tela e permite tentar novamente', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Falha de conexão com o servidor'));
    vi.spyOn(consultaAcademicaService, 'obterConsultaAcademica').mockRejectedValue(
      new Error('Falha de conexão com o servidor')
    );

    render(<MiniCalendarioAulas />);

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByText('Falha de conexão com o servidor')).toBeVisible();

    // Clica em tentar novamente
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
