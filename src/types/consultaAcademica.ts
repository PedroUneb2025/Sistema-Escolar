export interface HorarioAula {
  diaSemana: string;      // Ex: "Segunda-feira" ou "SEG"
  diaSemanaNumero?: number; // 1 (Seg) a 6 (Sáb)
  horarioInicio: string;  // "08:00"
  horarioFim: string;     // "10:00"
  sala: string;           // "Pavilhão 2 - Sala 104"
  codigoTurma: string;    // "MAT0123-T01"
}

export interface ItemConsultaAcademica {
  idMatricula: string | number;
  codigoTurma: string;
  disciplinaCodigo: string;
  disciplinaNome: string;
  professorNome: string;
  semestre: string;
  sala: string;
  nota1?: number | null;
  nota2?: number | null;
  notaFinal?: number | null;
  frequencia?: number | null; // % (0 a 100)
  situacao: 'matriculado' | 'aprovado' | 'reprovado_nota' | 'reprovado_falta' | 'trancado';
  horarios: HorarioAula[];
}

export interface FiltrosConsultaAcademica {
  semestre?: string;
  busca?: string;
  situacao?: string;
}
