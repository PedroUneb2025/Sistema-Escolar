import { useAcoesCadastro } from '../../hooks/useAcoesCadastro';
import { useCallback, useEffect, useState } from 'react';
import { alunoService, type Aluno } from '../../services/alunoService';
import { Icon } from '../../components/Icon';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const LIMITE = 10;

export function AlunosList() {
  const acoes = useAcoesCadastro('alunos');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState<Aluno | null>(null);
  const [form, setForm] = useState<Partial<Aluno>>({});

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      setAlunos(await alunoService.listar({ busca: busca || undefined, limite: LIMITE, offset: pagina * LIMITE }));
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar os alunos.'); }
    finally { setCarregando(false); }
  }, [busca, pagina]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selecionado) return;
    try {
      const { email: _email, status: _status, id_aluno: _id, ...dadosEditaveis } = form;
      void _email; void _status; void _id;
      await alunoService.atualizar(selecionado.id_aluno, dadosEditaveis); setSelecionado(null); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao salvar.'); }
  };
  const alternar = async (aluno: Aluno) => {
    const ativo = aluno.status === 'ativo';
    if (!window.confirm(`Deseja ${ativo ? 'inativar' : 'reativar'} ${aluno.nome_completo}?`)) return;
    try { await alunoService.alternarStatus(aluno.id_aluno, ativo ? 'inativo' : 'ativo'); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao alterar status.'); }
  };

  return <div className="turmas-list-page">
    <header className="page-header"><div><h1>Alunos</h1><p className="text-muted">Consulte os alunos por nome ou matrícula.</p></div></header>
    {erro && <div className="form-alert" role="alert"><Icon name="alertTriangle" /> {erro}</div>}
    <section className="turmas-filter-bar"><div className="search-field"><Icon name="search" /><input aria-label="Buscar aluno" placeholder="Buscar por nome ou matrícula..." value={busca} onChange={e => {setBusca(e.target.value); setPagina(0);}} /></div></section>
    {carregando ? <div className="loading-state-container"><LoadingSpinner /></div> : alunos.length === 0 ? <div className="empty-state-card"><h3>Nenhum aluno encontrado</h3></div> : <div className="table-responsive-container"><table className="turmas-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Status</th>{(acoes.editar || acoes.alterarStatus) && <th>Ações</th>}</tr></thead><tbody>{alunos.map(a => <tr key={a.id_aluno}><td>{a.nome_completo}</td><td>{a.matricula}</td><td>{a.email}</td><td><span className={`status-badge ${a.status === 'ativo' ? 'status-badge--success' : 'status-badge--danger'}`}>{a.status ?? 'Não informado'}</span></td>{(acoes.editar || acoes.alterarStatus) && <td><div className="table-actions">{acoes.editar && <button className="action-button action-button--edit" onClick={async()=>{try{const full=await alunoService.obterPorId(a.id_aluno);setSelecionado(full);setForm({...full});}catch(e){setErro(e instanceof Error?e.message:'Falha ao abrir cadastro.');}}}><Icon name="edit"/><span>Editar</span></button>}{acoes.alterarStatus && a.status && <button className="action-button action-button--delete" onClick={()=>void alternar(a)}>{a.status==='ativo'?'Inativar':'Reativar'}</button>}</div></td>}</tr>)}</tbody></table><div className="pagination"><button className="pagination-btn" disabled={pagina===0} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina+1}</span><button className="pagination-btn" disabled={alunos.length<LIMITE} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div></div>}
    {selecionado && <div className="modal-overlay" onClick={()=>setSelecionado(null)}><div className="modal-content" onClick={e=>e.stopPropagation()}><h2>Editar aluno</h2><form onSubmit={salvar}><label>Nome completo<input required value={form.nome_completo??''} onChange={e=>setForm({...form,nome_completo:e.target.value})}/></label><label>Matrícula<input required value={form.matricula??''} onChange={e=>setForm({...form,matricula:e.target.value})}/></label><label>CPF<input required value={form.cpf??''} onChange={e=>setForm({...form,cpf:e.target.value})}/></label><label>Data de nascimento<input type="date" required value={form.data_nascimento??''} onChange={e=>setForm({...form,data_nascimento:e.target.value})}/></label><label>Telefone<input value={form.telefone??''} onChange={e=>setForm({...form,telefone:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setSelecionado(null)}>Cancelar</button><button type="submit" className="primary-button">Salvar alterações</button></div></form></div></div>}
  </div>;
}
