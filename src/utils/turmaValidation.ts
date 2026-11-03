export interface HorarioAula {
  diaSemana: number;
  horarioInicio: string; 
  horarioFim: string; 
}

export interface Turma {
  id?: string;
  salaId: string;
  professorId: string;
  horarios: HorarioAula[];
}

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isHorarioSobreposto = (h1: HorarioAula, h2: HorarioAula): boolean => {
  if (h1.diaSemana !== h2.diaSemana) return false;

  const inicio1 = timeToMinutes(h1.horarioInicio);
  const fim1 = timeToMinutes(h1.horarioFim);
  const inicio2 = timeToMinutes(h2.horarioInicio);
  const fim2 = timeToMinutes(h2.horarioFim);

  return inicio1 < fim2 && inicio2 < fim1;
};

export const validarConflitoTurma = (
  novaTurma: Turma,
  turmasExistentes: Turma[]
): { conflito: boolean; mensagem?: string } => {
  for (const turma of turmasExistentes) {
    if (novaTurma.id && turma.id === novaTurma.id) continue;

    const mesmoProfessor = turma.professorId === novaTurma.professorId;
    const mesmaSala = turma.salaId === novaTurma.salaId;

    if (mesmoProfessor || mesmaSala) {
      for (const hNova of novaTurma.horarios) {
        for (const hExistente of turma.horarios) {
          if (isHorarioSobreposto(hNova, hExistente)) {
            const motivo = mesmoProfessor && mesmaSala
              ? 'o mesmo professor e a mesma sala'
              : mesmoProfessor
              ? 'o mesmo professor'
              : 'a mesma sala';

            return {
              conflito: true,
              mensagem: `Conflito de horário detectado para ${motivo} no dia ${hNova.diaSemana} entre ${hNova.horarioInicio}-${hNova.horarioFim}.`,
            };
          }
        }
      }
    }
  }

  return { conflito: false };
};