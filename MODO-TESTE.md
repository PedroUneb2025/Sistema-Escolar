# Modo de teste temporário

Na tela de login, clique em **Entrar em modo de teste**. Não precisa de e-mail,
senha ou backend. O acesso de demonstração usa o perfil secretaria.

Cursos, disciplinas e matrizes usam dados fictícios somente na aba atual.
É possível listar, criar e editar. Recarregar mantém os dados da aba;
**Sair da conta** apaga os registros de teste. Não utilize dados reais.
Nenhuma chamada feita durante a demonstração é enviada para o backend.
O botão **Continuar** mantém o fluxo de autenticação real e nunca faz fallback.

## Ativar no GitHub Pages

Esta entrega já configura `VITE_ENABLE_DEMO: 'true'` na etapa
**Gerar versão de produção** de `.github/workflows/deploy.yml`.
Após incorporar os arquivos e concluir o deploy, o botão aparece no site.
Todos que acessarem o site poderão usar a demonstração.

## Remover o acesso de teste depois

1. Abra `.github/workflows/deploy.yml`.
2. Troque `VITE_ENABLE_DEMO: 'true'` por `VITE_ENABLE_DEMO: 'false'`.
3. Salve o commit e aguarde a nova publicação em Actions.
4. Atualize a página do site. O botão desaparece e sessões de demonstração
   antigas deixam de conceder acesso na versão nova.

Não é preciso remover arquivos para desligar o modo de teste.
Uma página antiga já aberta pode continuar mostrando a demonstração até ser
recarregada, mas nunca terá acesso ao backend por essa sessão.

Para testes locais, copie `.env.example` para `.env`, configure
`VITE_ENABLE_DEMO=true` e execute `npm run dev`.
O padrão local é desativado.
