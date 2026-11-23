import { api } from './api';

export interface Aluno {
  id_aluno: number;
  matricula: string;
  nome_completo: string;
  cpf?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  status?: string;
}

export interface ListarAlunosParams {
  busca?: string;
  limite?: number;
  offset?: number;
}

export const alunoService = {
  async listar(params: ListarAlunosParams = {}): Promise<Aluno[]> {
    const { data } = await api.get<Aluno[]>('/relatorios/alunos', { params });
    return data;
  },
  async obterPorId(id: number): Promise<Aluno> {
    const { data } = await api.get<Aluno>(`/alunos/${id}`);
    return data;
  },
  async atualizar(id: number, dados: Partial<Aluno>): Promise<Aluno> {
    const { data } = await api.put<Aluno>(`/alunos/${id}`, dados);
    return data;
  },
  async alternarStatus(id: number, status: 'ativo' | 'inativo' | 'bloqueado'): Promise<{ id_aluno: number; status: string }> {
    const { data } = await api.patch<{ id_aluno: number; status: string }>(`/alunos/${id}/status`, { status });
    return data;
  },
};
