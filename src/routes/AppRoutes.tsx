import { Navigate, Route, Routes } from 'react-router-dom';
import { Configuracoes } from '../pages/Configuracoes';
import { DocumentosAluno } from '../pages/DocumentosAluno';
import { CoreLayout } from '../components/CoreLayout';
import { MatriculaOnline } from '../pages/matriculas/MatriculaOnline';
import { DashboardAluno } from '../pages/DashboardAluno';
import { GestaoSecretaria } from '../pages/GestaoSecretaria';
import { Login } from '../pages/Login';
import { Unauthorized } from '../pages/Unauthorized';
import { ConsultaAcademica } from '../pages/ConsultaAcademica';
import { ProtectedRoute } from './ProtectedRoute';
import { CurriculoPage } from '../pages/curriculo/CurriculoPage';
import { getTurmaRoutes } from './turmaRoutes';
import { ProfessoresList } from '../pages/professores/ProfessoresList';
import { AlunosList } from '../pages/alunos/AlunosList';
import { CadastroUsuario } from '../pages/usuarios/CadastroUsuario';

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
          <Route path="/aluno/documentos" element={<DocumentosAluno />} />
          <Route path="/aluno/dashboard" element={<DashboardAluno />} />
          <Route path="/aluno/matriculas" element={<MatriculaOnline />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['aluno', 'admin', 'coordenacao', 'professor']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/aluno/consulta" element={<ConsultaAcademica />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin', 'coordenacao', 'professor']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/secretaria/gestao" element={<GestaoSecretaria />} />
          {getTurmaRoutes()}
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin']} />}>
        <Route element={<CoreLayout />}>
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/professores" element={<ProfessoresList />} />
          <Route path="/professores/novo" element={<CadastroUsuario tipo="professor" />} />
          <Route path="/alunos" element={<AlunosList />} />
          <Route path="/alunos/novo" element={<CadastroUsuario tipo="aluno" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin', 'coordenacao']} />}>
        <Route element={<CoreLayout />}>
          {(['cursos', 'disciplinas', 'matrizes'] as const).map((kind) => (
            <Route key={kind} path={`curriculo/${kind}`}>
              <Route index element={<CurriculoPage kind={kind} />} />
              <Route path="novo" element={<CurriculoPage kind={kind} mode="create" />} />
              <Route path=":id/editar" element={<CurriculoPage kind={kind} mode="edit" />} />
            </Route>
          ))}
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
