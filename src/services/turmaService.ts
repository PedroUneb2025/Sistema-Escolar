import { api } from './api';
import type { Turma, TurmaFormData } from '../types/turma';
import axios from 'axios';

export class ScheduleConflictError extends Error {
  readonly isScheduleConflict = true;
  readonly detalhes?: string;

  constructor(
    message = 'Conflito de horário detectado para esta turma.',
    detalhes?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ScheduleConflictError';
    this.detalhes = detalhes;
  }
}

/**
 * Função utilitária para verificar se qualquer erro (Axios, genérico ou customizado)
 * representa um conflito de horário retornado pelo backend ou pela validação.
 */
export function isScheduleConflictError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof ScheduleConflictError) {
    return true;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    // HTTP 409 Conflict é o status canônico REST para conflitos de agendamento/horário
    if (status === 409) {
      return true;
    }

    const mensagem =
      (typeof data === 'string' ? data : '') ||
      (typeof data?.detail === 'string' ? data.detail : '') ||
      (typeof data?.message === 'string' ? data.message : '') ||
      (Array.isArray(data?.detail)
        ? data.detail.map((d: { msg?: string }) => d.msg ?? '').join(' ')
        : '') ||
      error.message ||
      '';

    const normalized = mensagem.toLowerCase();
    return (
      normalized.includes('conflito de horário') ||
      normalized.includes('conflito de horario') ||
      normalized.includes('horário conflitante') ||
      normalized.includes('schedule conflict') ||
      normalized.includes('conflito de sala') ||
      normalized.includes('conflito de professor')
    );
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    return (
      normalized.includes('conflito de horário') ||
      normalized.includes('conflito de horario') ||
      normalized.includes('schedule conflict')
    );
  }

  return false;
}

// Chave para armazenamento local em modo mock/fallback acadêmico
const STORAGE_KEY = '@UNEB:turmas_db';

const initialMockTurmas: Turma[] = [
  {
    id: 'turma-1',
    codigo: 'MAT0123-T01',
    disciplina: 'Cálculo Diferencial e Integral I',
    professor: 'Prof. Dr. Carlos Eduardo',
    semestre: '2026.1',
    diaSemana: 'Segunda-feira',
    horarioInicio: '08:00',
    horarioFim: '10:00',
    sala: 'Pavilhão 2 - Sala 104',
    vagas: 40,
    vagasOcupadas: 34,
    status: 'aberta',
  },
  {
    id: 'turma-2',
    codigo: 'INF0204-T02',
    disciplina: 'Estruturas de Dados e Algoritmos',
    professor: 'Profa. Dra. Mariana Silva',
    semestre: '2026.1',
    diaSemana: 'Segunda-feira',
    horarioInicio: '10:00',
    horarioFim: '12:00',
    sala: 'Laboratório de Informática 3',
    vagas: 35,
    vagasOcupadas: 35,
    status: 'fechada',
  },
  {
    id: 'turma-3',
    codigo: 'FIS0102-T01',
    disciplina: 'Física Geral e Experimental I',
    professor: 'Prof. Dr. Roberto Mendes',
    semestre: '2026.1',
    diaSemana: 'Terça-feira',
    horarioInicio: '14:00',
    horarioFim: '16:00',
    sala: 'Laboratório de Física - Campus II',
    vagas: 30,
    vagasOcupadas: 18,
    status: 'aberta',
  },
  {
    id: 'turma-4',
    codigo: 'LET0301-T01',
    disciplina: 'Língua Portuguesa e Produção Textual',
    professor: 'Profa. Me. Amanda Freitas',
    semestre: '2026.2',
    diaSemana: 'Quarta-feira',
    horarioInicio: '08:00',
    horarioFim: '10:00',
    sala: 'Pavilhão 1 - Sala 202',
    vagas: 45,
    vagasOcupadas: 0,
    status: 'aberta',
  },
];

function getStoredTurmas(): Turma[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockTurmas));
      return initialMockTurmas;
    }
    return JSON.parse(raw) as Turma[];
  } catch {
    return initialMockTurmas;
  }
}

function saveStoredTurmas(turmas: Turma[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(turmas));
  } catch (e) {
    console.error('Falha ao salvar turmas no localStorage', e);
  }
}

/**
 * Validação local de sobreposição de horário para o modo mock/fallback:
 * Verifica se a turma coincide em dia e horário com outra turma na mesma sala
 * ou com o mesmo professor.
 */
function checkLocalConflict(dados: TurmaFormData, ignoreId?: string): void {
  const turmas = getStoredTurmas();

  for (const t of turmas) {
    if (ignoreId && t.id === ignoreId) continue;
    if (t.status === 'cancelada') continue;

    // Mesmo dia da semana
    if (t.diaSemana === dados.diaSemana) {
      // Verifica se os intervalos de horário se sobrepõem: (inicioA < fimB) && (fimA > inicioB)
      const sobrepoe =
        dados.horarioInicio < t.horarioFim && dados.horarioFim > t.horarioInicio;

      if (sobrepoe) {
        // Conflito de Sala
        if (t.sala.trim().toLowerCase() === dados.sala.trim().toLowerCase()) {
          throw new ScheduleConflictError(
            `Conflito de horário detectado: a sala "${t.sala}" já está ocupada pela turma ${t.codigo} (${t.disciplina}) na ${t.diaSemana} das ${t.horarioInicio} às ${t.horarioFim}.`,
            `Sala ocupada por ${t.codigo} (${t.horarioInicio} - ${t.horarioFim})`,
          );
        }

        // Conflito de Professor
        if (t.professor.trim().toLowerCase() === dados.professor.trim().toLowerCase()) {
          throw new ScheduleConflictError(
            `Conflito de horário detectado: o(a) docente "${t.professor}" já ministra aula na turma ${t.codigo} (${t.disciplina}) na ${t.diaSemana} das ${t.horarioInicio} às ${t.horarioFim}.`,
            `Docente ocupado(a) na turma ${t.codigo} (${t.horarioInicio} - ${t.horarioFim})`,
          );
        }
      }
    }
  }
}

export const turmaService = {
  /**
   * Lista todas as turmas cadastradas
   */
  async listar(): Promise<Turma[]> {
    try {
      const response = await api.get<Turma[]>('/turmas');
      return response.data;
    } catch (error) {
      // Se a rota ainda não existir no backend, utiliza armazenamento local
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || !error.response)
      ) {
        return getStoredTurmas();
      }
      throw error;
    }
  },

  /**
   * Obtém os detalhes de uma turma específica
   */
  async obterPorId(id: string): Promise<Turma> {
    try {
      const response = await api.get<Turma>(`/turmas/${id}`);
      return response.data;
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || !error.response)
      ) {
        const turma = getStoredTurmas().find((t) => t.id === id);
        if (!turma) {
          throw new Error('Turma não encontrada.', { cause: error });
        }
        return turma;
      }
      throw error;
    }
  },

  /**
   * Cadastra uma nova turma com tratamento de conflito de horário
   */
  async criar(dados: TurmaFormData, forcarSimulacaoConflito = false): Promise<Turma> {
    if (forcarSimulacaoConflito) {
      throw new ScheduleConflictError(
        `Conflito de horário detectado: a sala "${dados.sala}" ou o(a) docente "${dados.professor}" possui choque de horário neste intervalo (${dados.diaSemana}, ${dados.horarioInicio} - ${dados.horarioFim}).`,
        'Simulação ativada para demonstração da regra de negócio.',
      );
    }

    try {
      const response = await api.post<Turma>('/turmas', dados);
      return response.data;
    } catch (error) {
      if (isScheduleConflictError(error)) {
        const mensagemBackend =
          (axios.isAxiosError(error) &&
            (error.response?.data?.detail || error.response?.data?.message)) ||
          'Conflito de horário detectado para esta turma.';
        throw new ScheduleConflictError(mensagemBackend, undefined, { cause: error });
      }

      // Fallback local se backend não estiver respondendo
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || !error.response)
      ) {
        // Valida colisão localmente
        checkLocalConflict(dados);

        const turmas = getStoredTurmas();
        const novaTurma: Turma = {
          ...dados,
          id: `turma-${Date.now()}`,
          vagasOcupadas: 0,
        };
        turmas.unshift(novaTurma);
        saveStoredTurmas(turmas);
        return novaTurma;
      }

      throw error;
    }
  },

  /**
   * Atualiza dados de uma turma existente
   */
  async atualizar(
    id: string,
    dados: TurmaFormData,
    forcarSimulacaoConflito = false,
  ): Promise<Turma> {
    if (forcarSimulacaoConflito) {
      throw new ScheduleConflictError(
        `Conflito de horário detectado: a sala "${dados.sala}" ou o(a) docente "${dados.professor}" possui choque de horário neste intervalo (${dados.diaSemana}, ${dados.horarioInicio} - ${dados.horarioFim}).`,
        'Simulação ativada para demonstração da regra de negócio.',
      );
    }

    try {
      const response = await api.put<Turma>(`/turmas/${id}`, dados);
      return response.data;
    } catch (error) {
      if (isScheduleConflictError(error)) {
        const mensagemBackend =
          (axios.isAxiosError(error) &&
            (error.response?.data?.detail || error.response?.data?.message)) ||
          'Conflito de horário detectado para esta turma.';
        throw new ScheduleConflictError(mensagemBackend, undefined, { cause: error });
      }

      // Fallback local
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || !error.response)
      ) {
        checkLocalConflict(dados, id);

        const turmas = getStoredTurmas();
        const index = turmas.findIndex((t) => t.id === id);
        if (index === -1) {
          throw new Error('Turma não encontrada para edição.', { cause: error });
        }

        const turmaAtualizada: Turma = {
          ...turmas[index],
          ...dados,
        };
        turmas[index] = turmaAtualizada;
        saveStoredTurmas(turmas);
        return turmaAtualizada;
      }

      throw error;
    }
  },

  /**
   * Remove uma turma
   */
  async excluir(id: string): Promise<void> {
    try {
      await api.delete(`/turmas/${id}`);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || !error.response)
      ) {
        const turmas = getStoredTurmas().filter((t) => t.id !== id);
        saveStoredTurmas(turmas);
        return;
      }
      throw error;
    }
  },

  /**
   * Restaura os dados padrão para testes acadêmicos
   */
  restaurarDadosPadrao(): Turma[] {
    saveStoredTurmas(initialMockTurmas);
    return initialMockTurmas;
  },
};
