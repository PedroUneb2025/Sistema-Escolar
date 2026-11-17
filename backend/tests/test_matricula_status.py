from sqlalchemy import func, select

from app.models.turma import MatriculaTurma, StatusTurma
from tests.helpers import _aluno, _headers, _professor, _turma, _usuario


def _definir_status(db, turma, status):
    turma.status = status
    db.commit()


def test_turma_aberta_aceita_matricula(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))
    assert resp.status_code == 201


def test_turma_fechada_bloqueia_matricula(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _definir_status(db_session, turma, StatusTurma.fechada)

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 409
    assert "não está aberta" in resp.json()["detail"]
    assert "fechada" in resp.json()["detail"]


def test_turma_cancelada_bloqueia_matricula(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _definir_status(db_session, turma, StatusTurma.cancelada)

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 409
    assert "cancelada" in resp.json()["detail"]


def test_secretaria_tambem_nao_matricula_em_turma_cancelada(client, db_session):
    aluno = _aluno(db_session, 1)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _definir_status(db_session, turma, StatusTurma.cancelada)

    resp = client.post(
        "/matriculas",
        json={"id_turma": turma.id_turma, "id_aluno": aluno.id_aluno},
        headers=_headers(client, "sec@sga.edu"),
    )

    assert resp.status_code == 409


def test_matricula_bloqueada_nao_grava_nada(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _definir_status(db_session, turma, StatusTurma.fechada)

    client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    total = db_session.scalar(select(func.count()).select_from(MatriculaTurma))
    assert total == 0


def test_reabrir_a_turma_libera_a_matricula(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    h = _headers(client, "aluno1@sga.edu")
    _definir_status(db_session, turma, StatusTurma.fechada)
    assert client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h).status_code == 409

    _definir_status(db_session, turma, StatusTurma.aberta)

    assert client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h).status_code == 201
