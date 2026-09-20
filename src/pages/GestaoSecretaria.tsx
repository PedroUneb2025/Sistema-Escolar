import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';

const managementCards = [
  { title: 'Alunos ativos', value: '1.284', description: 'Matrículas no período atual', icon: 'users' as const },
  { title: 'Turmas abertas', value: '48', description: 'Turmas cadastradas em 2026.2', icon: 'book' as const },
  { title: 'Solicitações', value: '16', description: 'Documentos aguardando análise', icon: 'file' as const },
];

export function GestaoSecretaria() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <section className="welcome-banner">
        <div>
          <span className="section-label">Gestão acadêmica</span>
          <h1>Olá, {user?.nome.split(' ')[0]}!</h1>
          <p>Acompanhe os principais dados acadêmicos do Campus II.</p>
        </div>
        <div className="welcome-banner__badge">
          <Icon name="shield" size={28} />
          <span><small>Perfil de acesso</small><strong>{user?.role}</strong></span>
        </div>
      </section>

      <section aria-labelledby="management-title">
        <div className="section-heading">
          <div><span className="section-label">Painel de controle</span><h2 id="management-title">Resumo da secretaria</h2></div>
          <span className="status-chip">Sistema operacional</span>
        </div>
        <div className="summary-grid">
          {managementCards.map((card) => (
            <article className="summary-card" key={card.title}>
              <span className="summary-card__icon"><Icon name={card.icon} /></span>
              <h3>{card.title}</h3><strong className="summary-card__value">{card.value}</strong><p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
