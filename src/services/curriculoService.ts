import { api } from './api';
import type { Curso, CursoInput, Disciplina, DisciplinaInput, Matriz, MatrizInput, MatrizUpdate } from '../types/curriculo';

function resource<T, Create, Update = Create>(path: string) {
  return {
    async listar(): Promise<T[]> { return (await api.get<T[]>(path)).data; },
    async obter(id: string): Promise<T> { return (await api.get<T>(`${path}/${encodeURIComponent(id)}`)).data; },
    async criar(data: Create): Promise<T> { return (await api.post<T>(path, data)).data; },
    async atualizar(id: string, data: Update): Promise<T> { return (await api.put<T>(`${path}/${encodeURIComponent(id)}`, data)).data; },
  };
}

export const cursoService = resource<Curso, CursoInput>('/cursos');
export const disciplinaService = resource<Disciplina, DisciplinaInput>('/disciplinas');
export const matrizService = resource<Matriz, MatrizInput, MatrizUpdate>('/matrizes');
