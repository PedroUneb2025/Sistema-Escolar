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
| `POST /auth/login` | todos | form-urlencoded (`username` = e-mail, `password`) → `access_token`. Depois de 5 falhas seguidas responde `429` com `Retry-After` (veja [Limite de tentativas de login](#limite-de-tentativas-de-login)) |
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

## Limite de tentativas de login

A API fica exposta na internet, então `POST /auth/login` limita as tentativas de senha (`app/core/limitador_login.py`).

**Regra**
- As falhas seguidas são contadas **por e-mail e IP**. Um e-mail que não existe também conta, para a resposta não
  revelar quais contas existem. Conta inativa também conta.
- Da **5ª falha seguida** em diante, a pessoa espera **30 s, depois 1, 2, 4 e 8 min, com teto de 15 min**.
- A 5ª falha já responde `429` (e não `401`). Durante a espera, **até a senha certa é recusada**, e a tentativa feita
  na espera não conta nem aumenta o tempo.
- **Login correto zera** o contador. Sem nenhuma tentativa por 1 hora depois do fim da espera, o contador também é esquecido.
- Um usuário não afeta o outro, e o mesmo e-mail vindo de outro IP tem contador próprio.

**Resposta**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
{"detail": "Muitas tentativas. Tente de novo em 1 minuto"}
```

`Retry-After` vem em segundos. O front lê esse valor (a API o expõe no CORS), mostra o aviso na tela de login e
desabilita o botão até acabar.

**Limitações (de propósito, por ser em memória)**
- Os contadores **zeram se a API reiniciar**.
- Só funciona com **um processo** (um worker do uvicorn, como no `Dockerfile`). Com `--workers` maior que 1 ou mais de
  uma instância, cada processo teria o seu contador, e aí seria preciso um armazenamento compartilhado (Redis).
- O limite é por (e-mail, IP). Quem testa **uma senha em muitos e-mails** a partir do mesmo IP não é barrado, porque
  cada e-mail tem o seu contador. Se isso virar problema, o próximo passo é um contador por IP com limite maior.

**Qual IP a API enxerga (importante atrás de túnel ou proxy)**

O contador usa `request.client.host`. Atrás de um túnel, esse valor só é o IP real da pessoa se o uvicorn confiar no
proxy; senão **todos os usuários caem no mesmo IP e dividem o mesmo contador**. O uvicorn já lê o cabeçalho
`X-Forwarded-For`, mas só quando a conexão vem de um IP confiável (por padrão, `127.0.0.1`, o caso do túnel rodando
na mesma máquina). Se o proxy estiver em outro endereço (hospedagem, Docker), informe-o:

```powershell
uvicorn app.main:app --proxy-headers --forwarded-allow-ips="IP_DO_PROXY"
# ou, no ambiente: FORWARDED_ALLOW_IPS=IP_DO_PROXY
```

Não use `*` se a API também puder ser acessada direto, sem passar pelo proxy: aí qualquer pessoa inventaria o
cabeçalho para trocar de IP a cada tentativa. O código não lê `X-Forwarded-For` por conta própria, justamente por isso.

Para conferir: erre a senha 5 vezes seguidas **de fora da rede, pelo endereço do túnel**, e olhe o log do uvicorn. A
linha `login bloqueado: ip=...` mostra o IP que o contador usou. Se aparecer `127.0.0.1` (ou o IP do próprio túnel),
a configuração acima está faltando.

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
