from app.core.security import hash_password
from app.models.rbac import Perfil
from app.models.usuario import StatusUsuario, Usuario


def _criar_usuario(db_session, email: str, nome_perfil: str) -> Usuario:
    perfil = db_session.query(Perfil).filter_by(nome=nome_perfil).first()
    if perfil is None:
        perfil = Perfil(nome=nome_perfil)
        db_session.add(perfil)

    usuario = Usuario(email=email, senha_hash=hash_password("senha123"), status=StatusUsuario.ativo)
    usuario.perfis.append(perfil)
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


def _token(client, email: str) -> str:
    resp = client.post("/auth/login", data={"username": email, "password": "senha123"})
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_secretaria_cria_curso(client, db_session):
    _criar_usuario(db_session, "sec@sga.edu", "SECRETARIA")
    token = _token(client, "sec@sga.edu")

    resp = client.post(
        "/cursos",
        json={"codigo": "ADS", "nome": "Análise e Desenvolvimento de Sistemas", "grau": "Tecnólogo"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 201
    assert resp.json()["codigo"] == "ADS"


def test_aluno_nao_pode_criar_curso(client, db_session):
    _criar_usuario(db_session, "aluno2@sga.edu", "ALUNO")
    token = _token(client, "aluno2@sga.edu")

    resp = client.post(
        "/cursos",
        json={"codigo": "ADS", "nome": "ADS", "grau": "Tecnólogo"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 403


def test_aluno_pode_listar_cursos(client, db_session):
    _criar_usuario(db_session, "aluno3@sga.edu", "ALUNO")
    token = _token(client, "aluno3@sga.edu")

    resp = client.get("/cursos", headers=_auth_header(token))
    assert resp.status_code == 200


def test_codigo_duplicado_retorna_409(client, db_session):
    _criar_usuario(db_session, "sec2@sga.edu", "SECRETARIA")
    token = _token(client, "sec2@sga.edu")
    headers = _auth_header(token)

    client.post("/cursos", json={"codigo": "SI", "nome": "Sistemas de Informação", "grau": "Bacharelado"}, headers=headers)
    resp = client.post("/cursos", json={"codigo": "SI", "nome": "Outro", "grau": "Bacharelado"}, headers=headers)
    assert resp.status_code == 409


def test_fluxo_matriz_e_disciplina(client, db_session):
    _criar_usuario(db_session, "sec3@sga.edu", "SECRETARIA")
    token = _token(client, "sec3@sga.edu")
    headers = _auth_header(token)

    curso = client.post(
        "/cursos", json={"codigo": "ENG", "nome": "Engenharia", "grau": "Bacharelado"}, headers=headers
    ).json()

    matriz = client.post(
        "/matrizes",
        json={"id_curso": curso["id_curso"], "versao_ano": "2026", "carga_horaria_total": 3200},
        headers=headers,
    ).json()
    assert matriz["ativo"] is True

    disciplina = client.post(
        "/disciplinas", json={"codigo": "CALC1", "nome": "Cálculo I"}, headers=headers
    ).json()

    vinculo = client.post(
        f"/matrizes/{matriz['id_matriz']}/disciplinas",
        json={"id_disciplina": disciplina["id_disciplina"], "semestre_ideal": 1, "carga_horaria": 80},
        headers=headers,
    )
    assert vinculo.status_code == 201

    listagem = client.get(f"/matrizes/{matriz['id_matriz']}/disciplinas", headers=headers)
    assert listagem.status_code == 200
    assert len(listagem.json()) == 1


def test_sem_token_retorna_401(client):
    resp = client.get("/cursos")
    assert resp.status_code == 401
