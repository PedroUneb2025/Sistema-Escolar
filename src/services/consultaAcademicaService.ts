import { api } from './api';
import type { ItemConsultaAcademica } from '../types/consultaAcademica';
import { isDemoSession } from './demoMode';

// Dados acadêmicos padrão para aluno (modo teste / fallback quando o backend ainda não tiver as matrículas cadastradas)
const dadosMockConsulta: ItemConsultaAcademica[] = [
  {
    idMatricula: 1,
    codigoTurma: 'MAT0123-T01',
    disciplinaCodigo: 'MAT0123',
    disciplinaNome: 'Cálculo Diferencial e Integral I',
    professorNome: 'Prof. Dr. Carlos Eduardo',
    semestre: '2026.1',
    sala: 'Pavilhão 2 - Sala 104',
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
        sala: 'Pavilhão 2 - Sala 104',
        codigoTurma: 'MAT0123-T01',
      },
    ],
  },
  {
    idMatricula: 2,
    codigoTurma: 'INF0204-T02',
    disciplinaCodigo: 'INF0204',
    disciplinaNome: 'Estruturas de Dados e Algoritmos',
    professorNome: 'Profa. Dra. Mariana Silva',
    semestre: '2026.1',
    sala: 'Laboratório de Informática 3',
    nota1: 9.0,
    nota2: 8.5,
    notaFinal: 8.8,
    frequencia: 96,
    situacao: 'aprovado',
    horarios: [
      {
        diaSemana: 'Segunda-feira',
        diaSemanaNumero: 1,
        horarioInicio: '10:00',
        horarioFim: '12:00',
        sala: 'Laboratório de Informática 3',
        codigoTurma: 'INF0204-T02',
      },
    ],
  },
  {
    idMatricula: 3,
    codigoTurma: 'FIS0102-T01',
    disciplinaCodigo: 'FIS0102',
    disciplinaNome: 'Física Geral e Experimental I',
    professorNome: 'Prof. Dr. Roberto Mendes',
    semestre: '2026.1',
    sala: 'Laboratório de Física - Campus II',
    nota1: 6.0,
    nota2: 7.5,
    notaFinal: 6.8,
    frequencia: 85,
    situacao: 'aprovado',
    horarios: [
      {
        diaSemana: 'Terça-feira',
        diaSemanaNumero: 2,
        horarioInicio: '14:00',
        horarioFim: '16:00',
        sala: 'Laboratório de Física - Campus II',
        codigoTurma: 'FIS0102-T01',
      },
    ],
  },
  {
    idMatricula: 4,
    codigoTurma: 'LET0301-T01',
    disciplinaCodigo: 'LET0301',
    disciplinaNome: 'Língua Portuguesa e Produção Textual',
    professorNome: 'Profa. Me. Amanda Freitas',
    semestre: '2026.2',
    sala: 'Pavilhão 1 - Sala 202',
    nota1: 8.0,
    nota2: null,
    notaFinal: null,
    frequencia: 100,
    situacao: 'matriculado',
    horarios: [
      {
        diaSemana: 'Quarta-feira',
        diaSemanaNumero: 3,
        horarioInicio: '08:00',
        horarioFim: '10:00',
        sala: 'Pavilhão 1 - Sala 202',
        codigoTurma: 'LET0301-T01',
      },
    ],
  },
  {
    idMatricula: 5,
    codigoTurma: 'ENG0402-T01',
    disciplinaCodigo: 'ENG0402',
    disciplinaNome: 'Engenharia de Software',
    professorNome: 'Prof. Me. Rodrigo Santos',
    semestre: '2026.2',
    sala: 'Pavilhão 2 - Sala 12',
    nota1: 7.5,
    nota2: null,
    notaFinal: null,
    frequencia: 90,
    situacao: 'matriculado',
    horarios: [
      {
        diaSemana: 'Quinta-feira',
        diaSemanaNumero: 4,
        horarioInicio: '10:00',
        horarioFim: '12:00',
        sala: 'Pavilhão 2 - Sala 12',
        codigoTurma: 'ENG0402-T01',
      },
    ],
  },
];

const STORAGE_KEY = '@UNEB:consulta_academica';

function getStoredMock(): ItemConsultaAcademica[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignora
  }
  return dadosMockConsulta;
}

export const consultaAcademicaService = {
  async obterConsultaAcademica(): Promise<ItemConsultaAcademica[]> {
    if (isDemoSession()) return getStoredMock();
    const { data } = await api.get<ItemConsultaAcademica[]>('/academico/minhas-turmas');
    if (!Array.isArray(data)) throw new Error('Resposta acadêmica inválida.');
    return data;
  },
};
