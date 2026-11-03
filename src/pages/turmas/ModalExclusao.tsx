import { useEffect } from 'react';
import { Icon } from '../../components/Icon';
import type { Turma } from '../../types/turma';

interface ModalExclusaoProps {
  turma: Turma | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModalExclusao({
  turma,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: ModalExclusaoProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !turma) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-exclusao-title"
    >
      <div className="modal-backdrop" onClick={!isDeleting ? onCancel : undefined} />
      <div className="modal-content">
        <div className="modal-icon-header modal-icon-header--danger">
          <Icon name="trash" size={28} />
        </div>

        <h3 id="modal-exclusao-title">Confirmar exclusão de turma</h3>

        <p className="modal-description">
          Tem certeza que deseja excluir a turma <strong>{turma.codigo}</strong> (
          {turma.disciplina})?
        </p>

        <div className="modal-info-box">
          <div>
            <span className="text-muted">Docente:</span>{' '}
            <strong>{turma.professor}</strong>
          </div>
          <div>
            <span className="text-muted">Horário:</span>{' '}
            <span>
              {turma.diaSemana}, {turma.horarioInicio} - {turma.horarioFim}
            </span>
          </div>
          <div>
            <span className="text-muted">Sala:</span>{' '}
            <span>{turma.sala}</span>
          </div>
        </div>

        <p className="modal-warning-text">
          Esta ação não poderá ser desfeita e removerá os dados de matrículas associados.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Sim, excluir turma'}
          </button>
        </div>
      </div>
    </div>
  );
}

