# Turmas e matrícula online — integração com Sprint 3

Implementação de frontend sobre `origin/main` ce1c876. Nenhum arquivo do backend foi alterado.

## Aplicar os arquivos

O ZIP contém somente os arquivos novos/alterados de `src/` e este documento. Extraia e copie por cima dos caminhos correspondentes na raiz do projeto atualizado. Preserve os demais arquivos. No GitHub, envie o conteúdo extraído, não o ZIP, e revise o diff do pull request antes do merge.

Título sugerido: `Integra turmas e matrícula online à API da Sprint 3`
Descrição: `Adiciona matrícula do aluno, consulta das próprias matrículas e adapta cadastro/edição de turmas aos IDs e rotas do backend. Preserva o layout existente e não altera o backend.`

## Executar

1. Use o backend da equipe conforme `backend/README.md` e mantenha-o rodando.
2. Na raiz do frontend, crie `.env.local` com `VITE_API_URL=http://localhost:8000` (ou a URL fornecida pela equipe).
3. Execute `npm install` e `npm run dev`. Abra o endereço exibido pelo Vite.
4. Entre com e-mail e senha de um usuário real de perfil ALUNO, vinculado a um cadastro de aluno no banco.
5. Abra **Matrícula online**, selecione uma turma e confirme. A matrícula aparece com seu protocolo e permanece ao atualizar a página.
6. Para cadastrar/editar turmas, use SECRETARIA, COORDENACAO ou ADMIN. Disciplina, professor e sala precisam existir no backend.

Os botões de acesso direto de demonstração existentes no projeto não geram tokens válidos para essas operações. Peça à equipe uma conta de teste cadastrada no banco. GitHub Pages hospeda somente o frontend: a API precisa estar disponível e permitir a origem pelo CORS. Uma URL localhost acessa o computador de quem abriu a página; não publica a API.

## Contrato utilizado

- Login existente: `POST /auth/login`, formulário URL-encoded, e `GET /auth/me`.
- Turmas: `GET /turmas`, `GET /turmas/{id}`, `POST /turmas`, `PUT /turmas/{id}` e `DELETE /turmas/{id}`.
- Escrita de turma: codigo, idDisciplina, idProfessor, idSala, semestre, diaSemana, horarioInicio, horarioFim, vagas e status. Os selects carregam `/disciplinas`, `/professores` e `/salas`.
- Turmas, professores e salas são lidos com paginação limite/offset, incluindo todas as páginas.
- Matrícula: `POST /matriculas` com `{ "id_turma": 123 }`. O backend identifica o aluno pelo token; o frontend não inventa nem envia id_aluno.
- Minhas matrículas: `GET /matriculas/minhas`. Os campos de turma e horário vêm planos, em snake_case; o frontend converte os dias SEG/TER/etc. e horários HH:MM:SS para exibição.
- Todas as operações usam o Bearer token do login existente.

## Comportamento

Busca por turma/disciplina/professor, filtro de semestre, confirmação antes do envio, protocolo retornado pela API e consulta das matrículas registradas. A tela bloqueia turma lotada, fechada/cancelada, já matriculada ou com conflito de horário conhecido. Pré-requisitos e demais regras são validados pelo servidor, e sua mensagem é mostrada ao aluno.

Não há fallback para matrícula ou salvamento de turmas no localStorage. Em falha de rede, não aparece sucesso fictício. Depois de um erro no POST, o aluno precisa atualizar as listas antes de tentar novamente, pois um timeout pode acontecer após a gravação. Se apenas a atualização posterior falhar, a confirmação já recebida é preservada.

## Limites e pendências para a equipe

- A rota POST /matriculas atual não verifica o status fechada/cancelada da turma. A tela bloqueia essas opções, mas o Backend A deve garantir a regra também no servidor, inclusive se o status mudar durante a confirmação.
- Usuários que combinam ALUNO com SECRETARIA/ADMIN são tratados pelo backend como gestores e exigem id_aluno; este fluxo é destinado à conta de aluno, sem perfil de gestor.
- Não houve implantação nem alteração direta no GitHub.

## Verificação

- TypeScript e build de produção passaram.
- 21 testes de Turma/Matrícula passaram (sucesso, cancelamento, bloqueios, erros da API, respostas incompatíveis e falha de atualização após confirmação).
- ESLint sem erros; dois avisos existentes em AuthContext.
- A suíte geral tem falhas fora deste escopo: LoginPage.test.jsx ainda espera MFA e turmaValidation.test.ts não possui testes. Não foram alterados.

- Integração HTTP dos serviços do frontend com FastAPI e SQLite temporário passou: login real, carga dos selects, criação/edição de turma, matrícula, consulta com conversão dos horários e rejeição de duplicidade (409). Não valida concorrência em MySQL nem o ambiente publicado.
