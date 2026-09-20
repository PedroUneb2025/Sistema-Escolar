import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRoute } from '../routes/defaultRoute';

export function Unauthorized() {
  const { logout, user } = useAuth();

  return (
    <main className="feedback-page">
      <section className="feedback-card" aria-labelledby="unauthorized-title">
        <span className="error-code">403</span>
        <h1 id="unauthorized-title">Acesso não autorizado</h1>
        <p>O perfil <strong>{user?.role}</strong> não possui permissão para acessar esta área.</p>
        <div className="feedback-actions">
          {user && <Link className="primary-link" to={getDefaultRoute(user.role)}>Voltar ao meu painel</Link>}
          <Link className="secondary-link" to="/login" onClick={logout}>Trocar usuário</Link>
        </div>
      </section>
    </main>
  );
}
