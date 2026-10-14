## Integração frontend — autenticação e currículo

O frontend usa o contrato encontrado em `origin/sprint-2`, nos arquivos
`backend/app/schemas/curriculo.py`, `backend/app/api/routes/curriculo.py` e
`backend/app/api/routes/auth.py`. Nenhum arquivo de backend foi modificado.

### Dev Backend B — autenticação

- `POST /auth/login`: corpo `application/x-www-form-urlencoded` com `username`
  (e-mail) e `password`; resposta `{access_token, token_type}`.
- `GET /auth/me`: resposta `{id_usuario, email, status, perfis}`.
- Perfis retornados são normalizados para minúsculas no frontend.
- A sessão só é concedida depois do login e da consulta ao perfil. Erros de rede,
  HTTP 404/500 ou credenciais inválidas nunca geram um usuário simulado.
- O token é enviado como Bearer; o perfil é revalidado em `/auth/me` ao recarregar.
- “Manter meu acesso” usa localStorage; sem essa opção, sessionStorage.
- Sessões mockadas antigas são descartadas. HTTP 401 em recurso protegido encerra
  a sessão; HTTP 403 mostra falta de permissão sem deslogar.

### Dev Backend A — gestão curricular

| Tela | Endpoints utilizados | Campos enviados |
| --- | --- | --- |
| Cursos | GET/POST `/cursos`, GET/PUT `/cursos/{id}` | `codigo`, `nome`, `grau` |
| Disciplinas | GET/POST `/disciplinas`, GET/PUT `/disciplinas/{id}` | `codigo`, `nome`, `ementa` (nullable) |
| Matrizes | GET/POST `/matrizes`, GET/PUT `/matrizes/{id}` | Criação: `id_curso`, `versao_ano`, `carga_horaria_total`, `ativo`; edição: somente `carga_horaria_total`, `ativo` |

Listagens retornam arrays. IDs seguem o contrato: `id_curso`, `id_disciplina`,
`id_matriz`. Os formulários não gravam dados localmente nem simulam sucesso.
As telas oferecem busca, estados vazio/carregando, tentativa novamente, tratamento
HTTP 403/404/409/422 e confirmação de salvamento. Matrizes podem ser filtradas por
curso. Depois de salvar, a listagem é recarregada para refletir a ativação de versões.

Rotas: `/curriculo/cursos`, `/curriculo/disciplinas`, `/curriculo/matrizes`,
cada uma com `/novo` e `/:id/editar`. Acesso frontend: secretaria, coordenação e
admin. Curso e versão da matriz ficam bloqueados na edição porque o contrato de
atualização não aceita esses campos.

**Pendência de integração:** a branch `sprint-2` autoriza escrita curricular apenas
para `SECRETARIA` e `ADMIN`. Para coordenação salvar, o Dev Backend A precisa incluir
seu perfil na permissão de escrita e confirmar a capitalização dos perfis no seed.
Enquanto isso, o frontend exibe a resposta 403, mantendo o formulário preenchido.
Não houve alteração dessa regra no backend.

Exclusão e associação de disciplinas a matrizes não fazem parte desta entrega de
listar/criar/editar. O módulo de turmas existente mantém seu comportamento anterior.

### Verificação desta entrega

```bash
npm install
npm run build
npx vitest run src/pages/Login.test.tsx src/pages/curriculo/CurriculoPage.test.tsx --config vite.config.ts
```

Testes de frontend usam a camada HTTP simulada; integração ponta a ponta com um
servidor real depende de iniciar o backend, configurar CORS e `VITE_API_URL`.
Os arquivos `.jsx` são legados; a entrada ativa é `src/main.tsx`.

> Projeto educacional sem vínculo com o portal oficial da UNEB.
