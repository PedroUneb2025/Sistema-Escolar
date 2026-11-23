import { Link } from 'react-router-dom';

export function DocumentosAluno() {
  return (
    <section className="dashboard-card">
      <h1>Documentos</h1>
      <h2>Atestados e comprovantes</h2>
      <p>Para solicitar um documento oficial, entre em contato com a secretaria acadêmica.</p>
      <p>Para conferir suas disciplinas e notas, acesse a consulta acadêmica.</p>
      <Link to="/aluno/consulta" className="secondary-button">Abrir consulta acadêmica</Link>
    </section>
  );
}
