import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { CalendarioAcademico } from '../components/CalendarioAcademico';
import { MiniCalendarioAulas } from '../components/MiniCalendarioAulas';

const services = [
  { title: 'Notas e frequência', description: 'Consulte avaliações, médias e presença.', to: '/aluno/consulta', icon: 'chart' as const },
  { title: 'Comprovante de matrícula', description: 'Emita ou salve em PDF seu comprovante oficial.', to: '/aluno/comprovante', icon: 'file' as const },
  { title: 'Documentos e atestados', description: 'Veja como solicitar atestados e requerimentos.', to: '/aluno/documentos', icon: 'file' as const },
];

export function DashboardAluno() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // GET /auth/me ainda não devolve nome nem curso — usamos o e-mail como
  // retrato provisório (ver observações da revisão do PR feature/backend-setup).
  const firstName = user?.email.split('@')[0] ?? '';

  return (
    <div className="dashboard">
      <section className="welcome-banner">
        <div>
          <span className="section-label">Período 2026.2</span>
          <h1>Olá, {firstName}!</h1>
          <p>Acompanhe abaixo um resumo da sua vida acadêmica.</p>
        </div>
      </section>

      <section aria-labelledby="summary-title">
        <div className="section-heading">
          <div><span className="section-label">Acesso rápido</span><h2 id="summary-title">Resumo acadêmico</h2></div>
          <Link className="secondary-button" to="/aluno/matriculas">Matrícula online</Link>
        </div>
        <div className="summary-grid">
          {services.map((service) => (
            <article className="summary-card" key={service.title}>
              <span className="summary-card__icon"><Icon name={service.icon} /></span>
              <h3>{service.title}</h3><p>{service.description}</p>
              <button
                type="button"
                onClick={() => navigate(service.to)}
              >
                Ver detalhes <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <CalendarioAcademico />

      <MiniCalendarioAulas />

      <section className="dashboard-grid" aria-label="Informações do semestre">
        <article className="dashboard-card">
          <div className="dashboard-card__heading">
            <div><span className="section-label">Progresso</span><h2>Conclusão do curso</h2></div><strong>72%</strong>
          </div>
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={72} aria-label="Conclusão do curso"><span /></div>
          <p>Você está avançando muito bem. Continue assim!</p>
        </article>
        <article className="dashboard-card">
          <span className="section-label">Próximo compromisso</span><h2>Calendário acadêmico</h2>
          <div className="calendar-event">
            <time dateTime="2026-09-22"><strong>22</strong><span>SET</span></time>
            <div><strong>Ajuste de matrícula</strong><p>Último dia para solicitação.</p></div>
          </div>
        </article>
      </section>
    </div>
  );
}
