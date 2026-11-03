from app.models.sala import Sala
from tests.helpers import _aluno, _headers, _professor, _turma, _usuario


def _sala(client, h, **extra):
    corpo = {"codigo": "A101", "bloco_predio": "Bloco A", "capacidade": 40}
    corpo.update(extra)
    return client.post("/salas", json=corpo, headers=h)


def test_secretaria_cria_sala_com_tipo_padrao(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")

    resp = _sala(client, _headers(client, "sec@sga.edu"))

    assert resp.status_code == 201
    assert resp.json()["tipo"] == "AULA"
    assert resp.json()["codigo"] == "A101"


def test_aluno_le_mas_nao_escreve_sala(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    _aluno(db_session, 1)
    sala = _sala(client, _headers(client, "sec@sga.edu")).json()
    h = _headers(client, "aluno1@sga.edu")

    assert client.get("/salas", headers=h).status_code == 200
    assert client.get(f"/salas/{sala['id_sala']}", headers=h).status_code == 200
    assert _sala(client, h, codigo="B1").status_code == 403
    assert client.delete(f"/salas/{sala['id_sala']}", headers=h).status_code == 403
    assert client.get("/salas").status_code == 401


def test_validacoes_de_sala(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")

    assert _sala(client, h, capacidade=0).status_code == 422
    assert _sala(client, h, codigo="X" * 21).status_code == 422
    assert _sala(client, h, codigo="   ").status_code == 422


def test_codigo_de_sala_duplicado_retorna_409(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    _sala(client, h)

    assert _sala(client, h).status_code == 409


def test_editar_sala(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    sala = _sala(client, h).json()

    ok = client.put(f"/salas/{sala['id_sala']}", json={"capacidade": 60}, headers=h)
    invalida = client.put(f"/salas/{sala['id_sala']}", json={"capacidade": 0}, headers=h)

    assert ok.status_code == 200 and ok.json()["capacidade"] == 60
    assert invalida.status_code == 422
    assert client.put("/salas/999", json={"capacidade": 10}, headers=h).status_code == 404


def test_excluir_sala_sem_turma(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    sala = _sala(client, h).json()

    assert client.delete(f"/salas/{sala['id_sala']}", headers=h).status_code == 204
    assert client.get(f"/salas/{sala['id_sala']}", headers=h).status_code == 404


def test_excluir_sala_com_turma_retorna_409(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    turma = _turma(db_session, _professor(db_session, 1), "T1")

    resp = client.delete(f"/salas/{turma.id_sala}", headers=_headers(client, "sec@sga.edu"))

    assert resp.status_code == 409
    assert db_session.get(Sala, turma.id_sala) is not None


def test_listar_professores(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    _professor(db_session, 2)
    _professor(db_session, 1)
    _aluno(db_session, 1)

    resp = client.get("/professores", headers=_headers(client, "sec@sga.edu"))

    assert resp.status_code == 200
    corpo = resp.json()
    assert [p["nome_completo"] for p in corpo] == ["Professor 1", "Professor 2"]
    assert set(corpo[0]) == {"id_professor", "nome_completo", "matricula_funcional"}
    assert client.get("/professores", headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.get("/professores").status_code == 401
