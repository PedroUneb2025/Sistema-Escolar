import { Navigate, Route, Routes } from 'react-router-dom';
import { CoreLayout } from '../components/CoreLayout';
import { DashboardAluno } from '../pages/DashboardAluno';
import { GestaoSecretaria } from '../pages/GestaoSecretaria';
import { Login } from '../pages/Login';
import { Unauthorized } from '../pages/Unauthorized';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* /mfa-verification removida: o backend (PR feature/backend-setup) não
          implementa MFA hoje — o POST /auth/login já devolve o token final.
          Reintroduzir quando/se o backend adicionar essa etapa. */}

      <Route element={<ProtectedRoute />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['aluno']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/aluno/dashboard" element={<DashboardAluno />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin', 'coordenacao']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/secretaria/gestao" element={<GestaoSecretaria />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
