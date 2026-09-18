import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSidebarOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo principal</a>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <button className={`sidebar-backdrop ${isSidebarOpen ? "sidebar-backdrop--visible" : ""}`} type="button" onClick={() => setIsSidebarOpen(false)} tabIndex={isSidebarOpen ? 0 : -1} aria-label="Fechar menu"></button>
      <div className="app-shell__body">
        <Header onOpenMenu={() => setIsSidebarOpen(true)} />
        <main className="app-content" id="main-content" tabIndex="-1"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}
