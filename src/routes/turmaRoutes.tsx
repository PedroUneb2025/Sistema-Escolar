import { Route } from 'react-router-dom';
import { TurmasList } from '../pages/turmas/TurmasList';
import { TurmaCreate } from '../pages/turmas/TurmaCreate';
import { TurmaEdit } from '../pages/turmas/TurmaEdit';

/**
 * Rotas do CRUD de Turmas para serem inseridas dentro do layout protegido.
 *
 * Rotas disponíveis:
 * - /turmas           -> Listagem de turmas com busca, filtros e exclusão
 * - /turmas/nova      -> Tela de cadastro de nova turma (com validação de conflito de horário)
 * - /turmas/:id/editar -> Tela de edição de turma existente (com validação de conflito de horário)
 */
export function getTurmaRoutes() {
  return (
    <>
      <Route path="/turmas" element={<TurmasList />} />
      <Route path="/turmas/nova" element={<TurmaCreate />} />
      <Route path="/turmas/:id/editar" element={<TurmaEdit />} />
    </>
  );
}

