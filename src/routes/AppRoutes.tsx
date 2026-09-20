import { Navigate, Route, Routes } from 'react-router-dom';
import { CoreLayout } from '../components/CoreLayout';
import { DashboardAluno } from '../pages/DashboardAluno';
import { GestaoSecretaria } from '../pages/GestaoSecretaria';
import { Login } from '../pages/Login';
import { MFA } from '../pages/MFA';
import { Unauthorized } from '../pages/Unauthorized';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/mfa-verification" element={<MFA />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ALUNO']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/aluno/dashboard" element={<DashboardAluno />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['SECRETARIA', 'ADMIN']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/secretaria/gestao" element={<GestaoSecretaria />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
