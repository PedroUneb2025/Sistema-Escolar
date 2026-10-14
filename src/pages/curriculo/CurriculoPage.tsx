import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cursoService, disciplinaService, matrizService } from '../../services/curriculoService';
import { getApiError } from '../../services/apiError';
import type { Curso, Disciplina, Matriz } from '../../types/curriculo';
import '../../styles/curriculo.css';

export type CurriculoKind = 'cursos' | 'disciplinas' | 'matrizes';
const labels = {
  cursos: { title: 'Cursos', singular: 'curso', create: 'Novo curso' },
  disciplinas: { title: 'Disciplinas', singular: 'disciplina', create: 'Nova disciplina' },
  matrizes: { title: 'Matrizes curriculares', singular: 'matriz curricular', create: 'Nova matriz curricular' },
};
const services = { cursos: cursoService, disciplinas: disciplinaService, matrizes: matrizService };
type RecordData = Curso | Disciplina | Matriz;
function recordId(row: RecordData) {
  return 'id_matriz' in row ? row.id_matriz : 'id_curso' in row ? row.id_curso : row.id_disciplina;
}

export function CurriculoPage({ kind, mode = 'list' }: { kind: CurriculoKind; mode?: 'list' | 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState<RecordData[]>([]);
  const [courses, setCourses] = useState<Curso[]>([]);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const base = `/curriculo/${kind}`;
  const label = labels[kind];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSaveError('');
    setRecord(null);
    setQuery('');
    setCourseFilter('');
    async function load() {
      try {
        const [data, availableCourses] = await Promise.all([
          mode === 'list' ? services[kind].listar() : mode === 'edit' ? services[kind].obter(id!) : Promise.resolve(null),
          kind === 'matrizes' ? cursoService.listar() : Promise.resolve([]),
        ]);
        if (!active) return;
        if (Array.isArray(data)) setRows(data); else setRecord(data);
        setCourses(availableCourses);
      } catch (err) {
        if (active) setError(getApiError(err, 'Não foi possível carregar os dados.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [kind, mode, id, attempt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    setSaveError('');
    setSaving(true);
    try {
      if (kind === 'cursos') {
        const data = { codigo: text('codigo'), nome: text('nome'), grau: text('grau') };
        if (!data.codigo || !data.nome || !data.grau) throw new Error('Preencha os campos obrigatórios.');
        if (mode === 'edit') await cursoService.atualizar(id!, data); else await cursoService.criar(data);
      } else if (kind === 'disciplinas') {
        const data = { codigo: text('codigo'), nome: text('nome'), ementa: text('ementa') || null };
        if (!data.codigo || !data.nome) throw new Error('Preencha os campos obrigatórios.');
        if (mode === 'edit') await disciplinaService.atualizar(id!, data); else await disciplinaService.criar(data);
      } else {
        const data = { carga_horaria_total: Number(text('carga_horaria_total')), ativo: form.get('ativo') === 'on' };
        if (!Number.isSafeInteger(data.carga_horaria_total) || data.carga_horaria_total <= 0) throw new Error('Informe uma carga horária inteira maior que zero.');
        if (mode === 'edit') await matrizService.atualizar(id!, data);
        else {
          const id_curso = Number(text('id_curso'));
          const versao_ano = text('versao_ano');
          if (!courses.some((course) => course.id_curso === id_curso) || !versao_ano) throw new Error('Selecione o curso e informe a versão/ano.');
          await matrizService.criar({ ...data, id_curso, versao_ano });
        }
      }
      navigate(base, { replace: true, state: { message: 'Dados salvos com sucesso.' } });
    } catch (err) {
      setSaveError(getApiError(err, 'Não foi possível salvar os dados.'));
    } finally { setSaving(false); }
  }

  const courseName = (courseId: number) => courses.find((course) => course.id_curso === courseId)?.nome ?? `Curso #${courseId}`;
  const filtered = rows.filter((row) => {
    const description = 'id_matriz' in row ? `${courseName(row.id_curso)} ${row.versao_ano}` : `${row.codigo} ${row.nome}`;
    return description.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) && (!courseFilter || ('id_matriz' in row && String(row.id_curso) === courseFilter));
  });
  const matrix = record && 'id_matriz' in record ? record : null;
  const named = record && 'codigo' in record ? record : null;

  return <section className="curriculo" aria-labelledby="curriculo-title">
    <header className="curriculo-heading">
      <div><span className="section-label">Gestão curricular</span><h1 id="curriculo-title">{mode === 'list' ? label.title : mode === 'create' ? label.create : `Editar ${label.singular}`}</h1>
        <p>{mode === 'list' ? 'Consulte e organize a estrutura acadêmica.' : 'Preencha os dados abaixo. Os campos com * são obrigatórios.'}</p></div>
      {mode === 'list' && <Link className="secondary-button" to={`${base}/novo`}>{label.create}</Link>}
    </header>
    <nav className="curriculo-tabs" aria-label="Gestão curricular">
      {(Object.keys(labels) as CurriculoKind[]).map((key) => <Link key={key} to={`/curriculo/${key}`} aria-current={key === kind ? 'page' : undefined}>{labels[key].title}</Link>)}
    </nav>
    {loading ? <p role="status">Carregando dados...</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="secondary-button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></div> : mode === 'list' ? <>
      {(location.state as { message?: string } | null)?.message && <p role="status" className="curriculo-success">{(location.state as { message: string }).message}</p>}
      <div className="curriculo-filters"><label>Buscar {label.title.toLowerCase()}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {kind === 'matrizes' && <label>Filtrar por curso<select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="">Todos os cursos</option>{courses.map((course) => <option key={course.id_curso} value={course.id_curso}>{course.nome}</option>)}</select></label>}</div>
      {filtered.length === 0 ? <p>{rows.length === 0 ? 'Nenhum registro cadastrado.' : 'Nenhum resultado para os filtros selecionados.'}</p> : <div className="curriculo-table"><table>
        <caption className="sr-only">{label.title}</caption>
        <thead><tr>{kind === 'matrizes' ? <><th>Curso</th><th>Versão/ano</th><th>Carga horária</th><th>Situação</th></> : <><th>Código</th><th>Nome</th><th>{kind === 'cursos' ? 'Grau' : 'Ementa'}</th></>}<th>Ações</th></tr></thead>
        <tbody>{filtered.map((row) => <tr key={recordId(row)}>{'id_matriz' in row ? <><td>{courseName(row.id_curso)}</td><td>{row.versao_ano}</td><td>{row.carga_horaria_total} h</td><td>{row.ativo ? 'Ativa' : 'Inativa'}</td></> : <><td>{row.codigo}</td><td>{row.nome}</td><td>{'grau' in row ? row.grau : row.ementa || '—'}</td></>}<td><Link to={`${base}/${recordId(row)}/editar`} aria-label={`Editar ${'id_matriz' in row ? `${courseName(row.id_curso)} ${row.versao_ano}` : row.nome}`}>Editar</Link></td></tr>)}</tbody>
      </table></div>}
    </> : <form onSubmit={save} className="curriculo-form" key={`${kind}-${mode}-${id}`}>
      {saveError && <p role="alert" className="form-alert">{saveError}</p>}
      <fieldset disabled={saving}><legend>Dados {kind === 'cursos' ? 'do curso' : kind === 'disciplinas' ? 'da disciplina' : 'da matriz'}</legend>
        {kind !== 'matrizes' ? <>
          <label>Código *<input name="codigo" required maxLength={20} defaultValue={named?.codigo ?? ''} /></label>
          <label>Nome *<input name="nome" required maxLength={120} defaultValue={named?.nome ?? ''} /></label>
          {kind === 'cursos' ? <label>Grau *<input name="grau" required maxLength={50} placeholder="Ex.: Bacharelado" defaultValue={record && 'grau' in record ? record.grau : ''} /></label> : <label>Ementa<textarea name="ementa" rows={5} defaultValue={record && 'ementa' in record ? record.ementa ?? '' : ''} /></label>}
        </> : <>
          <label>Curso *<select name="id_curso" required disabled={mode === 'edit'} defaultValue={matrix?.id_curso ?? ''}><option value="">Selecione um curso</option>{courses.map((course) => <option key={course.id_curso} value={course.id_curso}>{course.codigo} — {course.nome}</option>)}</select></label>
          {courses.length === 0 && <p>Cadastre um <Link to="/curriculo/cursos/novo">curso</Link> antes de criar uma matriz.</p>}
          <label>Versão/ano *<input name="versao_ano" required maxLength={10} disabled={mode === 'edit'} defaultValue={matrix?.versao_ano ?? ''} placeholder="Ex.: 2026.1" /></label>
          {mode === 'edit' && <p>O curso e a versão são definidos na criação e não podem ser alterados.</p>}
          <label>Carga horária total (horas) *<input name="carga_horaria_total" type="number" min={1} step={1} required defaultValue={matrix?.carga_horaria_total ?? ''} /></label>
          <label className="curriculo-checkbox"><input name="ativo" type="checkbox" defaultChecked={matrix?.ativo ?? true} />Matriz ativa</label>
          <p>Ativar esta matriz pode desativar as outras versões do mesmo curso.</p>
        </>}
      </fieldset>
      <div className="curriculo-actions"><button className="primary-button" type="submit" disabled={saving || (kind === 'matrizes' && courses.length === 0)}>{saving ? 'Salvando...' : 'Salvar'}</button><button className="secondary-button" type="button" disabled={saving} onClick={() => navigate(base)}>Cancelar</button></div>
    </form>}
  </section>;
}
