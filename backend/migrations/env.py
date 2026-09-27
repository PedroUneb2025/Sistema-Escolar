from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401 — registra todos os models no Base.metadata

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata

# Tabelas que o back-end (autenticação/RBAC) gerencia. As demais (curso,
# disciplina, turma, matricula_turma, matriz_curricular, matriz_disciplina)
# já existem no banco mas pertencem a outra parte do sistema — o Alembic não
# deve propor DROP delas só porque ainda não têm model aqui.
TABELAS_GERENCIADAS = {
    "usuario", "perfil", "permissao",
    "usuario_perfil", "perfil_permissao",
    "aluno", "professor",
}

def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and reflected and name not in TABELAS_GERENCIADAS:
        return False
    return True

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()