import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ComprovanteMatricula } from './ComprovanteMatricula';
import { api } from '../../services/api';
import { alunoService } from '../../services/alunoService';

const authMock = vi.hoisted(() => ({
  user: {
    id: '1',
    email: 'aluno@uneb.br',
    nome: 'Aluno Demonstração',
    perfis: ['aluno'],
  },
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authMock,
}));

describe('ComprovanteMatricula - Comprovante Oficial UNEB SAGRES', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPerfilAluno = {
    id_aluno: 1,
    matricula: '2026100123',
    nome_completo: 'Aluno Demonstração',
    cpf: '12345678900', // CPF presente no modelo da API
    email: 'aluno@uneb.br',
  };

  const mockMatriculas = [
    {
      id_matricula_turma: 101,
      id_turma: 1,
      codigo_turma: 'T01',
      semestre_letivo: '2026.2',
      disciplina_codigo: 'ET0019',
      disciplina_nome: 'DESENVOLVIMENTO WEB II BACK-END',
      professor_nome: 'Prof. Carlos',
      sala_codigo: '004 / DCET-II',
      dia_semana: 'SEG',
      hora_inicio: '07:30:00',
      hora_fim: '08:20:00',
      situacao: 'matriculado',
    },
    {
      id_matricula_turma: 102,
      id_turma: 2,
      codigo_turma: 'T01',
      semestre_letivo: '2026.1',
      disciplina_codigo: 'ET0010',
      disciplina_nome: 'ALGORITMOS E PROGRAMAÇÃO',
      professor_nome: 'Profa. Ana',
      sala_codigo: 'LINF1 / DCET-II',
      dia_semana: 'TER',
      hora_inicio: '09:10:00',
      hora_fim: '10:00:00',
      situacao: 'matriculado',
    },
    {
      id_matricula_turma: 103,
      id_turma: 3,
      codigo_turma: 'T02',
      semestre_letivo: '2026.2',
      disciplina_codigo: 'ET0099',
      disciplina_nome: 'DISCIPLINA TRANCADA',
      professor_nome: 'Prof. Teste',
      sala_codigo: 'Sala 99',
      dia_semana: 'QUA',
      hora_inicio: '10:00:00',
      hora_fim: '11:40:00',
      situacao: 'trancado',
    },
  ];

  it('renderiza o comprovante oficial com nome, matrícula, semestre e disciplinas', async () => {
    vi.spyOn(alunoService, 'obterMeuPerfil').mockResolvedValueOnce(mockPerfilAluno);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatriculas });

    render(
      <MemoryRouter>
        <ComprovanteMatricula />
      </MemoryRouter>
    );

    // Título do documento
    expect(await screen.findByRole('heading', { name: 'COMPROVANTE DE MATRÍCULA' })).toBeVisible();

    // Nome e Matrícula
    expect(screen.getByText('Aluno Demonstração')).toBeVisible();
    expect(screen.getByText('2026100123')).toBeVisible();
    expect(screen.getByText('Engenharia de Software')).toBeVisible();

    // Disciplina matriculada do semestre padrão (2026.2)
    expect(screen.getByText('DESENVOLVIMENTO WEB II BACK-END')).toBeVisible();
    expect(screen.getByText('004 / DCET-II')).toBeVisible();

    // Disciplina trancada NÃO deve aparecer
    expect(screen.queryByText('DISCIPLINA TRANCADA')).not.toBeInTheDocument();
  });

  it('GARANTE que o CPF NÃO aparece em nenhuma parte do comprovante ou da tela', async () => {
    vi.spyOn(alunoService, 'obterMeuPerfil').mockResolvedValueOnce(mockPerfilAluno);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatriculas });

    render(
      <MemoryRouter>
        <ComprovanteMatricula />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'COMPROVANTE DE MATRÍCULA' });

    // O CPF nunca deve estar no documento
    expect(screen.queryByText('12345678900')).not.toBeInTheDocument();
    expect(screen.queryByText(/CPF/i)).not.toBeInTheDocument();
  });

  it('permite escolher o semestre letivo e filtra as turmas correspondentes', async () => {
    vi.spyOn(alunoService, 'obterMeuPerfil').mockResolvedValueOnce(mockPerfilAluno);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatriculas });

    render(
      <MemoryRouter>
        <ComprovanteMatricula />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'COMPROVANTE DE MATRÍCULA' });

    // Inicialmente no 2026.2
    expect(screen.getByText('DESENVOLVIMENTO WEB II BACK-END')).toBeVisible();
    expect(screen.queryByText('ALGORITMOS E PROGRAMAÇÃO')).not.toBeInTheDocument();

    // Muda para 2026.1
    const user = userEvent.setup();
    const select = screen.getByLabelText(/Semestre Letivo/i);
    await user.selectOptions(select, '2026.1');

    // Agora deve exibir a turma do semestre 2026.1
    expect(screen.getByText('ALGORITMOS E PROGRAMAÇÃO')).toBeVisible();
    expect(screen.queryByText('DESENVOLVIMENTO WEB II BACK-END')).not.toBeInTheDocument();
  });

  it('aciona o window.print() ao clicar no botão Imprimir', async () => {
    vi.spyOn(alunoService, 'obterMeuPerfil').mockResolvedValueOnce(mockPerfilAluno);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatriculas });

    render(
      <MemoryRouter>
        <ComprovanteMatricula />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'COMPROVANTE DE MATRÍCULA' });

    const btnImprimir = screen.getByRole('button', { name: /Imprimir/i });
    const user = userEvent.setup();
    await user.click(btnImprimir);

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
