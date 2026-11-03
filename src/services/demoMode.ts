import { AxiosError } from 'axios';
import type { AxiosAdapter } from 'axios';

export const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO === 'true';
const SESSION = '@UNEB:demo-session';
const DATA = '@UNEB:demo-data';
export const isDemoSession = () => DEMO_ENABLED && sessionStorage.getItem(SESSION) === 'true';
export function startDemoSession() {
  if (!DEMO_ENABLED) throw new Error('Modo de teste desativado.');
  sessionStorage.setItem(SESSION, 'true');
}
export function endDemoSession() {
  sessionStorage.removeItem(SESSION);
  sessionStorage.removeItem(DATA);
}

type DemoRow = Record<string, unknown>;
type DemoDb = Record<string, DemoRow[]>;
const initialData: DemoDb = {
  cursos: [{ id_curso: 1, codigo: 'SI', nome: 'Sistemas de Informação', grau: 'Bacharelado' }],
  disciplinas: [{ id_disciplina: 1, codigo: 'ALG', nome: 'Algoritmos', ementa: 'Introdução à programação.' }],
  matrizes: [{ id_matriz: 1, id_curso: 1, versao_ano: '2026.1', carga_horaria_total: 3000, ativo: true }],
  turmas: [],
};
const ids: Record<string, string> = { cursos: 'id_curso', disciplinas: 'id_disciplina', matrizes: 'id_matriz' };

// Selecionado somente por uma sessão explícita de teste. Nunca envia dados à API.
export const demoAdapter: AxiosAdapter = async (config) => {
  const fail = (message: string, status: number): never => {
    throw new AxiosError(message, 'DEMO_ERROR', config, undefined, {
      data: { detail: message }, status, statusText: message, headers: {}, config,
    });
  };
  if (!isDemoSession()) return fail('Sessão de teste encerrada.', 403);
  const [resource, id, extra] = (config.url ?? '').split('/').filter(Boolean);
  let db: DemoDb;
  try { db = JSON.parse(sessionStorage.getItem(DATA) ?? 'null') ?? structuredClone(initialData); }
  catch { db = structuredClone(initialData); }
  const rows = db[resource];
  const key = ids[resource];
  if (!rows || extra) return fail('Operação não disponível no modo de teste.', 400);
  let data: unknown;
  const method = config.method ?? 'get';
  if (method === 'get') {
    data = id ? rows.find((r) => String(r[key]) === id) : rows;
    if (!data) return fail('Registro não encontrado.', 404);
  } else {
    if (!key || !['post', 'put'].includes(method)) return fail('Operação não disponível no modo de teste.', 400);
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    if (body.codigo && rows.some((r) => r.codigo === body.codigo && String(r[key]) !== id)) return fail('Já existe um registro com esse código.', 409);
    if (resource === 'matrizes' && method === 'post') {
      if (!db.cursos.some((r) => r.id_curso === body.id_curso)) return fail('Curso não encontrado.', 404);
      if (rows.some((r) => r.id_curso === body.id_curso && r.versao_ano === body.versao_ano)) return fail('Já existe essa versão de matriz para o curso.', 409);
    }
    const row = method === 'post' ? { ...body, [key]: Math.max(0, ...rows.map((r) => Number(r[key]))) + 1 } : rows.find((r) => String(r[key]) === id);
    if (!row) return fail('Registro não encontrado.', 404);
    if (resource === 'matrizes' && body.ativo) rows.forEach((r) => { if (r.id_curso === row.id_curso) r.ativo = false; });
    Object.assign(row, body);
    if (method === 'post') rows.push(row);
    sessionStorage.setItem(DATA, JSON.stringify(db));
    data = row;
  }
  return { data: structuredClone(data), status: method === 'post' ? 201 : 200, statusText: 'OK', headers: {}, config };
};
