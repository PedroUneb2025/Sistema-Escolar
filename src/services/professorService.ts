import { api } from './api';

export interface Professor {
  id_professor: number;
  nome_completo: string;
  matricula_funcional: string;
  cpf?: string;
  titulacao?: string;
  email?: string;
  status?: string;
}

export interface ListarProfessoresParams {
  busca?: string;
  limite?: number;
  offset?: number;
}

export const professorService = {
  async listar(params: ListarProfessoresParams = {}): Promise<Professor[]> {
    const { data } = await api.get<Professor[]>('/professores', { params });
    return data;
  },
  async obterPorId(id: number): Promise<Professor> {
    const { data } = await api.get<Professor>(`/professores/${id}`);
    return data;
  },
  async atualizar(id: number, dados: Partial<Professor>): Promise<Professor> {
    const { data } = await api.put<Professor>(`/professores/${id}`, dados);
    return data;
  },
  async alternarStatus(id: number, status: 'ativo' | 'inativo' | 'bloqueado'): Promise<{ id_professor: number; status: string }> {
    const { data } = await api.patch<{ id_professor: number; status: string }>(`/professores/${id}/status`, { status });
    return data;
  },
};
