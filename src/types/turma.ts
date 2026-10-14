export type DiaSemana =
  | 'Segunda-feira'
  | 'Terça-feira'
  | 'Quarta-feira'
  | 'Quinta-feira'
  | 'Sexta-feira'
  | 'Sábado';

export type StatusTurma = 'aberta' | 'fechada' | 'cancelada';

export interface Turma {
  id: string;
  codigo: string;          // Ex: "MAT0123-T01"
  disciplina: string;      // Ex: "Cálculo Diferencial e Integral I"
  professor: string;       // Ex: "Prof. Dr. Carlos Eduardo"
  semestre: string;        // Ex: "2026.1"
  diaSemana: DiaSemana;
  horarioInicio: string;   // Ex: "08:00"
  horarioFim: string;      // Ex: "10:00"
  sala: string;            // Ex: "Pavilhão 2 - Sala 104"
  vagas: number;           // Ex: 40
  vagasOcupadas: number;   // Ex: 28
  status: StatusTurma;
}

export type TurmaFormData = Omit<Turma, 'id' | 'vagasOcupadas'>;

export interface TurmaFiltros {
  busca: string;
  semestre: string;
  status: string;
}

export interface ScheduleConflictErrorDetails {
  tipo: 'conflito_horario';
  mensagem: string;
  conflitoCom?: {
    turmaId: string;
    codigo: string;
    disciplina: string;
    professor: string;
    sala: string;
    diaSemana: string;
    horarioInicio: string;
    horarioFim: string;
  };
}

