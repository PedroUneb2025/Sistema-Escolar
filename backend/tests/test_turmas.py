from datetime import time

from app.models.sala import Sala
from app.models.turma import MatriculaTurma, SituacaoMatricula
from tests.helpers import _aluno, _disciplina, _headers, _professor, _usuario


def _cenario(db):
    prof1, prof2 = _professor(db, 1), _professor(db, 2)
    disc = _disciplina(db, "MAT0101", "Cálculo I")
    sala_a = Sala(codigo="A101", bloco_predio="A", capacidade=40)
    sala_b = Sala(codigo="B202", bloco_predio="B", capacidade=40)
    db.add_all([sala_a, sala_b])
    db.commit()
    _usuario(db, "sec@sga.edu", "SECRETARIA")
    return prof1, prof2, disc, sala_a, sala_b


def _corpo(prof, disc, sala, **extra):
    corpo = {
        "codigo": "MAT0101-T01",
        "idDisciplina": disc.id_disciplina,
        "idProfessor": prof.id_professor,
        "idSala": sala.id_sala,
        "semestre": "2026.1",
        "diaSemana": "Segunda-feira",
        "horarioInicio": "08:00",
        "horarioFim": "10:00",
        "vagas": 30,
        "status": "aberta",
    }
    corpo.update(extra)
    return corpo


def _criar(client, h, corpo):
    return client.post("/turmas", json=corpo, headers=h)


# ----------------------------- criar / ler -----------------------------

def test_secretaria_cria_turma_no_formato_do_front(client, db_session):
    prof, _, disc, sala, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")

    resp = _criar(client, h, _corpo(prof, disc, sala))

    assert resp.status_code == 201
    t = resp.json()
    assert isinstance(t["id"], str)
    assert t["codigo"] == "MAT0101-T01"
    assert t["disciplina"] == "Cálculo I"
    assert t["professor"] == "Professor 1"
    assert t["sala"] == "A101"
    assert t["diaSemana"] == "Segunda-feira"
    assert (t["horarioInicio"], t["horarioFim"]) == ("08:00", "10:00")
    assert t["vagas"] == 30 and t["vagasOcupadas"] == 0
    assert t["status"] == "aberta"
    assert (t["idDisciplina"], t["idProfessor"], t["idSala"]) == (
        disc.id_disciplina, prof.id_professor, sala.id_sala)


def test_coordenacao_tambem_cria_turma(client, db_session):
    prof, _, disc, sala, _ = _cenario(db_session)
    _usuario(db_session, "coord@sga.edu", "COORDENACAO")

    resp = _criar(client, _headers(client, "coord@sga.edu"), _corpo(prof, disc, sala))

    assert resp.status_code == 201


def test_aluno_e_professor_nao_escrevem(client, db_session):
    prof, _, disc, sala, _ = _cenario(db_session)
    _aluno(db_session, 1)
    corpo = _corpo(prof, disc, sala)

    assert _criar(client, _headers(client, "aluno1@sga.edu"), corpo).status_code == 403
    assert _criar(client, _headers(client, "prof1@sga.edu"), corpo).status_code == 403
    assert client.post("/turmas", json=corpo).status_code == 401


def test_qualquer_usuario_logado_le(client, db_session):
    prof, _, disc, sala, _ = _cenario(db_session)
    _aluno(db_session, 1)
    criada = _criar(client, _headers(client, "sec@sga.edu"), _corpo(prof, disc, sala)).json()
    h = _headers(client, "aluno1@sga.edu")

    lista = client.get("/turmas", headers=h)
    uma = client.get(f"/turmas/{criada['id']}", headers=h)

    assert lista.status_code == 200 and len(lista.json()) == 1
    assert uma.status_code == 200 and uma.json()["id"] == criada["id"]
    assert client.get("/turmas").status_code == 401


def test_turma_inexistente_retorna_404(client, db_session):
    _cenario(db_session)
    h = _headers(client, "sec@sga.edu")

    assert client.get("/turmas/999", headers=h).status_code == 404
    assert client.get("/turmas/999/vagas", headers=h).status_code == 404


def test_disciplina_professor_ou_sala_inexistente_retorna_404(client, db_session):
    prof, _, disc, sala, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")

    assert _criar(client, h, _corpo(prof, disc, sala, idDisciplina=999)).status_code == 404
    assert _criar(client, h, _corpo(prof, disc, sala, idProfessor=999)).status_code == 404
    assert _criar(client, h, _corpo(prof, disc, sala, idSala=999)).status_code == 404


# ----------------------------- conflito de horário -----------------------------

def test_conflito_de_sala_retorna_409_com_mensagem(client, db_session):
    prof1, prof2, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    assert _criar(client, h, _corpo(prof1, disc, sala_a)).status_code == 201

    resp = _criar(client, h, _corpo(prof2, disc, sala_a, codigo="MAT0101-T02",
                                    horarioInicio="09:00", horarioFim="11:00"))

    assert resp.status_code == 409
    assert resp.json()["detail"] == (
        "Conflito de horário: a sala A101 já está ocupada pela turma "
        "MAT0101-T01 (Segunda-feira, 08:00 às 10:00).")


def test_conflito_de_professor_retorna_409(client, db_session):
    prof1, _, disc, sala_a, sala_b = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    assert _criar(client, h, _corpo(prof1, disc, sala_a)).status_code == 201

    resp = _criar(client, h, _corpo(prof1, disc, sala_b, codigo="MAT0101-T02",
                                    horarioInicio="09:00", horarioFim="11:00"))

    assert resp.status_code == 409
    assert resp.json()["detail"].startswith("Conflito de horário: o professor Professor 1")
    assert "MAT0101-T01" in resp.json()["detail"]


def test_horarios_consecutivos_nao_conflitam(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    assert _criar(client, h, _corpo(prof1, disc, sala_a)).status_code == 201

    resp = _criar(client, h, _corpo(prof1, disc, sala_a, codigo="MAT0101-T02",
                                    horarioInicio="10:00", horarioFim="12:00"))

    assert resp.status_code == 201


def test_outro_dia_ou_outro_semestre_nao_conflita(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    assert _criar(client, h, _corpo(prof1, disc, sala_a)).status_code == 201

    outro_dia = _criar(client, h, _corpo(prof1, disc, sala_a, codigo="T02", diaSemana="Terça-feira"))
    outro_semestre = _criar(client, h, _corpo(prof1, disc, sala_a, codigo="T03", semestre="2026.2"))

    assert outro_dia.status_code == 201
    assert outro_semestre.status_code == 201


def test_turma_cancelada_nao_gera_conflito(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    assert _criar(client, h, _corpo(prof1, disc, sala_a, status="cancelada")).status_code == 201

    resp = _criar(client, h, _corpo(prof1, disc, sala_a, codigo="MAT0101-T02"))

    assert resp.status_code == 201


def test_editar_a_propria_turma_nao_conflita_consigo(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    turma = _criar(client, h, _corpo(prof1, disc, sala_a)).json()

    resp = client.put(f"/turmas/{turma['id']}", json=_corpo(prof1, disc, sala_a, vagas=35), headers=h)

    assert resp.status_code == 200
    assert resp.json()["vagas"] == 35


def test_editar_para_horario_de_outra_turma_retorna_409(client, db_session):
    prof1, prof2, disc, sala_a, sala_b = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    _criar(client, h, _corpo(prof1, disc, sala_a))
    outra = _criar(client, h, _corpo(prof2, disc, sala_b, codigo="MAT0101-T02",
                                     horarioInicio="14:00", horarioFim="16:00")).json()

    resp = client.put(f"/turmas/{outra['id']}",
                      json=_corpo(prof2, disc, sala_a, codigo="MAT0101-T02"), headers=h)

    assert resp.status_code == 409
    assert "a sala A101" in resp.json()["detail"]


# ----------------------------- validações -----------------------------

def test_horario_final_deve_ser_maior_que_o_inicial(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")

    igual = _criar(client, h, _corpo(prof1, disc, sala_a, horarioInicio="10:00", horarioFim="10:00"))
    invertido = _criar(client, h, _corpo(prof1, disc, sala_a, horarioInicio="10:00", horarioFim="08:00"))

    assert igual.status_code == 422
    assert invertido.status_code == 422
    assert "horário final" in invertido.json()["detail"]


def test_dia_status_e_vagas_invalidos_retornam_422(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")

    assert _criar(client, h, _corpo(prof1, disc, sala_a, diaSemana="Domingo")).status_code == 422
    assert _criar(client, h, _corpo(prof1, disc, sala_a, status="pendente")).status_code == 422
    assert _criar(client, h, _corpo(prof1, disc, sala_a, vagas=0)).status_code == 422


def test_nao_permite_reduzir_vagas_abaixo_dos_matriculados(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    turma = _criar(client, h, _corpo(prof1, disc, sala_a, vagas=5)).json()
    for n in (1, 2, 3):
        aluno = _aluno(db_session, n)
        db_session.add(MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=int(turma["id"])))
    db_session.commit()

    abaixo = client.put(f"/turmas/{turma['id']}", json=_corpo(prof1, disc, sala_a, vagas=2), headers=h)
    igual = client.put(f"/turmas/{turma['id']}", json=_corpo(prof1, disc, sala_a, vagas=3), headers=h)

    assert abaixo.status_code == 409
    assert "matriculado" in abaixo.json()["detail"]
    assert igual.status_code == 200


# ----------------------------- excluir -----------------------------

def test_excluir_turma_sem_matriculas(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    turma = _criar(client, h, _corpo(prof1, disc, sala_a)).json()

    assert client.delete(f"/turmas/{turma['id']}", headers=h).status_code == 204
    assert client.get(f"/turmas/{turma['id']}", headers=h).status_code == 404


def test_excluir_turma_com_matriculas_retorna_409(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    turma = _criar(client, h, _corpo(prof1, disc, sala_a)).json()
    aluno = _aluno(db_session, 1)
    db_session.add(MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=int(turma["id"]),
                                  situacao=SituacaoMatricula.trancado))
    db_session.commit()

    resp = client.delete(f"/turmas/{turma['id']}", headers=h)

    assert resp.status_code == 409
    assert "matrículas" in resp.json()["detail"]


def test_aluno_nao_exclui_turma(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    turma = _criar(client, _headers(client, "sec@sga.edu"), _corpo(prof1, disc, sala_a)).json()
    _aluno(db_session, 1)

    resp = client.delete(f"/turmas/{turma['id']}", headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 403


# ----------------------------- vagas -----------------------------

def test_somente_matriculado_ocupa_vaga(client, db_session):
    prof1, _, disc, sala_a, _ = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    turma = _criar(client, h, _corpo(prof1, disc, sala_a, vagas=10)).json()
    situacoes = [SituacaoMatricula.matriculado, SituacaoMatricula.matriculado,
                 SituacaoMatricula.trancado, SituacaoMatricula.aprovado]
    for n, situacao in enumerate(situacoes, start=1):
        aluno = _aluno(db_session, n)
        db_session.add(MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=int(turma["id"]), situacao=situacao))
    db_session.commit()

    vagas = client.get(f"/turmas/{turma['id']}/vagas", headers=h)
    lista = client.get("/turmas", headers=h)
    detalhe = client.get(f"/turmas/{turma['id']}", headers=h)

    assert vagas.status_code == 200
    assert vagas.json() == {"vagasTotais": 10, "vagasOcupadas": 2, "vagasDisponiveis": 8}
    assert lista.json()[0]["vagasOcupadas"] == 2
    assert detalhe.json()["vagasOcupadas"] == 2


def test_listagem_filtra_por_semestre_status_e_busca(client, db_session):
    prof1, prof2, disc, sala_a, sala_b = _cenario(db_session)
    h = _headers(client, "sec@sga.edu")
    _criar(client, h, _corpo(prof1, disc, sala_a))
    _criar(client, h, _corpo(prof2, disc, sala_b, codigo="MAT0101-T02", semestre="2026.2", status="fechada"))

    assert len(client.get("/turmas?semestre=2026.2", headers=h).json()) == 1
    assert len(client.get("/turmas?status=fechada", headers=h).json()) == 1
    assert len(client.get("/turmas?busca=Cálculo", headers=h).json()) == 2
    assert len(client.get("/turmas?limite=1", headers=h).json()) == 1
    assert client.get("/turmas?status=xyz", headers=h).status_code == 422
