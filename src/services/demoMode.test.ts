import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function setup(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv('VITE_ENABLE_DEMO', String(enabled));
  const demo = await import('./demoMode');
  const { api } = await import('./api');
  const network = vi.fn().mockRejectedValue(new Error('API real indisponível'));
  api.defaults.adapter = network;
  return { demo, api, network };
}

describe('modo temporário de demonstração', () => {
  it('não chama a rede ao listar, criar e editar dados fictícios', async () => {
    const { demo, api, network } = await setup(true);
    demo.startDemoSession();
    expect((await api.get('/cursos')).data).toHaveLength(1);
    const created = (await api.post('/cursos', { codigo: 'BIO', nome: 'Biologia', grau: 'Licenciatura' })).data;
    await api.put(`/cursos/${created.id_curso}`, { nome: 'Ciências Biológicas' });
    expect((await api.get(`/cursos/${created.id_curso}`)).data.nome).toBe('Ciências Biológicas');
    expect(network).not.toHaveBeenCalled();
  });
  it('encerra a demonstração e apaga seus registros ao sair', async () => {
    const { demo, api } = await setup(true);
    demo.startDemoSession();
    await api.post('/disciplinas', { codigo: 'MAT', nome: 'Matemática', ementa: null });
    demo.endDemoSession();
    expect(demo.isDemoSession()).toBe(false);
    demo.startDemoSession();
    expect((await api.get('/disciplinas')).data).toHaveLength(1);
  });
  it('não permite reativar uma sessão antiga quando a configuração está desligada', async () => {
    sessionStorage.setItem('@UNEB:demo-session', 'true');
    const { demo, api, network } = await setup(false);
    expect(demo.isDemoSession()).toBe(false);
    expect(() => demo.startDemoSession()).toThrow('Modo de teste desativado.');
    await expect(api.get('/cursos')).rejects.toThrow('API real indisponível');
    expect(network).toHaveBeenCalledOnce();
  });
  it('não transforma falhas do login real em acesso de demonstração', async () => {
    const { demo, api, network } = await setup(true);
    await expect(api.post('/auth/login', 'username=teste&password=senha')).rejects.toThrow();
    expect(demo.isDemoSession()).toBe(false);
    expect(network).toHaveBeenCalledOnce();
  });
  it('bloqueia endpoints não simulados sem enviar à API', async () => {
    const { demo, api, network } = await setup(true);
    demo.startDemoSession();
    await expect(api.get('/usuarios')).rejects.toMatchObject({ response: { status: 400 } });
    expect(network).not.toHaveBeenCalled();
  });
});
