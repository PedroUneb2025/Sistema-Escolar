import { describe, it, expect } from 'vitest';
import { validarConflitoTurma, isHorarioSobreposto, Turma } from './turmaValidation';

describe('Validação de Horários e Conflitos de Turma', () => {
  it('deve identificar sobreposição de horários no mesmo dia', () => {
    const h1 = { diaSemana: 1, horarioInicio: '08:00', horarioFim: '10:00' };
    const h2 = { diaSemana: 1, horarioInicio: '09:00', horarioFim: '11:00' };
    const h3 = { diaSemana: 1, horarioInicio: '10:00', horarioFim: '12:00' };

    expect(isHorarioSobreposto(h1, h2)).toBe(true);
    expect(isHorarioSobreposto(h1, h3)).toBe(false);
  });

  it('deve detectar conflito quando o mesmo professor tem turmas sobrepostas', () => {
    const turmasExistentes: Turma[] = [
      {
        id: '1',
        professorId: 'prof-1',
        salaId: 'sala-A',
        horarios: [{ diaSemana: 1, horarioInicio: '08:00', horarioFim: '10:00' }],
      },
    ];

    const novaTurma: Turma = {
      professorId: 'prof-1',
      salaId: 'sala-B',
      horarios: [{ diaSemana: 1, horarioInicio: '09:00', horarioFim: '11:00' }],
    };

    const resultado = validarConflitoTurma(novaTurma, turmasExistentes);
    expect(resultado.conflito).toBe(true);
    expect(resultado.mensagem).toContain('o mesmo professor');
  });

  it('deve detectar conflito quando a mesma sala é agendada em horários sobrepostos', () => {
    const turmasExistentes: Turma[] = [
      {
        id: '1',
        professorId: 'prof-1',
        salaId: 'sala-101',
        horarios: [{ diaSemana: 2, horarioInicio: '14:00', horarioFim: '16:00' }],
      },
    ];

    const novaTurma: Turma = {
      professorId: 'prof-2',
      salaId: 'sala-101',
      horarios: [{ diaSemana: 2, horarioInicio: '15:00', horarioFim: '17:00' }],
    };

    const resultado = validarConflitoTurma(novaTurma, turmasExistentes);
    expect(resultado.conflito).toBe(true);
    expect(resultado.mensagem).toContain('a mesma sala');
  });

  it('não deve apontar conflito para turmas em dias ou horários distintos', () => {
    const turmasExistentes: Turma[] = [
      {
        id: '1',
        professorId: 'prof-1',
        salaId: 'sala-101',
        horarios: [{ diaSemana: 1, horarioInicio: '08:00', horarioFim: '10:00' }],
      },
    ];

    const novaTurma: Turma = {
      professorId: 'prof-1',
      salaId: 'sala-101',
      horarios: [{ diaSemana: 2, horarioInicio: '08:00', horarioFim: '10:00' }], // Outro dia
    };

    const resultado = validarConflitoTurma(novaTurma, turmasExistentes);
    expect(resultado.conflito).toBe(false);
  });
});