import { describe, expect, it } from 'vitest';
import { validarConflitoTurma } from './turmaValidation';

const aula = { diaSemana: 1, horarioInicio: '08:00', horarioFim: '10:00' };
const turma = { salaId: 'A', professorId: '1', horarios: [aula] };

describe('conflitos de horário', () => {
  it('detecta sobreposição na mesma sala com professores diferentes', () => {
    expect(validarConflitoTurma(turma, [{ ...turma, professorId: '2' }]).conflito).toBe(true);
  });

  it('permite aulas consecutivas e a edição da própria turma', () => {
    const seguinte = { ...aula, horarioInicio: '10:00', horarioFim: '12:00' };
    expect(validarConflitoTurma(turma, [{ ...turma, horarios: [seguinte] }]).conflito).toBe(false);
    expect(validarConflitoTurma({ ...turma, id: '1' }, [{ ...turma, id: '1' }]).conflito).toBe(false);
  });
});
