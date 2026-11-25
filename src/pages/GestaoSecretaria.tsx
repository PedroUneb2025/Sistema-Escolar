import { useEffect, useState } from 'react';
import { listarPaginas } from '../services/turmaService';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';

function useContagem(url: string | null, status: string) {
  const [valor, setValor] = useState('Carregando…');
  useEffect(() => {
    if (!url) return;
    const controle = new AbortController();
    setValor('Carregando…');
    listarPaginas<{ status: string }>(url, controle.signal)
      .then(registros => {
        if (!controle.signal.aborted) {
          setValor(registros.filter(item => item.status === status).length.toLocaleString('pt-BR'));
        }
      })
      .catch(() => {
        if (!controle.signal.aborted) setValor('Indisponível');
      });
    return () => controle.abort();
  }, [url, status]);
  return valor;
}

export function GestaoSecretaria() {
  const { user } = useAuth();
  const gestor = user?.perfis.some(perfil => perfil === 'secretaria' || perfil === 'admin');
  const alunos = useContagem(gestor ? '/relatorios/alunos' : null, 'ativo');
  const turmas = useContagem('/turmas', 'aberta');
  const managementCards = [
    ...(gestor ? [{ title: 'Alunos ativos', value: alunos, description: 'Cadastros com status ativo', icon: 'users' as const, link: '/alunos', linkText: 'Consultar alunos →' }] : []),
    { title: 'Turmas abertas', value: turmas, description: 'Turmas abertas em todos os semestres', icon: 'book' as const, link: '/turmas', linkText: 'Gerenciar turmas →' },
  ];
  // GET /auth/me ainda não devolve nome — usamos o e-mail como retrato
  // provisório (ver observações da revisão do PR feature/backend-setup).
  const firstName = user?.email.split('@')[0] ?? '';

  return (
    <div className="dashboard">
      <section className="welcome-banner">
        <div>
          <span className="section-label">Gestão acadêmica</span>
          <h1>Olá, {firstName}!</h1>
          <p>Acompanhe os principais dados acadêmicos do Campus II.</p>
        </div>
        <div className="welcome-banner__badge">
          <Icon name="shield" size={28} />
          <span><small>Perfil de acesso</small><strong>{user?.perfis.join(', ')}</strong></span>
        </div>
      </section>

      <section aria-labelledby="management-title">
        <div className="section-heading">
          <div><span className="section-label">Painel de controle</span><h2 id="management-title">Resumo da secretaria</h2></div>
        </div>
        <div className="summary-grid">
          {managementCards.map((card) => (
            <article className="summary-card" key={card.title}>
              <span className="summary-card__icon"><Icon name={card.icon} /></span>
              <h3>{card.title}</h3>
              <strong className="summary-card__value">{card.value}</strong>
              <p>{card.description}</p>
              {card.link && (
                <Link to={card.link} className="action-link" style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--blue-700)', textDecoration: 'none' }}>
                  {card.linkText}
                </Link>
              )}
            </article>
          ))}
        </div>
        {gestor && <div className="page-header__actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Link to="/alunos/novo" className="primary-button">Cadastrar aluno</Link>
          <Link to="/professores/novo" className="primary-button">Cadastrar professor</Link>
        </div>}
      </section>
    </div>
  );
}
