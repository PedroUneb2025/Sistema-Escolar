# SGA-Edu — Backend (Sprint 1)

FastAPI + SQLAlchemy + JWT, sobre o schema MySQL entregue pelo DBA
(`db_schema_dba.sql`).

## 1. Subir o banco

```bash
docker compose up -d
```

## 2. Ambiente Python

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# gere uma chave forte: openssl rand -hex 32
```

## 3. Criar as tabelas

Ainda **não há Alembic configurado neste esqueleto** — é o próximo passo do
Dev A (ver "Próximos passos" abaixo). Por enquanto, para rodar localmente,
aplique o SQL do DBA direto:

```bash
mysql -h 127.0.0.1 -u sga -psga123 sga_edu < db_schema_dba.sql
```

## 4. Popular perfis e o admin inicial

```bash
python -m app.seed
```

Isso cria os perfis (`admin`, `secretaria`, `coordenacao`, `professor`,
`aluno`, `financeiro`) e um usuário `admin@sga.edu`. Troque a senha no
`app/seed.py` antes de rodar, ou troque no banco depois.

## 5. Subir a API

```bash
uvicorn app.main:app --reload
```

Acesse `http://localhost:8000/docs`.

## 6. Rodar os testes

Os testes usam SQLite em memória — não precisam do MySQL rodando.

```bash
pytest tests/ -v
```

## Contrato da API (para o front)

- `POST /auth/login` — form-data (`application/x-www-form-urlencoded`),
  campos `username` (e-mail) e `password`. Retorna
  `{ "access_token": "...", "token_type": "bearer" }`.
- `GET /auth/me` — header `Authorization: Bearer <token>`. Retorna
  `{ id_usuario, email, status, perfis: [...] }`.
- 401 = não autenticado / token inválido ou expirado.
- 403 = autenticado, mas sem o perfil necessário (`require_perfis`).

## Próximos passos (ainda nesta sprint)

- [ ] Configurar o Alembic (`alembic init`), apontar `env.py` para
      `app.db.base.Base.metadata` e para `settings.DATABASE_URL`, e gerar a
      migration inicial a partir dos models em `app/models/` — ela deve
      reproduzir o `db_schema_dba.sql`. A partir daí o Alembic vira a fonte
      de verdade; mudanças de schema passam a virar revisão, não SQL solto.
  - Se o DBA já rodou o `db_schema_dba.sql` no banco de desenvolvimento
    compartilhado, gere a migration e rode `alembic stamp head` nesse banco
    (marca a revisão como aplicada sem tentar recriar as tabelas). Em bancos
    novos (CI, banco local de cada dev), use `alembic upgrade head` normalmente.
- [ ] Confirmar com o DBA a lista definitiva de perfis e permissões
      (`app/seed.py` tem uma lista provisória).
- [ ] Decidir se haverá `POST /auth/register` público nesta sprint ou se o
      cadastro de aluno/professor fica para a Sprint 2 (dependência de
      `matricula`/`cpf`, que hoje só existem nas tabelas `aluno`/`professor`).
- [ ] Trocar a senha do admin do seed antes de qualquer deploy.
