# Sistema Acadêmico — UNEB Campus II

Projeto React e TypeScript que reúne a interface do sistema acadêmico com a arquitetura base de autenticação, roteamento e controle de acesso por perfil.

## O que foi implementado

### Setup e arquitetura

- React com TypeScript e Vite;
- organização por componentes, contexto, hooks, páginas, rotas, serviços, schemas e tipos;
- ESLint e EditorConfig para padronização do código;
- configuração compatível com hospedagem no GitHub Pages usando `HashRouter` e `base: './'`.

### Autenticação global

- `AuthContext` armazena usuário, token JWT, estado de carregamento e desafio MFA;
- restauração da sessão pelo `sessionStorage` ou `localStorage`;
- funções `login()`, `verifyMFA()`, `cancelMFA()` e `logout()`;
- login de demonstração com MFA e mensagens de erro;
- cliente Axios em `src/services/api.ts`;
- interceptor que envia `Authorization: Bearer <token>`;
- tratamento de respostas `401` e `403`, limpando a sessão e retornando ao login.

### Roteamento e autorização

- rotas centralizadas em `src/routes/AppRoutes.tsx`;
- `ProtectedRoute` verifica login, MFA e papéis permitidos;
- perfis disponíveis: `ALUNO`, `PROFESSOR`, `SECRETARIA` e `ADMIN`;
- painel do aluno protegido para `ALUNO`;
- gestão da secretaria protegida para `SECRETARIA` e `ADMIN`;
- página de acesso não autorizado.

### Interface

- tela de login responsiva;
- validação com React Hook Form, Zod e `zodResolver`;
- campo para código MFA;
- estados de carregamento;
- layout principal com cabeçalho, menu lateral e rodapé;
- menu móvel e recursos básicos de acessibilidade.

## Dados para demonstração

Todos os perfis usam a senha `123456` e o código MFA `123456`.

| Perfil | E-mail |
| --- | --- |
| Aluno | `aluno@uneb.br` |
| Secretaria | `secretaria@uneb.br` |
| Administrador | `admin@uneb.br` |

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
VITE_API_URL=http://localhost:3000/api
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

## Importante

O login, o JWT e o MFA são simulados no navegador para fins acadêmicos. Ainda não existe banco de dados ou servidor. Em produção, senha e código MFA devem ser validados por uma API segura.

> Projeto educacional sem vínculo com o portal oficial da UNEB.
