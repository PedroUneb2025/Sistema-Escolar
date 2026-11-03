from datetime import time

from app.models.turma import DiaSemana
from tests.helpers import _aluno, _headers, _professor, _turma


def test_minhas_turmas_no_formato_do_front(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1", dia=DiaSemana.QUA, ini=time(8), fim=time(10))
    h = _headers(client, "aluno1@sga.edu")
    client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h)

    resp = client.get("/academico/minhas-turmas", headers=h)

    assert resp.status_code == 200
    (item,) = resp.json()
    # chaves exatamente como o ItemConsultaAcademica do front
    assert item["codigoTurma"] == "T1"
    assert item["disciplinaNome"] == "Disciplina T1"
    assert item["disciplinaCodigo"] == "D-T1"
    assert item["professorNome"] == "Professor 1"
    assert item["semestre"] == "2026.2"
    assert item["situacao"] == "matriculado"
    assert item["nota1"] is None and item["notaFinal"] is None
    assert isinstance(item["idMatricula"], int)
    assert item["horarios"] == [
        {
            "diaSemana": "Quarta-feira",
            "diaSemanaNumero": 3,
            "horarioInicio": "08:00",
            "horarioFim": "10:00",
            "sala": "S-T1",
            "codigoTurma": "T1",
        }
    ]


def test_minhas_turmas_vazio_quando_nao_ha_matricula(client, db_session):
    _aluno(db_session, 1)
    resp = client.get("/academico/minhas-turmas", headers=_headers(client, "aluno1@sga.edu"))
    assert resp.status_code == 200
    assert resp.json() == []


def test_minhas_turmas_so_para_aluno(client, db_session):
    _professor(db_session, 1)
    resp = client.get("/academico/minhas-turmas", headers=_headers(client, "prof1@sga.edu"))
    assert resp.status_code == 403


def test_minhas_turmas_sem_token(client):
    assert client.get("/academico/minhas-turmas").status_code == 401
