import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConsultaAcademica } from './ConsultaAcademica';
import { consultaAcademicaService } from '../services/consultaAcademicaService';
import type { ItemConsultaAcademica } from '../types/consultaAcademica';

const mockDados: ItemConsultaAcademica[] = [
  {
    idMatricula: 1,
    codigoTurma: 'MAT0123-T01',
    disciplinaCodigo: 'MAT0123',
    disciplinaNome: 'Cálculo Diferencial e Integral I',
    professorNome: 'Prof. Dr. Carlos Eduardo',
    semestre: '2026.1',
    sala: 'Sala 104',
    nota1: 8.5,
    nota2: 7.0,
    notaFinal: 7.8,
    frequencia: 92,
    situacao: 'aprovado',
    horarios: [
      {
        diaSemana: 'Segunda-feira',
        diaSemanaNumero: 1,
        horarioInicio: '08:00',
        horarioFim: '10:00',
        sala: 'Sala 104',
        codigoTurma: 'MAT0123-T01',
      },
    ],
  },
  {
    idMatricula: 2,
    codigoTurma: 'INF0204-T02',
    disciplinaCodigo: 'INF0204',
    disciplinaNome: 'Estruturas de Dados',
    professorNome: 'Profa. Dra. Mariana Silva',
    semestre: '2026.1',
    sala: 'Lab 3',
    nota1: 9.0,
    nota2: 8.0,
    notaFinal: 8.5,
    frequencia: 95,
    situacao: 'aprovado',
    horarios: [
      {
        diaSemana: 'Terça-feira',
        diaSemanaNumero: 2,
        horarioInicio: '10:00',
        horarioFim: '12:00',
        sala: 'Lab 3',
        codigoTurma: 'INF0204-T02',
      },
    ],
  },
];

describe('Painel Unificado de Consulta Acadêmica (Notas e Horários)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza o cabeçalho, métricas de desempenho e listagem de notas e frequência', async () => {
    vi.spyOn(consultaAcademicaService, 'obterConsultaAcademica').mockResolvedValueOnce(mockDados);

    render(
      <MemoryRouter>
        <ConsultaAcademica />
      </MemoryRouter>
    );

    expect(screen.getByText('Carregando dados acadêmicos...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Consulta Acadêmica Unificada' })).toBeInTheDocument();
    });

    // Confere disciplinas renderizadas (getAllByText porque aparece no boletim e na grade da visão unificada)
    expect(screen.getAllByText('Cálculo Diferencial e Integral I').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Estruturas de Dados').length).toBeGreaterThan(0);
    expect(screen.getByText('Prof. Dr. Carlos Eduardo')).toBeInTheDocument();

    // Confere notas
    expect(screen.getByText('7.8')).toBeInTheDocument();
    expect(screen.getAllByText('8.5').length).toBeGreaterThan(0);
  });

  it('permite alternar entre as abas e visualizar a grade semanal de horários', async () => {
    const user = userEvent.setup();
    vi.spyOn(consultaAcademicaService, 'obterConsultaAcademica').mockResolvedValueOnce(mockDados);

    render(
      <MemoryRouter>
        <ConsultaAcademica />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Consulta Acadêmica Unificada' })).toBeInTheDocument();
    });

    const abaHorarios = screen.getByRole('button', { name: /grade semanal de horários/i });
    await user.click(abaHorarios);

    // Deve exibir o cabeçalho de horários e os horários das aulas
    expect(screen.getByRole('heading', { name: 'Grade Semanal de Aulas' })).toBeInTheDocument();
    expect(screen.getByText('08:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
  });

  it('filtra as disciplinas através do campo de busca', async () => {
    const user = userEvent.setup();
    vi.spyOn(consultaAcademicaService, 'obterConsultaAcademica').mockResolvedValueOnce(mockDados);

    render(
      <MemoryRouter>
        <ConsultaAcademica />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Cálculo Diferencial e Integral I').length).toBeGreaterThan(0);
    });

    const inputBusca = screen.getByPlaceholderText(/buscar por disciplina/i);
    await user.type(inputBusca, 'Estruturas');

    // Apenas Estruturas deve permanecer
    expect(screen.getAllByText('Estruturas de Dados').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cálculo Diferencial e Integral I')).not.toBeInTheDocument();
  });
});
