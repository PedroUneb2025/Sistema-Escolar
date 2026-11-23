import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '../../components/Icon';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { professorService, Professor } from '../../services/professorService';

const ITEMS_PER_PAGE = 10;

export function ProfessoresList() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Estado para edição
  const [professoresParaEditar, setProfessoresParaEditar] = useState<Professor | null>(null);
  const [formDados, setFormDados] = useState<Partial<Professor>>({});
  const [isEditando, setIsEditando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarProfessores = useCallback(async () => {
    setIsLoading(true);
    setErro(null);
    try {
      const dados = await professorService.listar({ limite: 500 });
      setProfessores(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao carregar os professores.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarProfessores();
  }, [carregarProfessores]);

  // Filtragem por busca e status
  const professoresFiltrados = useMemo(() => {
    return professores.filter((p) => {
      const matchBusca =
        busca.trim() === '' ||
        p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
        p.matricula_funcional.toLowerCase().includes(busca.toLowerCase()) ||
        (p.email ?? '').toLowerCase().includes(busca.toLowerCase());
      const matchStatus =
        filtroStatus === 'todos' || (p.status ?? 'ativo') === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [professores, busca, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(professoresFiltrados.length / ITEMS_PER_PAGE));
  const professoresPagina = professoresFiltrados.slice(
    (pagina - 1) * ITEMS_PER_PAGE,
    pagina * ITEMS_PER_PAGE,
  );

  // Edição
  const abrirEdicao = async (prof: Professor) => {
    try {
      const completo = await professorService.obterPorId(prof.id_professor);
      setProfessoresParaEditar(completo);
      setFormDados({
        nome_completo: completo.nome_completo,
        matricula_funcional: completo.matricula_funcional,
        titulacao: completo.titulacao,
        cpf: completo.cpf,
      });
      setIsEditando(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao carregar cadastro do professor.');
    }
  };

  const salvarEdicao = async () => {
    if (!professoresParaEditar) return;
    try {
      const { email: _email, status: _status, id_professor: _id, ...dadosEditaveis } = formDados;
      void _email; void _status; void _id;
      await professorService.atualizar(professoresParaEditar.id_professor, dadosEditaveis);
      setSucesso(`Professor ${formDados.nome_completo} atualizado com sucesso.`);
      setIsEditando(false);
      setProfessoresParaEditar(null);
      await carregarProfessores();
      setTimeout(() => setSucesso(null), 5000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao atualizar o professor.');
    }
  };

  const alternarStatus = async (prof: Professor) => {
    if (!window.confirm(`Deseja ${prof.status === 'ativo' ? 'inativar' : 'reativar'} o professor ${prof.nome_completo}?`)) return;
    try {
      await professorService.alternarStatus(prof.id_professor, prof.status === 'ativo' ? 'inativo' : 'ativo');
      setSucesso(`Status do professor ${prof.nome_completo} alterado com sucesso.`);
      await carregarProfessores();
      setTimeout(() => setSucesso(null), 5000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao alternar o status.');
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (status === 'ativo') {
      return <span className="status-badge status-badge--success">Ativo</span>;
    }
    return <span className="status-badge status-badge--danger">Inativo</span>;
  };

  return (
    <div className="professores-list-page">
      <header className="page-header">
        <div>
          <span className="section-label">Campus II · Gestão Acadêmica</span>
          <h1>Professores</h1>
          <p className="text-muted">
            Consulte, edite e gerencie o acesso dos professores cadastrados.
          </p>
        </div>
      </header>

      <div className="summary-grid">
        <article className="summary-card">
          <span className="summary-card__icon"><Icon name="users" /></span>
          <h3>Total de Professores</h3>
          <strong className="summary-card__value">{professores.length}</strong>
          <p>Professores registrados no sistema</p>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon"><Icon name="check" /></span>
          <h3>Professores Ativos</h3>
          <strong className="summary-card__value">
            {professores.filter((p) => p.status === 'ativo').length}
          </strong>
          <p>Com acesso liberado ao sistema</p>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon"><Icon name="close" /></span>
          <h3>Professores Inativos</h3>
          <strong className="summary-card__value">
            {professores.filter((p) => p.status !== 'ativo').length}
          </strong>
          <p>Com acesso bloqueado</p>
        </article>
      </div>

      {sucesso && (
        <div className="success-banner" role="status">
          <Icon name="check" size={20} />
          <span>{sucesso}</span>
          <button type="button" className="icon-button" onClick={() => setSucesso(null)} aria-label="Fechar">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {erro && (
        <div className="form-alert" role="alert">
          <Icon name="alertTriangle" size={20} />
          <span>{erro}</span>
        </div>
      )}

      <section className="turmas-filter-bar">
        <div className="search-field">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula funcional ou e-mail..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            aria-label="Buscar professores"
          />
          {busca && (
            <button type="button" className="search-clear-btn" onClick={() => setBusca('')} aria-label="Limpar busca">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <div className="filter-selects">
          <div className="filter-item">
            <label htmlFor="filtro-status" className="sr-only">Status</label>
            <select id="filtro-status" value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }}>
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="loading-state-container">
          <LoadingSpinner />
          <p>Carregando lista de professores...</p>
        </div>
      ) : professoresPagina.length === 0 ? (
        <div className="empty-state-card">
          <Icon name="users" size={44} />
          <h3>Nenhum professor encontrado</h3>
          <p>{busca ? 'Nenhum resultado corresponde aos filtros aplicados.' : 'Ainda não há professores cadastrados.'}</p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="turmas-table" aria-label="Tabela de professores cadastrados">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Matrícula Funcional</th>
                <th scope="col">E-mail</th>
                <th scope="col">Titulação</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professoresPagina.map((prof) => (
                <tr key={prof.id_professor}>
                  <td><strong>{prof.nome_completo}</strong></td>
                  <td>{prof.matricula_funcional}</td>
                  <td>{prof.email ?? '—'}</td>
                  <td>{prof.titulacao ?? '—'}</td>
                  <td>{getStatusBadge(prof.status)}</td>
                  <td className="text-right">
                    <div className="table-actions">
                      <button type="button" className="action-button action-button--edit" onClick={() => abrirEdicao(prof)} title="Editar professor">
                        <Icon name="edit" size={16} />
                        <span>Editar</span>
                      </button>
                      <button type="button" className={`action-button ${prof.status === 'ativo' ? 'action-button--delete' : 'action-button--success'}`} onClick={() => alternarStatus(prof)} title={prof.status === 'ativo' ? 'Inativar professor' : 'Reativar professor'}>
                        <Icon name={prof.status === 'ativo' ? 'close' : 'check'} size={16} />
                        <span>{prof.status === 'ativo' ? 'Inativar' : 'Reativar'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div className="pagination">
              <button type="button" className="pagination-btn" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
                <Icon name="arrowLeft" size={16} /> Anterior
              </button>
              <span className="pagination-info">Página {pagina} de {totalPaginas}</span>
              <button type="button" className="pagination-btn" disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>
                Próxima <Icon name="arrowLeft" size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de edição */}
      {isEditando && professoresParaEditar && (
        <div className="modal-overlay" onClick={() => setIsEditando(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Professor</h3>
            <p className="text-muted">Corrija os dados cadastrais. E-mail e senha não são editáveis nesta tela.</p>
            <form onSubmit={(e) => { e.preventDefault(); salvarEdicao(); }}>
              <div className="form-group">
                <label htmlFor="nome">Nome completo</label>
                <input id="nome" type="text" value={formDados.nome_completo ?? ''} onChange={(e) => setFormDados({ ...formDados, nome_completo: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="matricula">Matrícula funcional</label>
                <input id="matricula" type="text" value={formDados.matricula_funcional ?? ''} onChange={(e) => setFormDados({ ...formDados, matricula_funcional: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="cpf-professor">CPF</label>
                <input id="cpf-professor" type="text" value={formDados.cpf ?? ''} onChange={(e) => setFormDados({ ...formDados, cpf: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="titulacao">Titulação</label>
                <input id="titulacao" type="text" value={formDados.titulacao ?? ''} onChange={(e) => setFormDados({ ...formDados, titulacao: e.target.value })} disabled placeholder="Não editável após cadastro" />
              </div>
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input id="email" type="email" value={formDados.email ?? ''} onChange={(e) => setFormDados({ ...formDados, email: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setIsEditando(false)}>Cancelar</button>
                <button type="submit" className="primary-button"><Icon name="check" size={16} /> Salvar alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
