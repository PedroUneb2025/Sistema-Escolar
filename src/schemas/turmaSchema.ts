import { z } from 'zod';
import type { DiaSemana, StatusTurma } from '../types/turma';

const diasValidos: [DiaSemana, ...DiaSemana[]] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const statusValidos: [StatusTurma, ...StatusTurma[]] = [
  'aberta',
  'fechada',
  'cancelada',
];

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const turmaSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(3, 'O código da turma deve ter no mínimo 3 caracteres (ex: MAT0101-T01).')
      .max(20, 'O código da turma deve ter no máximo 20 caracteres.'),
    disciplina: z
      .string()
      .trim()
      .min(3, 'O nome da disciplina deve ter pelo menos 3 caracteres.')
      .max(100, 'O nome da disciplina deve ter no máximo 100 caracteres.'),
    professor: z
      .string()
      .trim()
      .min(3, 'O nome do professor/docente é obrigatório.')
      .max(80, 'O nome do professor deve ter no máximo 80 caracteres.'),
    semestre: z
      .string()
      .trim()
      .regex(/^\d{4}\.[1-2]$/, 'O semestre deve estar no formato AAAA.S (ex: 2026.1 ou 2026.2).'),
    diaSemana: z.enum(diasValidos, {
      message: 'Selecione um dia da semana válido.',
    }),
    horarioInicio: z
      .string()
      .regex(timeRegex, 'Horário inicial inválido. Use o formato HH:MM (ex: 08:00).'),
    horarioFim: z
      .string()
      .regex(timeRegex, 'Horário final inválido. Use o formato HH:MM (ex: 10:00).'),
    sala: z
      .string()
      .trim()
      .min(2, 'Informe a sala ou laboratório (ex: Pavilhão 2 - Sala 104).'),
    vagas: z
      .number({ message: 'Informe uma quantidade válida de vagas.' })
      .int('A quantidade de vagas deve ser um número inteiro.')
      .min(1, 'A turma deve ter no mínimo 1 vaga.')
      .max(200, 'A capacidade máxima é de 200 vagas.'),
    status: z.enum(statusValidos, {
      message: 'Selecione um status válido.',
    }),
  })
  .refine(
    (data) => {
      if (!timeRegex.test(data.horarioInicio) || !timeRegex.test(data.horarioFim)) {
        return true;
      }
      return data.horarioFim > data.horarioInicio;
    },
    {
      message: 'O horário de término deve ser posterior ao horário de início.',
      path: ['horarioFim'],
    },
  );

export type TurmaSchemaInput = z.infer<typeof turmaSchema>;

