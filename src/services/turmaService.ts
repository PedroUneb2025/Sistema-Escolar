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
    if (status !== 409) return false;

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

export async function listarPaginas<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const itens: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data } = await api.get<T[]>(url, { signal, params: { limite: 500, offset } });
    if (!Array.isArray(data)) throw new Error('Resposta inválida do servidor.');
    itens.push(...data);
    if (data.length < 500) return itens;
  }
}
export interface OpcoesTurma {
  disciplinas: { id_disciplina: number; codigo: string; nome: string }[];
  professores: { id_professor: number; nome_completo: string }[];
  salas: { id_sala: number; codigo: string }[];
}
export const turmaService = {
  listar: () => listarPaginas<Turma>('/turmas'),
  async obterPorId(id: string): Promise<Turma> { return (await api.get(`/turmas/${id}`)).data; },
  async opcoes(signal?: AbortSignal): Promise<OpcoesTurma> {
    const [disciplinas, professores, salas] = await Promise.all([
      api.get<OpcoesTurma['disciplinas']>('/disciplinas', { signal }).then(r => r.data),
      listarPaginas<OpcoesTurma['professores'][number]>('/professores', signal),
      listarPaginas<OpcoesTurma['salas'][number]>('/salas', signal),
    ]);
    return { disciplinas, professores, salas };
  },
  async criar(dados: TurmaFormData): Promise<Turma> { return (await api.post('/turmas', dados)).data; },
  async atualizar(id: string, dados: TurmaFormData): Promise<Turma> { return (await api.put(`/turmas/${id}`, dados)).data; },
  async excluir(id: string): Promise<void> { await api.delete(`/turmas/${id}`); },
};
