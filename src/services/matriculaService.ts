import axios from 'axios';
import { z } from 'zod';
import { api } from './api';
import { isDemoSession } from './demoMode';
import { getApiError } from './apiError';
import type { Matricula, MatriculaInput } from '../types/matricula';
import { listarPaginas } from './turmaService';
import type { Turma } from '../types/turma';

// Contrato do Backend A: ver MATRICULA-ONLINE.md.
export const MATRICULA_ENDPOINTS = {
  turmas: '/turmas', minhas: '/matriculas/minhas', criar: '/matriculas',
} as const;
const id = z.union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]).transform(Number).refine(Number.isSafeInteger);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).transform((s) => s.slice(0, 5));
const turmaSchema = z.object({
  id: id.transform(String), codigo: z.string().min(1), disciplina: z.string().min(1),
  professor: z.string(), semestre: z.string().min(1),
  diaSemana: z.enum(['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']),
  horarioInicio: hora, horarioFim: hora, sala: z.string(),
  vagas: z.number().int().nonnegative(), vagasOcupadas: z.number().int().nonnegative(),
  status: z.enum(['aberta', 'fechada', 'cancelada']),
}).refine((t) => t.horarioFim > t.horarioInicio);
const matriculaSchema = z.object({
  id_matricula_turma: id, id_turma: id,
  situacao: z.enum(['matriculado', 'aprovado', 'reprovado_nota', 'reprovado_falta', 'trancado']),

});
const dias = { SEG: 'Segunda-feira', TER: 'Terça-feira', QUA: 'Quarta-feira', QUI: 'Quinta-feira', SEX: 'Sexta-feira', SAB: 'Sábado' } as const;
const minhaSchema = matriculaSchema.extend({
  codigo_turma: z.string(), semestre_letivo: z.string(), disciplina_nome: z.string(),
  professor_nome: z.string(), sala_codigo: z.string(),
  dia_semana: z.enum(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']),
  hora_inicio: hora, hora_fim: hora,
}).transform((m) => ({
  id_matricula_turma: m.id_matricula_turma, id_turma: m.id_turma, situacao: m.situacao,
  turma: { id: String(m.id_turma), codigo: m.codigo_turma, semestre: m.semestre_letivo,
    disciplina: m.disciplina_nome, professor: m.professor_nome, sala: m.sala_codigo,
    diaSemana: dias[m.dia_semana], horarioInicio: m.hora_inicio, horarioFim: m.hora_fim },
}));
function decode<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error('O servidor retornou dados incompatíveis com a matrícula online. Contate a secretaria.');
  return result.data;
}
function requireRealSession() {
  const token = sessionStorage.getItem('@UNEB:token') ?? localStorage.getItem('@UNEB:token');
  if (!token || /^(temp-token-|mock-)/.test(token) || isDemoSession()) {
    throw new Error('Entre com uma conta real de aluno para realizar a matrícula.');
  }
}
export const matriculaService = {
  async listarTurmas(signal?: AbortSignal): Promise<Turma[]> {
    requireRealSession();
    return decode(z.array(turmaSchema), await listarPaginas(MATRICULA_ENDPOINTS.turmas, signal));
  },
  async minhas(signal?: AbortSignal): Promise<Matricula[]> {
    requireRealSession();
    return decode(z.array(minhaSchema), (await api.get(MATRICULA_ENDPOINTS.minhas, { signal })).data);
  },
  async matricular(input: MatriculaInput): Promise<Matricula> {
    requireRealSession();
    const id_turma = decode(id, input.id_turma);
    const data = decode(matriculaSchema, (await api.post(MATRICULA_ENDPOINTS.criar, { id_turma })).data);
    if (data.id_turma !== id_turma || data.situacao !== 'matriculado') {
      throw new Error('Não foi possível confirmar a matrícula solicitada. Atualize a lista antes de tentar novamente.');
    }
    return data;
  },
};
export function matriculaError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.response?.status === 404) return 'O serviço ou registro de matrícula não está disponível. Atualize a lista ou contate a secretaria.';
    if (error.response?.status === 409) {
      const detail = error.response.data?.detail;
      return typeof detail === 'string' ? detail : 'Matrícula não realizada: verifique vagas, matrícula existente ou conflito de horário.';
    }
  }
  return getApiError(error, 'Não foi possível concluir a operação. Tente novamente.');
}
