import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';

const services = [
  { title: 'Notas e frequência', description: 'Consulte avaliações, médias e presença.', icon: 'chart' as const },
  { title: 'Próxima aula', description: 'Engenharia de Software · Sala 12', icon: 'clock' as const },
  { title: 'Documentos', description: 'Solicite atestados e comprovantes.', icon: 'file' as const },
];

export function DashboardAluno() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <section className="welcome-banner">
        <div>
          <span className="section-label">Período 2026.2</span>
          <h1>Olá, {user?.nome.split(' ')[0]}!</h1>
          <p>Acompanhe abaixo um resumo da sua vida acadêmica.</p>
        </div>
        <div className="welcome-banner__badge">
          <Icon name="book" size={28} />
          <span><small>Curso</small><strong>{user?.curso}</strong></span>
        </div>
      </section>

      <section aria-labelledby="summary-title">
        <div className="section-heading">
          <div><span className="section-label">Acesso rápido</span><h2 id="summary-title">Resumo acadêmico</h2></div>
          <span className="status-chip">Matrícula ativa</span>
        </div>
        <div className="summary-grid">
          {services.map((service) => (
            <article className="summary-card" key={service.title}>
              <span className="summary-card__icon"><Icon name={service.icon} /></span>
              <h3>{service.title}</h3><p>{service.description}</p>
              <button type="button">Ver detalhes <span aria-hidden="true">→</span></button>
            </article>
          ))}
        </div>
      </section>

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
