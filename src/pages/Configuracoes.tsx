import { useAuth } from '../hooks/useAuth';

export function Configuracoes() {
  const { user, logout } = useAuth();
  return (
    <section className="dashboard-card">
      <h1>Configurações</h1>
      <h2>Minha conta</h2>
      <dl>
        <dt>E-mail de acesso</dt><dd>{user?.email}</dd>
        <dt>Perfis de acesso</dt><dd>{user?.perfis.join(', ')}</dd>
      </dl>
      <button className="secondary-button" type="button" onClick={logout}>Encerrar sessão</button>
    </section>
  );
}
