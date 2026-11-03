import type { Turma as TurmaCompleta, ScheduleConflictErrorDetails } from '../types/turma';

export interface HorarioAula {
  diaSemana: number | string;
  horarioInicio: string;
  horarioFim: string;
}

export interface TurmaSimples {
  id?: string;
  professorId?: string;
  salaId?: string;
  professor?: string;
  sala?: string;
  horarios?: HorarioAula[];
  diaSemana?: string;
  horarioInicio?: string;
  horarioFim?: string;
  status?: string;
  codigo?: string;
  disciplina?: string;
}

export type Turma = TurmaSimples | TurmaCompleta;

/**
 * Converte "HH:MM" para minutos do dia para facilitar a comparação matemática.
 */
function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verifica se dois horários no mesmo dia da semana se sobrepõem.
 */
export function isHorarioSobreposto(h1: HorarioAula, h2: HorarioAula): boolean {
  if (String(h1.diaSemana) !== String(h2.diaSemana)) return false;

  const inicio1 = horaParaMinutos(h1.horarioInicio);
  const fim1 = horaParaMinutos(h1.horarioFim);
  const inicio2 = horaParaMinutos(h2.horarioInicio);
  const fim2 = horaParaMinutos(h2.horarioFim);

  return inicio1 < fim2 && inicio2 < fim1;
}

/**
 * Normaliza os horários de uma turma para uma lista de HorarioAula,
 * suportando tanto o formato com array 'horarios' quanto os campos planos da interface Turma.
 */
function extrairHorarios(turma: Turma): HorarioAula[] {
  if ('horarios' in turma && Array.isArray(turma.horarios)) {
    return turma.horarios;
  }

  if ('diaSemana' in turma && turma.diaSemana && turma.horarioInicio && turma.horarioFim) {
    return [
      {
        diaSemana: turma.diaSemana,
        horarioInicio: turma.horarioInicio,
        horarioFim: turma.horarioFim,
      },
    ];
  }

  return [];
}

/**
 * Valida se uma nova turma entra em conflito de horário por sala ou professor.
 * Retorna o objeto { conflito: boolean, mensagem?: string } compatível com os testes Vitest.
 */
export function validarConflitoTurma(
  novaTurma: Turma,
  turmasExistentes: Turma[]
): { conflito: boolean; mensagem?: string; detalhes?: ScheduleConflictErrorDetails } {
  const profNovo = String(('professorId' in novaTurma && novaTurma.professorId) || ('professor' in novaTurma && novaTurma.professor) || '').trim().toLowerCase();
  const salaNova = String(('salaId' in novaTurma && novaTurma.salaId) || ('sala' in novaTurma && novaTurma.sala) || '').trim().toLowerCase();
  const horariosNovos = extrairHorarios(novaTurma);

  for (const existente of turmasExistentes) {
    if ('id' in novaTurma && novaTurma.id && 'id' in existente && existente.id === novaTurma.id) continue;
    if ('status' in existente && existente.status === 'cancelada') continue;

    const profExistente = String(('professorId' in existente && existente.professorId) || ('professor' in existente && existente.professor) || '').trim().toLowerCase();
    const salaExistente = String(('salaId' in existente && existente.salaId) || ('sala' in existente && existente.sala) || '').trim().toLowerCase();

    const mesmoProfessor = profNovo !== '' && profNovo === profExistente;
    const mesmaSala = salaNova !== '' && salaNova === salaExistente;

    if (!mesmoProfessor && !mesmaSala) continue;

    const horariosExistentes = extrairHorarios(existente);

    for (const hNova of horariosNovos) {
      for (const hExistente of horariosExistentes) {
        if (isHorarioSobreposto(hNova, hExistente)) {
          if (mesmoProfessor) {
            return {
              conflito: true,
              mensagem: `Conflito de horário: o mesmo professor já possui aula agendada neste horário.`,
            };
          }

          if (mesmaSala) {
            return {
              conflito: true,
              mensagem: `Conflito de horário: a mesma sala já está agendada para este horário.`,
            };
          }
        }
      }
    }
  }

  return { conflito: false };
}

/**
 * Alias para manter compatibilidade com serviços que usam a nomenclatura antiga.
 */
export function validarConflitoHorario(
  dadosTurma: Turma,
  turmasExistentes: Turma[],
  turmaIdAtual?: string
): ScheduleConflictErrorDetails | null {
  const res = validarConflitoTurma(
    turmaIdAtual ? { ...dadosTurma, id: turmaIdAtual } : dadosTurma,
    turmasExistentes
  );

  if (!res.conflito) return null;

  return {
    tipo: 'conflito_horario',
    mensagem: res.mensagem || 'Conflito de horário detectado.',
  };
}