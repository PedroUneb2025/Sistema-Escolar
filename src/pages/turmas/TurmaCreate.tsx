import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TurmaForm } from './TurmaForm';
import { turmaService } from '../../services/turmaService';
import type { TurmaFormData } from '../../types/turma';

export function TurmaCreate() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleCreateTurma = async (data: TurmaFormData, simularConflito: boolean) => {
    setIsSubmitting(true);
    try {
      await turmaService.criar(data, simularConflito);
      navigate('/turmas', {
        state: {
          mensagemSucesso: `Turma ${data.codigo} cadastrada com sucesso!`,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="turma-page">
      <TurmaForm
        formTitle="Cadastrar Nova Turma"
        formSubtitle="Preencha os dados da disciplina, horário e sala para o período letivo."
        submitButtonText="Cadastrar Turma"
        isSubmitting={isSubmitting}
        onSubmit={handleCreateTurma}
      />
    </div>
  );
}

