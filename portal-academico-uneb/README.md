# Sistema Acadêmico — UNEB Campus II

Protótipo React de autenticação e layout principal para um sistema acadêmico da UNEB Campus II, em Alagoinhas.

## Requisitos atendidos

### Layout padrão responsivo

- header superior com identificação do usuário e notificações;
- sidebar de navegação com estado ativo e botão de saída;
- rodapé institucional;
- menu lateral convertido em drawer no celular;
- navegação por teclado, foco visível, link para pular ao conteúdo, rótulos ARIA e suporte a redução de movimento.

### Tela de login

- formulário de credenciais;
- segunda etapa visual para código MFA de seis dígitos;
- validação com React Hook Form, Zod e `zodResolver`;
- mensagens de erro por campo e erros de autenticação;
- botões desabilitados e indicadores de loading durante as requisições simuladas;
- opção para mostrar ou ocultar a senha.

### Conexão da interface

- `login()` e `verifyMfa()` implementados no `AuthContext`;
- rota protegida por `ProtectedRoute`;
- redirecionamento automático para a rota principal após a autenticação;
- sessão mantida com `sessionStorage` ou `localStorage` quando “lembrar acesso” é marcado;
- `logout()` remove a sessão e retorna o usuário ao login.

## Dados de demonstração

| Campo | Valor |
|---|---|
| E-mail | `aluno@uneb.br` |
| Senha | `123456` |
| Código MFA | `123456` |

## Executar o projeto

É necessário ter o Node.js instalado.

```bash
npm install
npm run dev
```

Abra no navegador o endereço informado pelo Vite.

## Verificações

```bash
npm run lint
npm test
npm run build
```

## Estrutura principal

```text
src/
├── components/
│   ├── layout/       # Header, Sidebar, Footer e proteção de rota
│   └── ui/           # Ícones e indicador de loading
├── contexts/         # AuthContext, login, MFA e logout
├── pages/            # Login, dashboard e páginas internas
├── schemas/          # Schemas Zod
├── styles/           # Layout responsivo e acessibilidade
├── App.jsx           # Rotas da aplicação
└── main.jsx          # Providers e inicialização
```

## Observação sobre a autenticação

O fluxo atual é uma demonstração front-end. A função `login()` simula uma requisição e usa credenciais fixas para permitir a avaliação da interface. Em produção, substitua essa parte por chamadas HTTPS à API; senha e código MFA devem ser validados exclusivamente no servidor.

> Projeto educacional sem vínculo com o portal oficial da UNEB.
