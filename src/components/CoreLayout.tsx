import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface NavigationItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const studentNavigation: NavigationItem[] = [
  { to: '/aluno/dashboard', label: 'Início', icon: 'home', end: true },
  { to: '/aluno/dashboard', label: 'Notas e frequência', icon: 'chart' },
  { to: '/aluno/dashboard', label: 'Horários', icon: 'calendar' },
  { to: '/aluno/dashboard', label: 'Documentos', icon: 'file' },
];

const staffNavigation: NavigationItem[] = [
  { to: '/secretaria/gestao', label: 'Visão geral', icon: 'home', end: true },
  { to: '/secretaria/gestao', label: 'Alunos', icon: 'users' },
  { to: '/secretaria/gestao', label: 'Turmas e disciplinas', icon: 'book' },
  { to: '/secretaria/gestao', label: 'Configurações', icon: 'settings' },
];

const roleLabels = {
  ALUNO: 'Estudante',
  PROFESSOR: 'Professor',
  SECRETARIA: 'Secretaria',
  ADMIN: 'Administrador',
};

export function CoreLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigation = user?.role === 'ALUNO' ? studentNavigation : staffNavigation;

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isSidebarOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo principal</a>

      <aside
        className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`}
        id="app-sidebar"
        aria-label="Menu principal"
      >
        <div className="sidebar__top">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">U</span>
            <span><strong>UNEB</strong><small>Campus II · Alagoinhas</small></span>
          </div>
          <button
            className="sidebar__close"
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Navegação acadêmica">
          <span className="sidebar__label">Menu acadêmico</span>
          {navigation.map((item, index) => (
            <NavLink
              key={`${item.label}-${index}`}
              to={item.to}
              end={item.end}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive && index === 0 ? 'sidebar-link--active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar-profile">
            <span className="sidebar-profile__avatar" aria-hidden="true">{user?.nome.charAt(0)}</span>
            <div><strong>{user?.nome}</strong><small>{user?.curso}</small></div>
          </div>
          <button className="logout-button" type="button" onClick={logout}>
            <Icon name="logout" /><span>Sair da conta</span>
          </button>
        </div>
      </aside>

      <button
        className={`sidebar-backdrop ${isSidebarOpen ? 'sidebar-backdrop--visible' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
        tabIndex={isSidebarOpen ? 0 : -1}
        aria-label="Fechar menu"
      />

      <div className="app-shell__body">
        <header className="app-header">
          <div className="app-header__start">
            <button
              className="header-menu-button"
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-controls="app-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label="Abrir menu de navegação"
            >
              <Icon name="menu" />
            </button>
            <div><span className="app-header__eyebrow">Sistema acadêmico</span><strong>Visão geral</strong></div>
          </div>

          <div className="app-header__actions">
            <button className="notification-button" type="button" aria-label="Notificações, uma não lida">
              <Icon name="bell" /><span aria-hidden="true" />
            </button>
            <div className="user-summary">
              <span className="user-summary__avatar" aria-hidden="true">{user?.nome.charAt(0)}</span>
              <span className="user-summary__text">
                <strong>{user?.nome}</strong><small>{user ? roleLabels[user.role] : ''}</small>
              </span>
            </div>
          </div>
        </header>

        <main className="app-content" id="main-content" tabIndex={-1}><Outlet /></main>

        <footer className="app-footer">
          <p>© 2026 UNEB · Campus II — Alagoinhas</p>
          <p>Protótipo acadêmico sem vínculo com o portal oficial.</p>
        </footer>
      </div>
    </div>
  );
}
