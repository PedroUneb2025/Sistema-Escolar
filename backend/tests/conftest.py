import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.rbac import Perfil
from app.models.usuario import StatusUsuario, Usuario

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def usuario_ativo(db_session):
    perfil = Perfil(nome="aluno")
    db_session.add(perfil)
    usuario = Usuario(
        email="teste@sga.edu",
        senha_hash=hash_password("senha123"),
        status=StatusUsuario.ativo,
    )
    usuario.perfis.append(perfil)
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario
