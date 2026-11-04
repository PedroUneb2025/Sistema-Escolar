import type { Turma } from './turma';

export type SituacaoMatricula = 'matriculado' | 'aprovado' | 'reprovado_nota' | 'reprovado_falta' | 'trancado';
export interface Matricula {
  id_matricula_turma: number;
  id_turma: number;
  situacao: SituacaoMatricula;
  turma?: Pick<Turma, 'id' | 'codigo' | 'semestre' | 'disciplina' | 'professor' | 'sala' | 'diaSemana' | 'horarioInicio' | 'horarioFim'>;
}
export interface MatriculaInput { id_turma: number }
