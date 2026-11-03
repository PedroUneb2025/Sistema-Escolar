export interface CursoInput { codigo: string; nome: string; grau: string }
export interface Curso extends CursoInput { id_curso: number }
export interface DisciplinaInput { codigo: string; nome: string; ementa: string | null }
export interface Disciplina extends DisciplinaInput { id_disciplina: number }
export interface MatrizInput { id_curso: number; versao_ano: string; carga_horaria_total: number; ativo: boolean }
export interface Matriz extends MatrizInput { id_matriz: number }
export type MatrizUpdate = Pick<MatrizInput, 'carga_horaria_total' | 'ativo'>;
