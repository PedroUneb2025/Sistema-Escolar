from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# mysql+pymysql://usuario:senha@host:3306/sga_edu
#
# No MySQL usamos READ COMMITTED: cada consulta enxerga o dado mais recente já
# confirmado, e as leituras não travam "intervalos" do índice. Sem isso (padrão
# REPEATABLE READ), a matrícula em turma com poucas vagas fica sujeita a duas
# falhas reais, comprovadas em teste de concorrência:
#   - vaga dada a duas pessoas (a contagem lê um "retrato" antigo do banco);
#   - deadlock (erro 1213) entre matrículas em turmas diferentes e ainda vazias.
# O SQLite (usado nos testes) não suporta esse nível, por isso só aplicamos no MySQL.
_opcoes_engine = {}
if settings.DATABASE_URL.startswith("mysql"):
    _opcoes_engine["isolation_level"] = "READ COMMITTED"

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, **_opcoes_engine)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
