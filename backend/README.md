# SGA-Edu — Backend

API em FastAPI + SQLAlchemy + MySQL 8, com autenticação JWT e controle de acesso por perfil.

## Subir o ambiente (primeira vez)

Com o Docker aberto, dentro de `backend/`:

```powershell
docker compose up -d
Get-Content db_schema_dba.sql | docker compose exec -T db mysql -u sga -psga123 sga_edu
Get-Content drop_triggers.sql | docker compose exec -T db mysql -u sga -psga123 sga_edu
Get-Content sprint3_dba_incremental.sql | docker compose exec -T db mysql -u sga -psga123 sga_edu

py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # e troque a SECRET_KEY

alembic stamp head
py -m app.seed                # perfis e usuário admin
py -m app.seed_demo           # contas de teste (NUNCA em produção)
uvicorn app.main:app --reload
```

Documentação interativa: http://localhost:8000/docs

Por que o `drop_triggers.sql`: o MySQL não permite que uma trigger altere a própria tabela que a disparou
(erro 1442). A regra "só uma matriz curricular ativa por curso" é garantida na aplicação
(`api/routes/curriculo.py`), e as triggers do `db_schema_dba.sql` precisam ser removidas.

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
| `POST /matriculas` | ALUNO, SECRETARIA, ADMIN | matrícula: vagas, pré-requisitos e conflito de horário |
| `GET /matriculas/minhas` | ALUNO | matrículas com turma, horário, nota e frequência |
| `GET /academico/minhas-turmas` | ALUNO | mesmos dados, no formato do painel do front (camelCase) |
| `GET /relatorios/alunos` | SECRETARIA, ADMIN | lista de alunos (`?busca=`), paginada |
| `GET /relatorios/matriculados` | SECRETARIA, ADMIN | matriculados, filtros por semestre, disciplina, turma e situação |
| `GET /relatorios/turmas/{id}/alunos` | SECRETARIA, ADMIN, PROFESSOR (da turma) | alunos da turma, com nota e frequência |
| `POST /usuarios/alunos`, `POST /usuarios/professores` | SECRETARIA, ADMIN | cadastro (conta + registro, na mesma transação) |
| `POST /usuarios/funcionarios` | ADMIN | secretaria, coordenação, financeiro ou admin |

Erros: `401` sem token ou token inválido · `403` sem permissão · `404` não encontrado · `409` conflito
(duplicado, sem vaga, pré-requisito, horário) · `422` dados inválidos. A mensagem fica em `detail`.

## Decisões importantes

- **Não existe cadastro público.** As contas são criadas pela secretaria ou pelo admin.
- **Só `situacao = 'matriculado'` ocupa vaga** (mesma regra da consulta do DBA).
- **O MySQL roda em `READ COMMITTED`** (`app/db/session.py`). Sem isso, a matrícula na última vaga
  podia ser dada a duas pessoas ou gerar deadlock. Não remova sem rodar `scripts/verificar_corrida_vagas.py`.
- **Pré-requisito cumprido** = ter sido `aprovado` em qualquer turma da disciplina.
- O banco guarda só `nota_final` (não existe nota por avaliação).

## Pendências

- CRUD de Turma e Sala no backend (Dev B). O front usa dados locais enquanto a rota não existir.
- Coluna `status` na tabela `turma` (aberta, fechada ou cancelada), usada pelo front. Depende do DBA.
- Lista de presença aula a aula: o banco só tem a frequência consolidada. Depende de tabelas novas.
- Regra de aprovação (nota e frequência mínimas), ainda não definida.
