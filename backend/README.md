# SGA-Edu — Backend

API em FastAPI + SQLAlchemy + MySQL 8, com autenticação JWT e controle de acesso por perfil.

## Subir o ambiente (primeira vez)

Com o Docker aberto, dentro de `backend/`:

```powershell
docker compose up -d
docker compose logs db --tail 3      # espere aparecer "ready for connections"
Get-Content dp_new_schema_full.sql | docker compose exec -T db mysql -u sga -psga123 sga_edu

py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env               # e troque a SECRET_KEY

alembic stamp head
py -m app.seed                       # perfis e usuário admin
py -m app.seed_demo                  # contas de teste (NUNCA em produção)
uvicorn app.main:app --reload
```

Documentação interativa: http://localhost:8000/docs

**Um único script cria o banco inteiro** (`dp_new_schema_full.sql`, do DBA). Em um banco novo, **não** aplique
`db_schema_dba.sql`, `drop_triggers.sql` nem `sprint3_dba_incremental.sql`: são o histórico das sprints
anteriores e não criam a coluna `status` da turma. Sem essa coluna, `GET /turmas` quebra.

### Já tenho um banco criado nas sprints anteriores

```powershell
alembic current                      # se não mostrar nada, rode antes: alembic stamp e56c53147d20
alembic upgrade head                 # cria a coluna turma.status
```

As triggers de "matriz ativa" foram removidas de propósito: o MySQL não permite que uma trigger altere a
própria tabela que a disparou (erro 1442). A regra "só uma matriz curricular ativa por curso" é garantida
na aplicação (`api/routes/curriculo.py`).

## Publicação (produção)

O `Dockerfile` roda a API na porta definida pela hospedagem (variável `PORT`). Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `mysql+pymysql://usuario:senha@host:porta/sga_edu` (se o provedor exigir SSL: acrescente `?ssl_ca=certs/ca.pem`) |
| `SECRET_KEY` | texto longo e aleatório, só no painel da hospedagem |
| `CORS_ORIGINS` | `["https://pedrouneb2025.github.io"]` (só a origem, sem caminho) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |

No primeiro deploy: aplicar `dp_new_schema_full.sql` no banco, `alembic stamp head` e `py -m app.seed`
(**troque a senha do admin**). Não rode `seed_demo` em produção sem trocar a senha de demonstração.

## Contas de demonstração (`app.seed_demo`)

Senha de todas: `Senha@123` (o admin usa a senha definida em `app/seed.py`).

| Perfil | E-mail |
|---|---|
| ADMIN | admin@uneb.br |
| SECRETARIA | secretaria@uneb.br |
| COORDENACAO | coordenacao@uneb.br |
| FINANCEIRO | financeiro@uneb.br |
| PROFESSOR | professor@uneb.br |
| ALUNO | aluno@uneb.br |

O seed também cria a sala A101, a disciplina PROG1 e a turma PROG1-A (segunda, 08h–10h).

## Testes

```powershell
pytest tests/ -v
```

Os testes usam SQLite em memória e não precisam do MySQL. Para verificar a **concorrência de matrículas**
(que só se reproduz no MySQL de verdade), com a API no ar:

```powershell
py scripts/verificar_corrida_vagas.py
```

O script dispara matrículas simultâneas na última vaga de 24 turmas e apaga os dados de teste no fim.

## Perfis e permissões

| Perfil | Pode |
|---|---|
| ALUNO | se matricular, ver as próprias matrículas e o painel acadêmico |
| PROFESSOR | ver a lista de alunos das **próprias** turmas |
| SECRETARIA | cadastrar alunos e professores, gerir currículo, matricular qualquer aluno, relatórios |
| COORDENACAO | gerir currículo e pré-requisitos |
| ADMIN | tudo acima, e é o único que cria funcionários |

Leitura de currículo e pré-requisitos: qualquer usuário autenticado.

## Rotas

| Rota | Quem | Descrição |
|---|---|---|
| `POST /auth/login` | todos | form-urlencoded (`username` = e-mail, `password`) → `access_token` |
| `GET /auth/me` | logado | `id_usuario`, `email`, `status`, `perfis` |
| `GET/POST /cursos`, `GET/PUT/DELETE /cursos/{id}` | leitura: logado · escrita: SECRETARIA, COORDENACAO, ADMIN | cursos |
| `GET/POST /disciplinas`, `GET/PUT/DELETE /disciplinas/{id}` | idem | disciplinas |
| `GET/POST /matrizes`, `GET/PUT/DELETE /matrizes/{id}` | idem | matrizes curriculares (ativar uma desativa as outras do curso) |
| `GET/POST /matrizes/{id}/disciplinas`, `DELETE .../{id_disciplina}` | idem | disciplinas da matriz |
| `GET/POST /disciplinas/{id}/prerequisitos`, `DELETE .../{id_prerequisito}` | idem | pré-requisitos (bloqueia ciclos) |
| `POST /matriculas` | ALUNO, SECRETARIA, ADMIN | matrícula: turma aberta, vagas, pré-requisitos e conflito de horário |
| `GET /matriculas/minhas` | ALUNO | matrículas com turma, horário, nota e frequência |
| `GET /academico/minhas-turmas` | ALUNO | mesmos dados, no formato do painel do front (camelCase) |
| `GET /relatorios/alunos` | SECRETARIA, ADMIN | lista de alunos (`?busca=`), paginada |
| `GET /relatorios/matriculados` | SECRETARIA, ADMIN | matriculados, filtros por semestre, disciplina, turma e situação |
| `GET /relatorios/turmas/{id}/alunos` | SECRETARIA, ADMIN, PROFESSOR (da turma) | alunos da turma, com nota e frequência |
| `POST /usuarios/alunos`, `POST /usuarios/professores` | SECRETARIA, ADMIN | cadastro (conta + registro, na mesma transação) |
| `POST /usuarios/funcionarios` | ADMIN | secretaria, coordenação, financeiro ou admin |
| `GET/POST /salas`, `GET/PUT/DELETE /salas/{id}` | leitura: logado · escrita: SECRETARIA, COORDENACAO, ADMIN | salas |
| `GET /professores` | SECRETARIA, COORDENACAO, ADMIN | lista de professores (para os campos de seleção) |
| `GET/POST /turmas`, `GET/PUT/DELETE /turmas/{id}` | leitura: logado · escrita: SECRETARIA, COORDENACAO, ADMIN | turmas, com validação de conflito de horário (sala e professor) |
| `GET /turmas/{id}/vagas` | logado | vagas totais, ocupadas e disponíveis |
| `PATCH /turmas/{id}/matriculas/{id_matricula}` | PROFESSOR (da turma), SECRETARIA, ADMIN | lança `nota_final` e `frequencia` |
| `GET /turmas/{id}/resumo` | PROFESSOR (da turma), SECRETARIA, ADMIN | média das notas, frequência média e contagem por situação |

Erros: `401` sem token ou token inválido · `403` sem permissão · `404` não encontrado · `409` conflito
(duplicado, sem vaga, pré-requisito, horário) · `422` dados inválidos. A mensagem fica em `detail`.

## Decisões importantes

- **Não existe cadastro público.** As contas são criadas pela secretaria ou pelo admin.
- **Só `situacao = 'matriculado'` ocupa vaga** (mesma regra da consulta do DBA).
- **O MySQL roda em `READ COMMITTED`** (`app/db/session.py`). Sem isso, a matrícula na última vaga
  podia ser dada a duas pessoas ou gerar deadlock. Não remova sem rodar `scripts/verificar_corrida_vagas.py`.
- **Só turma com status `aberta` aceita matrícula** (fechada ou cancelada retorna 409), para o aluno e para a secretaria.
- **Pré-requisito cumprido** = ter sido `aprovado` em qualquer turma da disciplina.
- O banco guarda só `nota_final` (não existe nota por avaliação).

## Pendências

- Consulta individual, edição e inativação de aluno e de professor (hoje só existem cadastro e listagem).
- Lista de presença aula a aula: o banco só tem a frequência consolidada. Depende de tabelas novas.
- Regra de aprovação (nota e frequência mínimas), ainda não definida.
- Publicação do backend e do banco (ver "Publicação").
