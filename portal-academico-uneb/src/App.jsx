import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="notas" element={<PlaceholderPage title="Notas e frequência" description="Acompanhe o desempenho acadêmico e a presença nas disciplinas." />} />
          <Route path="horarios" element={<PlaceholderPage title="Horários" description="Consulte sua grade semanal, salas e professores." />} />
          <Route path="documentos" element={<PlaceholderPage title="Documentos" description="Solicite e acompanhe documentos acadêmicos." />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
