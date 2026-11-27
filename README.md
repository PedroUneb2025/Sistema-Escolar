# <img src="public/logo-hive64-horizontal.svg" alt="Hive64" height="48" valign="middle" /> Hive64 — Gestão Acadêmica Estruturada

O **Hive64** é uma plataforma moderna e estruturada de gestão acadêmica (Web II), desenvolvida em React e TypeScript, que reúne autenticação segura, controle de acesso por perfil, matrículas online, consulta acadêmica e quadro dinâmico de horários.

## O que foi implementado

### Setup e arquitetura

- React com TypeScript e Vite;
- organização por componentes, contexto, hooks, páginas, rotas, serviços, schemas e tipos;
- ESLint e EditorConfig para padronização do código;
- configuração compatível com hospedagem no GitHub Pages usando `HashRouter` e `base: './'`.

### Autenticação global

- `AuthContext` armazena usuário, token JWT e estado de carregamento;
- login integrado com a API real (`POST /auth/login`, contrato descrito abaixo);
- restauração da sessão pelo `sessionStorage` ou `localStorage`;
- funções `login()` e `logout()`;
- cliente Axios em `src/services/api.ts`;
- interceptor que envia `Authorization: Bearer <token>`;
- tratamento de respostas `401` e `403`, limpando a sessão e retornando ao login.
- tela de login com aviso de espera quando a API responde `429` (muitas tentativas): lê o `Retry-After`, mostra o tempo restante e desabilita o botão até acabar.

> A etapa de MFA (`/mfa-verification`) foi removida por enquanto: o backend
> atual (PR `feature/backend-setup`) não implementa verificação em duas
> etapas — `POST /auth/login` já devolve o token final. O componente antigo
> ainda pode ser recuperado do histórico do git se o backend vier a suportar
> MFA numa sprint futura.

### Roteamento e autorização

- rotas centralizadas em `src/routes/AppRoutes.tsx`;
- `ProtectedRoute` verifica login e papéis permitidos;
- perfis disponíveis (seed do backend): `admin`, `secretaria`, `coordenacao`,
  `professor`, `aluno` e `financeiro` — um usuário pode ter mais de um perfil
  (`user.perfis: string[]`);
- painel do aluno protegido para `ALUNO`;
- gestão da secretaria protegida para `SECRETARIA` e `ADMIN`;
- página de acesso não autorizado.

### Interface

- tela de login responsiva;
- validação com React Hook Form, Zod e `zodResolver`;
- estados de carregamento;
- layout principal com cabeçalho, menu lateral e rodapé;
- menu móvel e recursos básicos de acessibilidade.

## Como executar

É necessário instalar o Node.js. Dentro da pasta do projeto, execute:

```bash
npm install
npm run dev
```

Depois, abra o endereço informado no terminal, normalmente `http://localhost:5173`.

## Comandos de verificação

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Configuração da API

Copie `.env.example` para `.env` e altere o endereço quando existir uma API real:

```env
VITE_API_URL=http://localhost:8000
```

## Estrutura principal

```text
src/
├── components/       # Layout, ícones e feedback de carregamento
├── context/          # AuthContext e estado global
├── hooks/            # Hook useAuth
├── pages/            # Login, MFA, painéis e acesso negado
├── routes/           # Rotas, proteção e destino por papel
├── schemas/          # Validações Zod
├── services/         # Cliente HTTP e interceptadores
├── test/             # Configuração dos testes
├── types/            # Tipos de autenticação
├── App.tsx
└── main.tsx
```

## Publicar no GitHub Pages

O frontend usa a API FastAPI para autenticar usuários. A publicação pode ser preparada antes de o servidor ficar disponível.

1. Em **Settings → Pages**, selecione **GitHub Actions**.
2. Quando a API estiver disponível, em **Settings → Secrets and variables → Actions → Variables**, configure `VITE_API_URL` com o endereço HTTPS público da API, sem `/api`. Configure a API para permitir a origem `https://pedrouneb2025.github.io` no CORS.
3. Após integrar as alterações à `main`, abra **Actions → Publicar no GitHub Pages → Run workflow**. Execute novamente sempre que mudar a URL.

O workflow verifica o frontend em cada envio à `main`. A publicação falha se a variável estiver vazia. A publicação usa autenticação real e mantém o modo de demonstração desativado.
