import { Icon } from "../ui/Icon";
import { useAuth } from "../../contexts/auth-context";

export function Header({ onOpenMenu }) {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__start">
        <button className="header-menu-button" type="button" onClick={onOpenMenu} aria-controls="app-sidebar" aria-label="Abrir menu de navegação"><Icon name="menu" /></button>
        <div><span className="app-header__eyebrow">Sistema acadêmico</span><strong>Visão geral</strong></div>
      </div>

      <div className="app-header__actions">
        <button className="notification-button" type="button" aria-label="Notificações, uma não lida"><Icon name="bell" /><span aria-hidden="true"></span></button>
        <div className="user-summary"><span className="user-summary__avatar" aria-hidden="true">{user?.name?.charAt(0)}</span><span className="user-summary__text"><strong>{user?.name}</strong><small>{user?.role}</small></span></div>
      </div>
    </header>
  );
}
