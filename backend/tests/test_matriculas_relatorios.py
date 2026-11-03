from datetime import time

from app.models.turma import DiaSemana, MatriculaTurma, SituacaoMatricula
from tests.helpers import _aluno, _headers, _professor, _turma, _usuario


# ----------------------------- matrícula -----------------------------

def test_aluno_se_matricula_em_turma(client, db_session):
    aluno = _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["id_aluno"] == aluno.id_aluno
    assert corpo["situacao"] == "matriculado"


def test_matricula_duplicada_retorna_409(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    h = _headers(client, "aluno1@sga.edu")

    client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h)
    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h)

    assert resp.status_code == 409
    assert "já possui matrícula" in resp.json()["detail"]


def test_turma_lotada_retorna_409(client, db_session):
    _aluno(db_session, 1)
    _aluno(db_session, 2)
    turma = _turma(db_session, _professor(db_session, 1), "T1", vagas=1)

    primeira = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))
    segunda = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno2@sga.edu"))

    assert primeira.status_code == 201
    assert segunda.status_code == 409
    assert "vagas" in segunda.json()["detail"]


def test_conflito_de_horario_do_aluno_retorna_409(client, db_session):
    _aluno(db_session, 1)
    prof = _professor(db_session, 1)
    t1 = _turma(db_session, prof, "T1", ini=time(8), fim=time(10))
    t2 = _turma(db_session, prof, "T2", ini=time(9), fim=time(11))  # sobrepõe T1
    h = _headers(client, "aluno1@sga.edu")

    assert client.post("/matriculas", json={"id_turma": t1.id_turma}, headers=h).status_code == 201
    resp = client.post("/matriculas", json={"id_turma": t2.id_turma}, headers=h)

    assert resp.status_code == 409
    assert "Conflito de horário" in resp.json()["detail"]


def test_horarios_consecutivos_nao_conflitam(client, db_session):
    _aluno(db_session, 1)
    prof = _professor(db_session, 1)
    t1 = _turma(db_session, prof, "T1", ini=time(8), fim=time(10))
    t2 = _turma(db_session, prof, "T2", ini=time(10), fim=time(12))  # começa quando T1 termina
    h = _headers(client, "aluno1@sga.edu")

    assert client.post("/matriculas", json={"id_turma": t1.id_turma}, headers=h).status_code == 201
    assert client.post("/matriculas", json={"id_turma": t2.id_turma}, headers=h).status_code == 201


def test_aluno_nao_matricula_outro_aluno(client, db_session):
    _aluno(db_session, 1)
    outro = _aluno(db_session, 2)
    turma = _turma(db_session, _professor(db_session, 1), "T1")

    resp = client.post(
        "/matriculas",
        json={"id_turma": turma.id_turma, "id_aluno": outro.id_aluno},
        headers=_headers(client, "aluno1@sga.edu"),
    )
    assert resp.status_code == 403


def test_secretaria_matricula_aluno(client, db_session):
    aluno = _aluno(db_session, 1)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    h = _headers(client, "sec@sga.edu")

    sem_aluno = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h)
    assert sem_aluno.status_code == 400

    ok = client.post("/matriculas", json={"id_turma": turma.id_turma, "id_aluno": aluno.id_aluno}, headers=h)
    assert ok.status_code == 201


def test_matricula_em_turma_inexistente_retorna_404(client, db_session):
    _aluno(db_session, 1)
    resp = client.post("/matriculas", json={"id_turma": 9999}, headers=_headers(client, "aluno1@sga.edu"))
    assert resp.status_code == 404


def test_professor_nao_pode_matricular(client, db_session):
    _professor(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 2), "T1")
    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "prof1@sga.edu"))
    assert resp.status_code == 403


def test_minhas_matriculas_traz_dados_da_turma(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    h = _headers(client, "aluno1@sga.edu")
    client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=h)

    resp = client.get("/matriculas/minhas", headers=h)

    assert resp.status_code == 200
    itens = resp.json()
    assert len(itens) == 1
    assert itens[0]["codigo_turma"] == "T1"
    assert itens[0]["disciplina_nome"] == "Disciplina T1"
    assert itens[0]["professor_nome"] == "Professor 1"
    assert itens[0]["dia_semana"] == "SEG"
    assert itens[0]["nota_final"] is None


# ----------------------------- relatórios -----------------------------

def test_lista_de_alunos_so_para_gestor(client, db_session):
    _aluno(db_session, 1)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")

    negado = client.get("/relatorios/alunos", headers=_headers(client, "aluno1@sga.edu"))
    assert negado.status_code == 403

    ok = client.get("/relatorios/alunos", headers=_headers(client, "sec@sga.edu"))
    assert ok.status_code == 200
    corpo = ok.json()
    assert len(corpo) == 1
    assert corpo[0]["email"] == "aluno1@sga.edu"
    # dados sensíveis não devem vazar na listagem
    assert "cpf" not in corpo[0]


def test_lista_de_alunos_com_busca(client, db_session):
    _aluno(db_session, 1)
    _aluno(db_session, 2)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")

    resp = client.get("/relatorios/alunos?busca=Aluno 2", headers=_headers(client, "sec@sga.edu"))
    assert [a["nome_completo"] for a in resp.json()] == ["Aluno 2"]


def test_matriculados_filtra_por_situacao_padrao(client, db_session):
    a1 = _aluno(db_session, 1)
    a2 = _aluno(db_session, 2)
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    turma = _turma(db_session, _professor(db_session, 1), "T1")
    db_session.add_all([
        MatriculaTurma(id_aluno=a1.id_aluno, id_turma=turma.id_turma, situacao=SituacaoMatricula.matriculado),
        MatriculaTurma(id_aluno=a2.id_aluno, id_turma=turma.id_turma, situacao=SituacaoMatricula.trancado),
    ])
    db_session.commit()

    resp = client.get(f"/relatorios/matriculados?id_turma={turma.id_turma}", headers=_headers(client, "sec@sga.edu"))

    assert resp.status_code == 200
    assert [m["nome_completo"] for m in resp.json()] == ["Aluno 1"]


def test_alunos_da_turma_para_professor_dono(client, db_session):
    aluno = _aluno(db_session, 1)
    prof = _professor(db_session, 1)
    turma = _turma(db_session, prof, "T1", vagas=25)
    db_session.add(MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=turma.id_turma, nota_final=8.5, frequencia=90))
    db_session.commit()

    resp = client.get(f"/relatorios/turmas/{turma.id_turma}/alunos", headers=_headers(client, "prof1@sga.edu"))

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["codigo_turma"] == "T1"
    assert corpo["vagas_totais"] == 25
    assert corpo["total_alunos"] == 1
    assert corpo["alunos"][0]["nota_final"] == 8.5
    assert corpo["alunos"][0]["frequencia"] == 90.0


def test_professor_nao_ve_turma_de_outro_professor(client, db_session):
    _professor(db_session, 1)
    outro = _professor(db_session, 2)
    turma = _turma(db_session, outro, "T1")

    resp = client.get(f"/relatorios/turmas/{turma.id_turma}/alunos", headers=_headers(client, "prof1@sga.edu"))
    assert resp.status_code == 403


def test_aluno_nao_acessa_relatorio_da_turma(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T1")

    resp = client.get(f"/relatorios/turmas/{turma.id_turma}/alunos", headers=_headers(client, "aluno1@sga.edu"))
    assert resp.status_code == 403


def test_relatorio_de_turma_inexistente_retorna_404(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    resp = client.get("/relatorios/turmas/9999/alunos", headers=_headers(client, "sec@sga.edu"))
    assert resp.status_code == 404
