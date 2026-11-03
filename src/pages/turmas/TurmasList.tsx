import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ModalExclusao } from './ModalExclusao';
import { turmaService } from '../../services/turmaService';
import type { Turma } from '../../types/turma';

export function TurmasList() {
  const location = useLocation();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Mensagem temporária após redirecionamento de cadastro/edição
  const [feedbackMensagem, setFeedbackMensagem] = useState<string | null>(
    (location.state as { mensagemSucesso?: string } | null)?.mensagemSucesso ?? null,
  );

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Estado para exclusão
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<Turma | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const carregarTurmas = async () => {
    setIsLoading(true);
    setErro(null);
    try {
      const dados = await turmaService.listar();
      setTurmas(dados);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : 'Falha ao carregar as turmas cadastradas.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarTurmas();
  }, []);

  // Limpa mensagem de feedback após 5 segundos
  useEffect(() => {
    if (!feedbackMensagem) return;
    const timer = setTimeout(() => setFeedbackMensagem(null), 5000);
    return () => clearTimeout(timer);
  }, [feedbackMensagem]);

  // Lista única de semestres para o select de filtro
  const semestresDisponiveis = useMemo(() => {
    const s = new Set<string>();
    turmas.forEach((t) => s.add(t.semestre));
    return Array.from(s).sort().reverse();
  }, [turmas]);

  // Filtro dinâmico
  const turmasFiltradas = useMemo(() => {
    return turmas.filter((turma) => {
      const matchBusca =
        busca.trim() === '' ||
        turma.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        turma.disciplina.toLowerCase().includes(busca.toLowerCase()) ||
        turma.professor.toLowerCase().includes(busca.toLowerCase()) ||
        turma.sala.toLowerCase().includes(busca.toLowerCase());

      const matchSemestre =
        filtroSemestre === 'todos' || turma.semestre === filtroSemestre;

      const matchStatus =
        filtroStatus === 'todos' || turma.status === filtroStatus;

      return matchBusca && matchSemestre && matchStatus;
    });
  }, [turmas, busca, filtroSemestre, filtroStatus]);

  // Estatísticas rápidas
  const totalTurmas = turmas.length;
  const totalVagas = turmas.reduce((acc, t) => acc + t.vagas, 0);
  const turmasAbertas = turmas.filter((t) => t.status === 'aberta').length;

  const handleConfirmExclusao = async () => {
    if (!turmaParaExcluir) return;
    setIsDeleting(true);

    try {
      await turmaService.excluir(turmaParaExcluir.id);
      setTurmas((prev) => prev.filter((t) => t.id !== turmaParaExcluir.id));
      setFeedbackMensagem(`Turma ${turmaParaExcluir.codigo} excluída com sucesso.`);
      setTurmaParaExcluir(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao excluir a turma.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: Turma['status']) => {
    switch (status) {
      case 'aberta':
        return <span className="status-badge status-badge--success">Aberta</span>;
      case 'fechada':
        return <span className="status-badge status-badge--warning">Fechada</span>;
      case 'cancelada':
        return <span className="status-badge status-badge--danger">Cancelada</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="turmas-list-page">
      {/* Topo / Cabeçalho */}
      <header className="page-header">
        <div>
          <span className="section-label">Campus II · Gestão Acadêmica</span>
          <h1>Turmas e Horários</h1>
          <p className="text-muted">
            Consulte, cadastre, edite e gerencie as turmas e salas do período letivo.
          </p>
        </div>
        <div className="page-header__actions">
          <Link to="/turmas/nova" className="primary-button create-button">
            <Icon name="plus" size={18} />
            <span>Cadastrar Nova Turma</span>
          </Link>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="summary-grid">
        <article className="summary-card">
          <span className="summary-card__icon">
            <Icon name="book" />
          </span>
          <h3>Total de Turmas</h3>
          <strong className="summary-card__value">{totalTurmas}</strong>
          <p>Turmas registradas no sistema</p>
        </article>

        <article className="summary-card">
          <span className="summary-card__icon">
            <Icon name="users" />
          </span>
          <h3>Capacidade Ofertada</h3>
          <strong className="summary-card__value">{totalVagas}</strong>
          <p>Vagas totais para matrículas</p>
        </article>

        <article className="summary-card">
          <span className="summary-card__icon">
            <Icon name="clock" />
          </span>
          <h3>Turmas em Aberto</h3>
          <strong className="summary-card__value">{turmasAbertas}</strong>
          <p>Turmas ativas com matrículas abertas</p>
        </article>
      </div>

      {/* Feedback de sucesso */}
      {feedbackMensagem && (
        <div className="success-banner" role="status">
          <Icon name="check" size={20} />
          <span>{feedbackMensagem}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setFeedbackMensagem(null)}
            aria-label="Fechar mensagem"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Erro global */}
      {erro && (
        <div className="form-alert" role="alert">
          <Icon name="alertTriangle" size={20} />
          <span>{erro}</span>
        </div>
      )}

      {/* Painel de Filtros e Busca */}
      <section className="turmas-filter-bar">
        <div className="search-field">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Buscar por código, disciplina, professor ou sala..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar turmas"
          />
          {busca && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div className="filter-selects">
          <div className="filter-item">
            <label htmlFor="filtro-semestre" className="sr-only">
              Semestre
            </label>
            <select
              id="filtro-semestre"
              value={filtroSemestre}
              onChange={(e) => setFiltroSemestre(e.target.value)}
            >
              <option value="todos">Todos os semestres</option>
              {semestresDisponiveis.map((sem) => (
                <option key={sem} value={sem}>
                  Semestre {sem}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="filtro-status" className="sr-only">
              Status
            </label>
            <select
              id="filtro-status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="aberta">Apenas Abertas</option>
              <option value="fechada">Apenas Fechadas</option>
              <option value="cancelada">Apenas Canceladas</option>
            </select>
          </div>
        </div>
      </section>

      {/* Conteúdo: Tabela de Turmas ou Loading */}
      {isLoading ? (
        <div className="loading-state-container">
          <LoadingSpinner />
          <p>Carregando catálogo de turmas...</p>
        </div>
      ) : turmasFiltradas.length === 0 ? (
        <div className="empty-state-card">
          <Icon name="book" size={44} />
          <h3>Nenhuma turma encontrada</h3>
          <p>
            {busca || filtroSemestre !== 'todos' || filtroStatus !== 'todos'
              ? 'Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os termos da pesquisa.'
              : 'Ainda não há turmas cadastradas no período.'}
          </p>
          {busca || filtroSemestre !== 'todos' || filtroStatus !== 'todos' ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setBusca('');
                setFiltroSemestre('todos');
                setFiltroStatus('todos');
              }}
            >
              Limpar filtros de busca
            </button>
          ) : (
            <Link to="/turmas/nova" className="primary-button">
              <Icon name="plus" size={18} />
              <span>Cadastrar primeira turma</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="turmas-table" aria-label="Tabela de turmas cadastradas">
            <thead>
              <tr>
                <th scope="col">Código / Disciplina</th>
                <th scope="col">Docente Responsável</th>
                <th scope="col">Semestre</th>
                <th scope="col">Dia e Horário</th>
                <th scope="col">Espaço / Sala</th>
                <th scope="col">Ocupação / Vagas</th>
                <th scope="col">Situação</th>
                <th scope="col" className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmasFiltradas.map((turma) => {
                const percentualOcupacao = Math.min(
                  100,
                  Math.round(((turma.vagasOcupadas ?? 0) / turma.vagas) * 100),
                );

                return (
                  <tr key={turma.id}>
                    <td>
                      <div className="turma-discipline-cell">
                        <strong className="turma-code">{turma.codigo}</strong>
                        <span className="turma-name">{turma.disciplina}</span>
                      </div>
                    </td>
                    <td>
                      <span className="turma-professor">{turma.professor}</span>
                    </td>
                    <td>
                      <span className="semester-pill">{turma.semestre}</span>
                    </td>
                    <td>
                      <div className="schedule-badge">
                        <Icon name="clock" size={14} />
                        <div>
                          <strong>{turma.diaSemana}</strong>
                          <small>
                            {turma.horarioInicio} às {turma.horarioFim}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="room-label">{turma.sala}</span>
                    </td>
                    <td>
                      <div className="vagas-cell">
                        <span className="vagas-text">
                          <strong>{turma.vagasOcupadas ?? 0}</strong> / {turma.vagas} vagas
                        </span>
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-valuenow={percentualOcupacao}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Ocupação: ${percentualOcupacao}%`}
                        >
                          <span style={{ width: `${percentualOcupacao}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(turma.status)}</td>
                    <td className="text-right">
                      <div className="table-actions">
                        <Link
                          to={`/turmas/${turma.id}/editar`}
                          className="action-button action-button--edit"
                          title="Editar turma"
                          aria-label={`Editar turma ${turma.codigo}`}
                        >
                          <Icon name="edit" size={16} />
                          <span>Editar</span>
                        </Link>
                        <button
                          type="button"
                          className="action-button action-button--delete"
                          onClick={() => setTurmaParaExcluir(turma)}
                          title="Excluir turma"
                          aria-label={`Excluir turma ${turma.codigo}`}
                        >
                          <Icon name="trash" size={16} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <ModalExclusao
        turma={turmaParaExcluir}
        isOpen={turmaParaExcluir !== null}
        isDeleting={isDeleting}
        onConfirm={handleConfirmExclusao}
        onCancel={() => setTurmaParaExcluir(null)}
      />
    </div>
  );
}

