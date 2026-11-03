from app.models.turma import MatriculaTurma, SituacaoMatricula
from tests.helpers import _aluno, _headers, _professor, _turma, _usuario


def _matricular(db, aluno, turma, situacao=SituacaoMatricula.matriculado, nota=None, freq=None):
    m = MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=turma.id_turma,
                       situacao=situacao, nota_final=nota, frequencia=freq)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def _url(turma, matricula):
    return f"/turmas/{turma.id_turma}/matriculas/{matricula.id_matricula_turma}"


# ----------------------------- PATCH -----------------------------

def test_professor_dono_lanca_nota_e_frequencia(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    m = _matricular(db_session, _aluno(db_session, 1), turma)

    resp = client.patch(_url(turma, m), json={"nota_final": 8.5, "frequencia": 90},
                        headers=_headers(client, "prof1@sga.edu"))

    assert resp.status_code == 200
    assert resp.json()["nota_final"] == 8.5
    assert resp.json()["frequencia"] == 90
    assert resp.json()["situacao"] == "matriculado"  # não grava situação (Sprint 4)


def test_secretaria_e_admin_lancam_em_qualquer_turma(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    m = _matricular(db_session, _aluno(db_session, 1), turma)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    _usuario(db_session, "adm@sga.edu", "ADMIN")

    sec = client.patch(_url(turma, m), json={"nota_final": 7}, headers=_headers(client, "sec@sga.edu"))
    adm = client.patch(_url(turma, m), json={"frequencia": 80}, headers=_headers(client, "adm@sga.edu"))

    assert sec.status_code == 200 and adm.status_code == 200
    assert adm.json()["nota_final"] == 7  # envio parcial preserva o outro campo


def test_professor_de_outra_turma_recebe_403(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _professor(db_session, 2)
    m = _matricular(db_session, _aluno(db_session, 1), turma)

    resp = client.patch(_url(turma, m), json={"nota_final": 8}, headers=_headers(client, "prof2@sga.edu"))

    assert resp.status_code == 403


def test_aluno_recebe_403_e_sem_token_401(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    aluno = _aluno(db_session, 1)
    m = _matricular(db_session, aluno, turma)

    assert client.patch(_url(turma, m), json={"nota_final": 10},
                        headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.patch(_url(turma, m), json={"nota_final": 10}).status_code == 401


def test_nota_e_frequencia_fora_da_faixa_retornam_422(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    m = _matricular(db_session, _aluno(db_session, 1), turma)
    h = _headers(client, "prof1@sga.edu")

    assert client.patch(_url(turma, m), json={"nota_final": 10.5}, headers=h).status_code == 422
    assert client.patch(_url(turma, m), json={"nota_final": -1}, headers=h).status_code == 422
    assert client.patch(_url(turma, m), json={"frequencia": 101}, headers=h).status_code == 422
    assert client.patch(_url(turma, m), json={}, headers=h).status_code == 422
    assert client.patch(_url(turma, m), json={"nota_final": 0, "frequencia": 100}, headers=h).status_code == 200


def test_matricula_de_outra_turma_retorna_404(client, db_session):
    prof = _professor(db_session, 1)
    t1 = _turma(db_session, prof, "T1")
    t2 = _turma(db_session, prof, "T2")
    m_da_t2 = _matricular(db_session, _aluno(db_session, 1), t2)
    h = _headers(client, "prof1@sga.edu")

    assert client.patch(_url(t1, m_da_t2), json={"nota_final": 8}, headers=h).status_code == 404
    assert client.patch(f"/turmas/{t1.id_turma}/matriculas/999", json={"nota_final": 8}, headers=h).status_code == 404
    assert client.patch("/turmas/999/matriculas/1", json={"nota_final": 8}, headers=h).status_code == 404


def test_matricula_trancada_nao_pode_ser_editada(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    m = _matricular(db_session, _aluno(db_session, 1), turma, situacao=SituacaoMatricula.trancado)

    resp = client.patch(_url(turma, m), json={"nota_final": 8}, headers=_headers(client, "prof1@sga.edu"))

    assert resp.status_code == 409
    assert "trancada" in resp.json()["detail"]


# ----------------------------- resumo -----------------------------

def test_resumo_da_turma(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _matricular(db_session, _aluno(db_session, 1), turma, nota=8, freq=90)
    _matricular(db_session, _aluno(db_session, 2), turma, nota=6, freq=70)
    _matricular(db_session, _aluno(db_session, 3), turma)  # sem nota nem frequência
    _matricular(db_session, _aluno(db_session, 4), turma, situacao=SituacaoMatricula.trancado)

    resp = client.get(f"/turmas/{turma.id_turma}/resumo", headers=_headers(client, "prof1@sga.edu"))

    assert resp.status_code == 200
    assert resp.json() == {
        "idTurma": turma.id_turma,
        "totalAlunos": 4,
        "mediaNotas": 7.0,
        "frequenciaMedia": 80.0,
        "contagemPorSituacao": {
            "matriculado": 3, "aprovado": 0, "reprovado_nota": 0,
            "reprovado_falta": 0, "trancado": 1,
        },
    }


def test_resumo_turma_vazia(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")

    resp = client.get(f"/turmas/{turma.id_turma}/resumo", headers=_headers(client, "prof1@sga.edu"))

    assert resp.status_code == 200
    assert resp.json()["totalAlunos"] == 0
    assert resp.json()["mediaNotas"] is None
    assert resp.json()["frequenciaMedia"] is None


def test_resumo_permissoes(client, db_session):
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    _professor(db_session, 2)
    _aluno(db_session, 1)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    url = f"/turmas/{turma.id_turma}/resumo"

    assert client.get(url, headers=_headers(client, "sec@sga.edu")).status_code == 200
    assert client.get(url, headers=_headers(client, "prof2@sga.edu")).status_code == 403
    assert client.get(url, headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.get("/turmas/999/resumo", headers=_headers(client, "sec@sga.edu")).status_code == 404
