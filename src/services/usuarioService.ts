import { api } from './api';

export interface CadastrarAlunoData {
  email: string;
  senha: string;
  matricula: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  telefone?: string;
}

export interface CadastrarProfessorData {
  email: string;
  senha: string;
  matricula_funcional: string;
  nome_completo: string;
  cpf: string;
  titulacao?: string;
}

export const usuarioService = {
  async cadastrarAluno(dados: CadastrarAlunoData) {
    const { data } = await api.post('/usuarios/alunos', dados);
    return data;
  },
  async cadastrarProfessor(dados: CadastrarProfessorData) {
    const { data } = await api.post('/usuarios/professores', dados);
    return data;
  },
};
