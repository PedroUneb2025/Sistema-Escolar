import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { turmaSchema, type TurmaSchemaInput } from '../../schemas/turmaSchema';
import type { DiaSemana, StatusTurma, TurmaFormData } from '../../types/turma';
import { getApiError } from '../../services/apiError';
import { turmaService, type OpcoesTurma, isScheduleConflictError } from '../../services/turmaService';

const DIAS_SEMANA: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const STATUS_OPCOES: { valor: StatusTurma; label: string }[] = [
  { valor: 'aberta', label: 'Aberta (inscrições ativas)' },
  { valor: 'fechada', label: 'Fechada (vagas preenchidas)' },
  { valor: 'cancelada', label: 'Cancelada' },
];

interface TurmaFormProps {
  initialData?: TurmaFormData;
  onSubmit: (data: TurmaFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  formTitle: string;
  formSubtitle: string;
}

export function TurmaForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText,
  formTitle,
  formSubtitle,
}: TurmaFormProps) {
  // Estado para a Regra de Negócio: Conflito de Horário
  const [conflitoHorarioErro, setConflitoHorarioErro] = useState<string | null>(null);
  const [erroGenerico, setErroGenerico] = useState<string | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesTurma | null>(null);
  const [erroOpcoes, setErroOpcoes] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    turmaService.opcoes(controller.signal).then(data => {
      if (!controller.signal.aborted) { setOpcoes(data); setErroOpcoes(''); }
    }).catch(error => {
      if (!controller.signal.aborted) setErroOpcoes(getApiError(error, 'Não foi possível carregar disciplinas, professores e salas.'));
    });
    return () => controller.abort();
  }, [tentativa]);
  const podeSalvar = !!opcoes?.disciplinas.length && !!opcoes?.professores.length && !!opcoes?.salas.length;


  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<TurmaSchemaInput>({
    resolver: zodResolver(turmaSchema),
    defaultValues: initialData ?? {
      codigo: '',
      idDisciplina: 0,
      idProfessor: 0,
      semestre: '2026.1',
      diaSemana: 'Segunda-feira',
      horarioInicio: '08:00',
      horarioFim: '10:00',
      idSala: 0,
      vagas: 40,
      status: 'aberta',
    },
  });

  useEffect(() => {
    if (opcoes && initialData) reset(initialData);
  }, [opcoes, initialData, reset]);

  const handleFormSubmit = async (data: TurmaSchemaInput) => {
    setConflitoHorarioErro(null);
    setErroGenerico(null);

    try {
      await onSubmit(data as TurmaFormData);
    } catch (error) {
      if (isScheduleConflictError(error)) {
        // REGRA DE NEGÓCIO: Trata especificamente o erro de conflito de horário
        const mensagem =
          error instanceof Error
            ? getApiError(error, error.message)
            : 'Conflito de horário detectado: a sala ou o docente já possui aula neste mesmo horário.';
        setConflitoHorarioErro(mensagem);
      } else {
        setErroGenerico(
          getApiError(error, 'Ocorreu um erro ao processar a turma. Tente novamente.'),
        );
      }
    }
  };

  return (
    <div className="turma-form-container">
      <div className="turma-form-header">
        <Link to="/turmas" className="back-link">
          <Icon name="arrowLeft" size={18} />
          <span>Voltar para listagem de turmas</span>
        </Link>
        <h2>{formTitle}</h2>
        <p className="text-muted">{formSubtitle}</p>
      </div>

      {/* REGRA DE NEGÓCIO (IMPORTANTE): ALERTA VISUAL DE CONFLITO DE HORÁRIO */}
      {conflitoHorarioErro && (
        <section
          className="conflict-alert"
          role="alert"
          aria-live="assertive"
          data-testid="conflict-schedule-alert"
        >
          <div className="conflict-alert__icon-wrapper">
            <Icon name="alertTriangle" size={28} />
          </div>
          <div className="conflict-alert__body">
            <div className="conflict-alert__header">
              <span className="conflict-alert__badge">Validação do Horário</span>
              <h3>Aviso: Conflito de Horário Detectado</h3>
            </div>
            <p className="conflict-alert__message">{conflitoHorarioErro}</p>
            <div className="conflict-alert__tips">
              <strong>Como resolver:</strong>
              <ul>
                <li>Selecione outro dia da semana ou ajuste os horários de início e término.</li>
                <li>Verifique se a sala indicada já está ocupada por outra turma do Campus II.</li>
                <li>Confira se o(a) docente já não possui outra disciplina atribuída no mesmo período.</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            className="conflict-alert__close"
            onClick={() => setConflitoHorarioErro(null)}
            aria-label="Dispensar aviso de conflito"
          >
            <Icon name="close" size={18} />
          </button>
        </section>
      )}

      {/* Alerta de erro genérico se houver */}
      {erroGenerico && (
        <div className="form-alert" role="alert">
          <Icon name="close" size={18} />
          <span>{erroGenerico}</span>
        </div>
      )}

      {erroOpcoes ? <div role="alert">{erroOpcoes} <button type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>
        : !opcoes ? <p role="status">Carregando opções...</p>
        : !podeSalvar ? <p role="alert">Cadastre disciplinas, professores e salas antes de salvar a turma.</p> : null}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="turma-form" noValidate>
        {/* Seção 1: Dados Acadêmicos */}
        <fieldset className="form-section">
          <legend className="section-label">1. Informações da Disciplina</legend>

          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label htmlFor="codigo">
                Código da Turma <span className="required-mark">*</span>
              </label>
              <div className={`input-shell ${errors.codigo ? 'input-shell--error' : ''}`}>
                <input
                  id="codigo"
                  type="text"
                  placeholder="Ex: MAT0123-T01"
                  {...register('codigo')}
                />
              </div>
              {errors.codigo && <p className="field-error">{errors.codigo.message}</p>}
              <p className="field-help">Identificador único da turma no semestre.</p>
            </div>

            <div className="form-group">
              <label htmlFor="semestre">
                Semestre Letivo <span className="required-mark">*</span>
              </label>
              <div className={`input-shell ${errors.semestre ? 'input-shell--error' : ''}`}>
                <input
                  id="semestre"
                  type="text"
                  placeholder="Ex: 2026.1 ou 2026.2"
                  {...register('semestre')}
                />
              </div>
              {errors.semestre && <p className="field-error">{errors.semestre.message}</p>}
            </div>
          </div>

          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label htmlFor="disciplina">
                Nome da Disciplina <span className="required-mark">*</span>
              </label>
              <div className={`select-shell ${errors.idDisciplina ? 'input-shell--error' : ''}`}>
                <select id="disciplina" {...register('idDisciplina', { valueAsNumber: true })} disabled={!opcoes}>
                  <option value="0">Selecione...</option>
                  {opcoes?.disciplinas.map(item => <option key={item.id_disciplina} value={item.id_disciplina}>{item.nome}</option>)}
                </select>
              </div>
              {errors.idDisciplina && <p className="field-error">{errors.idDisciplina.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="professor">
                Professor(a) / Docente <span className="required-mark">*</span>
              </label>
              <div className={`select-shell ${errors.idProfessor ? 'input-shell--error' : ''}`}>
                <select id="professor" {...register('idProfessor', { valueAsNumber: true })} disabled={!opcoes}>
                  <option value="0">Selecione...</option>
                  {opcoes?.professores.map(item => <option key={item.id_professor} value={item.id_professor}>{item.nome_completo}</option>)}
                </select>
              </div>
              {errors.idProfessor && <p className="field-error">{errors.idProfessor.message}</p>}
            </div>
          </div>
        </fieldset>

        {/* Seção 2: Alocação de Horário e Espaço (Crítico para a Regra de Negócio) */}
        <fieldset className="form-section">
          <legend className="section-label">2. Alocação de Horário e Espaço Físico</legend>

          <div className="form-grid form-grid--3">
            <div className="form-group">
              <label htmlFor="diaSemana">
                Dia da Semana <span className="required-mark">*</span>
              </label>
              <div className={`select-shell ${errors.diaSemana ? 'input-shell--error' : ''}`}>
                <select id="diaSemana" {...register('diaSemana')}>
                  {DIAS_SEMANA.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>
              {errors.diaSemana && <p className="field-error">{errors.diaSemana.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="horarioInicio">
                Horário de Início <span className="required-mark">*</span>
              </label>
              <div className={`input-shell ${errors.horarioInicio ? 'input-shell--error' : ''}`}>
                <input id="horarioInicio" type="time" {...register('horarioInicio')} />
              </div>
              {errors.horarioInicio && (
                <p className="field-error">{errors.horarioInicio.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="horarioFim">
                Horário de Término <span className="required-mark">*</span>
              </label>
              <div className={`input-shell ${errors.horarioFim ? 'input-shell--error' : ''}`}>
                <input id="horarioFim" type="time" {...register('horarioFim')} />
              </div>
              {errors.horarioFim && <p className="field-error">{errors.horarioFim.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="sala">
              Sala / Laboratório <span className="required-mark">*</span>
            </label>
            <div className={`select-shell ${errors.idSala ? 'input-shell--error' : ''}`}>
              <select id="sala" {...register('idSala', { valueAsNumber: true })} disabled={!opcoes}>
                  <option value="0">Selecione...</option>
                  {opcoes?.salas.map(item => <option key={item.id_sala} value={item.id_sala}>{item.codigo}</option>)}
                </select>
            </div>
            {errors.idSala && <p className="field-error">{errors.idSala.message}</p>}
            <p className="field-help">Espaço físico no campus destinado às aulas da turma.</p>
          </div>
        </fieldset>

        {/* Seção 3: Vagas e Situação */}
        <fieldset className="form-section">
          <legend className="section-label">3. Vagas e Situação da Turma</legend>

          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label htmlFor="vagas">
                Capacidade de Vagas <span className="required-mark">*</span>
              </label>
              <div className={`input-shell ${errors.vagas ? 'input-shell--error' : ''}`}>
                <input
                  id="vagas"
                  type="number"
                  min="1"
                  max="200"
                  {...register('vagas', { valueAsNumber: true })}
                />
              </div>
              {errors.vagas && <p className="field-error">{errors.vagas.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="status">
                Status da Turma <span className="required-mark">*</span>
              </label>
              <div className={`select-shell ${errors.status ? 'input-shell--error' : ''}`}>
                <select id="status" {...register('status')}>
                  {STATUS_OPCOES.map((opt) => (
                    <option key={opt.valor} value={opt.valor}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.status && <p className="field-error">{errors.status.message}</p>}
            </div>
          </div>
        </fieldset>

        <div className="form-actions">
          <Link to="/turmas" className="secondary-button">
            Cancelar
          </Link>
          <button type="submit" className="primary-button" disabled={isSubmitting || !podeSalvar}>
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                <span>Gravando dados...</span>
              </>
            ) : (
              <>
                <Icon name="check" size={18} />
                <span>{submitButtonText}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

