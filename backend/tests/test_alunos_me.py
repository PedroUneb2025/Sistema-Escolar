# Destino: backend/tests/test_alunos_me.py
from tests.helpers import _aluno, _headers, _professor, _usuario


def test_aluno_consulta_o_proprio_cadastro(client, db_session):
    aluno = _aluno(db_session, 1)

    resp = client.get("/alunos/me", headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["id_aluno"] == aluno.id_aluno
    assert corpo["nome_completo"] == "Aluno 1"
    assert corpo["matricula"] == aluno.matricula
    assert corpo["email"] == "aluno1@sga.edu"
    assert "cpf" not in corpo


def test_cada_aluno_ve_so_o_proprio_cadastro(client, db_session):
    _aluno(db_session, 1)
    aluno2 = _aluno(db_session, 2)

    resp = client.get("/alunos/me", headers=_headers(client, "aluno2@sga.edu"))

    assert resp.status_code == 200
    assert resp.json()["id_aluno"] == aluno2.id_aluno


def test_outros_perfis_nao_acessam_alunos_me(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    _professor(db_session, 1)

    for email in ("sec@sga.edu", "prof1@sga.edu"):
        resp = client.get("/alunos/me", headers=_headers(client, email))
        assert resp.status_code == 403


def test_alunos_me_exige_login(client):
    assert client.get("/alunos/me").status_code == 401


def test_rota_de_aluno_por_id_continua_funcionando(client, db_session):
    aluno = _aluno(db_session, 1)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")

    resp = client.get(f"/alunos/{aluno.id_aluno}", headers=_headers(client, "sec@sga.edu"))

    assert resp.status_code == 200
    assert resp.json()["id_aluno"] == aluno.id_aluno
