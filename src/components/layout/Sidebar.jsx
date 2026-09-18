import { NavLink } from "react-router";
import { Icon } from "../ui/Icon";
import { useAuth } from "../../contexts/auth-context";

const navigation = [
  { to: "/", label: "Início", icon: "home", end: true },
  { to: "/notas", label: "Notas e frequência", icon: "chart" },
  { to: "/horarios", label: "Horários", icon: "calendar" },
  { to: "/documentos", label: "Documentos", icon: "file" },
];

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`} id="app-sidebar" aria-label="Menu principal">
      <div className="sidebar__top">
        <div className="brand"><span className="brand__mark" aria-hidden="true">U</span><span><strong>UNEB</strong><small>Campus II · Alagoinhas</small></span></div>
        <button className="sidebar__close" type="button" onClick={onClose} aria-label="Fechar menu"><Icon name="close" /></button>
      </div>

      <nav className="sidebar__nav" aria-label="Navegação acadêmica">
        <span className="sidebar__label">Menu acadêmico</span>
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}>
            <Icon name={item.icon} /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar-profile"><span className="sidebar-profile__avatar" aria-hidden="true">{user?.name?.charAt(0)}</span><div><strong>{user?.name}</strong><small>{user?.course}</small></div></div>
        <button className="logout-button" type="button" onClick={logout}><Icon name="logout" /><span>Sair da conta</span></button>
      </div>
    </aside>
  );
}
