import { Link } from 'react-router-dom';

export function DocumentosAluno() {
  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section className="dashboard-card">
        <h1>Documentos</h1>
        <h2>Comprovante de Matrícula</h2>
        <p>Emita, visualize e imprima seu comprovante oficial de matrícula para o semestre letivo atual ou períodos anteriores.</p>
        <Link to="/aluno/comprovante" className="primary-button" style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}>
          Emitir Comprovante de Matrícula (PDF)
        </Link>
      </section>

      <section className="dashboard-card">
        <h2>Atestados e Declarações</h2>
        <p>Para solicitar atestados de matrícula com firma, histórico escolar oficial ou trancamento, entre em contato com a Secretaria Acadêmica da UNEB Campus II.</p>
        <p>Para conferir suas disciplinas, notas parciais e frequência detalhada, acesse a consulta acadêmica.</p>
        <Link to="/aluno/consulta" className="secondary-button" style={{ textDecoration: 'none' }}>
          Abrir consulta acadêmica
        </Link>
      </section>
    </div>
  );
}
