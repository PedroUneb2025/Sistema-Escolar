import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { TurmaForm } from './TurmaForm';
import { turmaService } from '../../services/turmaService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Icon } from '../../components/Icon';
import type { Turma, TurmaFormData } from '../../types/turma';

export function TurmaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [turma, setTurma] = useState<Turma | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  useEffect(() => {
    async function carregarTurma() {
      if (!id) return;
      setIsLoading(true);
      setErroCarregamento(null);

      try {
        const dados = await turmaService.obterPorId(id);
        setTurma(dados);
      } catch (error) {
        setErroCarregamento(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados da turma para edição.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    carregarTurma();
  }, [id]);

  const handleUpdateTurma = async (data: TurmaFormData, simularConflito: boolean) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await turmaService.atualizar(id, data, simularConflito);
      navigate('/turmas', {
        state: {
          mensagemSucesso: `Turma ${data.codigo} atualizada com sucesso!`,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-state-container">
        <LoadingSpinner />
        <p>Carregando dados da turma...</p>
      </div>
    );
  }

  if (erroCarregamento || !turma) {
    return (
      <div className="turma-error-state">
        <div className="error-card">
          <Icon name="alertTriangle" size={40} />
          <h3>Turma não encontrada</h3>
          <p>{erroCarregamento ?? 'A turma solicitada não foi localizada no sistema acadêmico.'}</p>
          <Link to="/turmas" className="primary-button">
            Voltar para listagem de turmas
          </Link>
        </div>
      </div>
    );
  }

  const initialData: TurmaFormData = {
    codigo: turma.codigo,
    disciplina: turma.disciplina,
    professor: turma.professor,
    semestre: turma.semestre,
    diaSemana: turma.diaSemana,
    horarioInicio: turma.horarioInicio,
    horarioFim: turma.horarioFim,
    sala: turma.sala,
    vagas: turma.vagas,
    status: turma.status,
  };

  return (
    <div className="turma-page">
      <TurmaForm
        formTitle={`Editar Turma: ${turma.codigo}`}
        formSubtitle={`Alteração de dados acadêmicos, horários e alocação física da turma.`}
        submitButtonText="Salvar Alterações"
        initialData={initialData}
        isSubmitting={isSubmitting}
        onSubmit={handleUpdateTurma}
      />
    </div>
  );
}

