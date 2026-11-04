import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { matriculaService, matriculaError } from '../../services/matriculaService';
import { isDemoSession } from '../../services/demoMode';
import type { Matricula } from '../../types/matricula';
import type { Turma } from '../../types/turma';
import '../../styles/matriculas.css';

function impedimento(turma: Turma, matriculas: Matricula[], turmas: Turma[]) {
  // O banco impede uma segunda matrícula na mesma turma, independentemente da situação.
  if (matriculas.some((m) => String(m.id_turma) === turma.id)) return 'Já possui matrícula nesta turma';
  if (turma.status !== 'aberta') return turma.status === 'cancelada' ? 'Turma cancelada' : 'Turma fechada';
  if (turma.vagasOcupadas >= turma.vagas) return 'Sem vagas';
  const conflito = matriculas.filter((m) => m.situacao === 'matriculado').some((m) => {
    const outra = m.turma ?? turmas.find((t) => t.id === String(m.id_turma));
    return outra && outra.semestre === turma.semestre && outra.diaSemana === turma.diaSemana &&
      outra.horarioInicio < turma.horarioFim && turma.horarioInicio < outra.horarioFim;
  });
  return conflito ? 'Conflito com seu horário atual' : '';
}
const situacoes: Record<Matricula['situacao'], string> = {
  matriculado: 'Matriculado', aprovado: 'Aprovado', reprovado_nota: 'Reprovado por nota',
  reprovado_falta: 'Reprovado por falta', trancado: 'Trancado',
};

export function MatriculaOnline() {
  const { token } = useAuth();
  const realSession = Boolean(token && !/^(temp-token-|mock-)/.test(token) && !isDemoSession());
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busca, setBusca] = useState('');
  const [semestre, setSemestre] = useState('');
  const [selected, setSelected] = useState<Turma | null>(null);
  const lock = useRef(false);
  const confirmation = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!realSession) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setSelected(null); setTurmas([]); setMatriculas([]);
    Promise.all([matriculaService.listarTurmas(controller.signal), matriculaService.minhas(controller.signal)])
      .then(([t, m]) => {
        if (controller.signal.aborted) return;
        setTurmas(t); setMatriculas(m); setNeedsRefresh(false);
      })
      .catch((err) => { if (!controller.signal.aborted) { setError(matriculaError(err)); setNeedsRefresh(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [realSession, token, attempt]);
  useEffect(() => { if (selected) confirmation.current?.focus(); }, [selected]);

  async function confirmar() {
    if (!selected || lock.current || needsRefresh || !realSession) return;
    const block = impedimento(selected, matriculas, turmas);
    if (block) { setError(block); return; }
    lock.current = true; setSaving(true); setError(''); setSuccess('');
    try {
      const result = await matriculaService.matricular({ id_turma: Number(selected.id) });
      setMatriculas((current) => [...current.filter((m) => m.id_turma !== result.id_turma), { ...result, turma: result.turma ?? selected }]);
      setSuccess(`Matrícula confirmada em ${selected.disciplina} (${selected.codigo}). Protocolo: ${result.id_matricula_turma}.`);
      setSelected(null);
      try {
        const [t, m] = await Promise.all([matriculaService.listarTurmas(), matriculaService.minhas()]);
        setTurmas(t); setMatriculas(m);
      } catch {
        setError('A matrícula foi confirmada, mas não foi possível atualizar as listas. Atualize antes de fazer outra matrícula.');
        setNeedsRefresh(true);
      }
    } catch (err) {
      setError(matriculaError(err));
      // Em timeout, a API pode ter concluído a gravação. Reconsultar evita repetir o POST.
      setNeedsRefresh(true);
    } finally { lock.current = false; setSaving(false); }
  }

  const disponiveis = turmas.filter((t) => (!semestre || t.semestre === semestre) &&
    `${t.codigo} ${t.disciplina} ${t.professor}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));

  return <section className="matricula-online" aria-labelledby="matricula-title">
    <header className="matricula-heading"><div><span className="section-label">Portal do aluno</span><h1 id="matricula-title">Matrícula online</h1>
      <p>Escolha uma turma, confira os horários e confirme sua matrícula.</p></div>
      <Link className="secondary-button" to="/aluno/consulta">Consulta acadêmica</Link>
    </header>
    {!realSession ? <div role="alert" className="form-alert">A matrícula exige uma conta real de aluno. Saia do acesso de demonstração e entre com seu e-mail e senha institucionais.</div> : <>
      {success && <p role="status" className="matricula-success">{success}</p>}
      {error && <div role="alert" className="form-alert">{error}</div>}
      <button type="button" className="secondary-button" disabled={loading || saving} onClick={() => setAttempt((n) => n + 1)}>{loading ? 'Atualizando...' : 'Atualizar listas'}</button>
      {loading ? <p role="status">Carregando turmas e matrículas...</p> : <>
        {selected && <section className="matricula-confirm" ref={confirmation} tabIndex={-1} aria-labelledby="confirm-title">
          <h2 id="confirm-title">Confirme sua matrícula</h2>
          <dl><dt>Disciplina</dt><dd>{selected.disciplina} — {selected.codigo}</dd><dt>Professor</dt><dd>{selected.professor}</dd>
            <dt>Semestre</dt><dd>{selected.semestre}</dd><dt>Horário</dt><dd>{selected.diaSemana}, {selected.horarioInicio}–{selected.horarioFim}</dd><dt>Sala</dt><dd>{selected.sala}</dd></dl>
          <p>A confirmação depende da disponibilidade de vagas e da validação acadêmica pelo servidor.</p>
          <div className="matricula-actions"><button type="button" className="primary-button" disabled={saving || needsRefresh} onClick={() => void confirmar()}>{saving ? 'Confirmando...' : 'Confirmar matrícula'}</button>
            <button type="button" className="secondary-button" disabled={saving} onClick={() => setSelected(null)}>Cancelar seleção</button></div>
        </section>}
        <section aria-labelledby="turmas-title"><h2 id="turmas-title">Turmas para matrícula</h2>
          <div className="matricula-filters"><label>Buscar turma<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Disciplina, código ou professor" /></label>
            <label>Semestre<select value={semestre} onChange={(e) => setSemestre(e.target.value)}><option value="">Todos os semestres</option>{[...new Set(turmas.map((t) => t.semestre))].sort().reverse().map((s) => <option key={s}>{s}</option>)}</select></label></div>
          {needsRefresh ? <p>Atualize as listas para consultar as vagas e continuar.</p> : !disponiveis.length ? <p>{turmas.length ? 'Nenhuma turma encontrada com esses filtros.' : 'Não há turmas disponíveis para consulta.'}</p> : <div className="matricula-table"><table><caption>Oferta de turmas</caption>
            <thead><tr><th>Turma</th><th>Semestre e horário</th><th>Vagas livres</th><th>Ação</th></tr></thead>
            <tbody>{disponiveis.map((t) => { const block = impedimento(t, matriculas, turmas); return <tr key={t.id}>
              <td><strong>{t.disciplina}</strong><br />{t.codigo}<br />{t.professor}<br />{t.sala}</td>
              <td>{t.semestre}<br />{t.diaSemana}<br />{t.horarioInicio}–{t.horarioFim}</td><td>{Math.max(0, t.vagas - t.vagasOcupadas)}</td>
              <td>{block ? <span>{block}</span> : <button type="button" className="secondary-button" disabled={saving} aria-label={`Selecionar ${t.codigo}`} onClick={() => { setSelected(t); setError(''); setSuccess(''); }}>Selecionar turma</button>}</td>
            </tr>; })}</tbody></table></div>}
        </section>
        <section aria-labelledby="minhas-title"><h2 id="minhas-title">Minhas matrículas</h2>
          {!matriculas.length ? <p>{needsRefresh ? 'Não foi possível confirmar suas matrículas. Atualize as listas.' : 'Você ainda não possui matrículas registradas.'}</p> : <div className="matricula-table"><table><caption>Matrículas registradas</caption><thead><tr><th>Disciplina / turma</th><th>Semestre</th><th>Situação</th><th>Protocolo</th></tr></thead>
            <tbody>{matriculas.map((m) => { const turma = m.turma ?? turmas.find((t) => t.id === String(m.id_turma)); return <tr key={m.id_matricula_turma}><td>{turma ? `${turma.disciplina} — ${turma.codigo}` : `Turma #${m.id_turma}`}</td><td>{turma?.semestre ?? '—'}</td><td>{situacoes[m.situacao]}</td><td>{m.id_matricula_turma}</td></tr>; })}</tbody></table></div>}
        </section>
      </>}
    </>}
  </section>;
}
