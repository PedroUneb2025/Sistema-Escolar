from datetime import time

from app.models.prerequisito import DisciplinaPrerequisito
from app.models.turma import MatriculaTurma, SituacaoMatricula
from tests.helpers import _aluno, _disciplina, _headers, _professor, _turma, _usuario


def _exigir(db, disciplina, prerequisito):
    db.add(DisciplinaPrerequisito(id_disciplina=disciplina.id_disciplina, id_prerequisito=prerequisito.id_disciplina))
    db.commit()


def _historico(db, aluno, professor, disciplina, situacao, codigo):
    """Cria uma turma (semestre passado) da disciplina e uma matrícula do aluno nela."""
    turma = _turma(db, professor, codigo, disciplina=disciplina, semestre="2025.2")
    db.add(MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=turma.id_turma, situacao=situacao))
    db.commit()


# ------------------------ validação na matrícula ------------------------

def test_matricula_bloqueada_sem_prerequisito(client, db_session):
    _aluno(db_session, 1)
    prof = _professor(db_session, 1)
    calc1 = _disciplina(db_session, "CALC1", "Cálculo I")
    calc2 = _disciplina(db_session, "CALC2", "Cálculo II")
    _exigir(db_session, calc2, calc1)
    turma = _turma(db_session, prof, "T-CALC2", disciplina=calc2)

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 409
    assert "Pré-requisitos não cumpridos" in resp.json()["detail"]
    assert "Cálculo I" in resp.json()["detail"]


def test_matricula_liberada_com_prerequisito_aprovado(client, db_session):
    aluno = _aluno(db_session, 1)
    prof = _professor(db_session, 1)
    calc1 = _disciplina(db_session, "CALC1", "Cálculo I")
    calc2 = _disciplina(db_session, "CALC2", "Cálculo II")
    _exigir(db_session, calc2, calc1)
    _historico(db_session, aluno, prof, calc1, SituacaoMatricula.aprovado, "T-CALC1-2025")
    turma = _turma(db_session, prof, "T-CALC2", disciplina=calc2)

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 201


def test_so_aprovado_conta_como_prerequisito_cumprido(client, db_session):
    prof = _professor(db_session, 1)
    calc1 = _disciplina(db_session, "CALC1", "Cálculo I")
    calc2 = _disciplina(db_session, "CALC2", "Cálculo II")
    _exigir(db_session, calc2, calc1)

    # cada aluno parte de uma situação diferente na disciplina pré-requisito
    situacoes = {
        1: SituacaoMatricula.matriculado,  # ainda cursando
        2: SituacaoMatricula.reprovado_nota,
        3: SituacaoMatricula.reprovado_falta,
        4: SituacaoMatricula.trancado,
    }
    alunos = {n: _aluno(db_session, n) for n in situacoes}
    for n, situacao in situacoes.items():
        _historico(db_session, alunos[n], prof, calc1, situacao, f"T-CALC1-{n}")
    turma = _turma(db_session, prof, "T-CALC2", disciplina=calc2)

    for n in situacoes:
        resp = client.post(
            "/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, f"aluno{n}@sga.edu")
        )
        assert resp.status_code == 409, f"aluno {n} ({situacoes[n].value}) não deveria passar"


def test_lista_apenas_os_prerequisitos_que_faltam(client, db_session):
    aluno = _aluno(db_session, 1)
    prof = _professor(db_session, 1)
    a = _disciplina(db_session, "A", "Algoritmos")
    b = _disciplina(db_session, "B", "Banco de Dados")
    c = _disciplina(db_session, "C", "Compiladores")
    _exigir(db_session, c, a)
    _exigir(db_session, c, b)
    _historico(db_session, aluno, prof, a, SituacaoMatricula.aprovado, "T-A")  # só cumpriu A
    turma = _turma(db_session, prof, "T-C", disciplina=c)

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 409
    detalhe = resp.json()["detail"]
    assert "Banco de Dados" in detalhe
    assert "Algoritmos" not in detalhe


def test_disciplina_sem_prerequisito_nao_e_bloqueada(client, db_session):
    _aluno(db_session, 1)
    turma = _turma(db_session, _professor(db_session, 1), "T-LIVRE")

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno1@sga.edu"))

    assert resp.status_code == 201


# ------------------------ regra de vagas (mesma do DBA) ------------------------

def test_matricula_trancada_libera_a_vaga(client, db_session):
    a1 = _aluno(db_session, 1)
    _aluno(db_session, 2)
    prof = _professor(db_session, 1)
    turma = _turma(db_session, prof, "T1", vagas=1)
    db_session.add(MatriculaTurma(id_aluno=a1.id_aluno, id_turma=turma.id_turma, situacao=SituacaoMatricula.trancado))
    db_session.commit()

    resp = client.post("/matriculas", json={"id_turma": turma.id_turma}, headers=_headers(client, "aluno2@sga.edu"))

    assert resp.status_code == 201


# ------------------------ CRUD de pré-requisitos ------------------------

def test_secretaria_gerencia_prerequisitos(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    calc1 = _disciplina(db_session, "CALC1", "Cálculo I")
    calc2 = _disciplina(db_session, "CALC2", "Cálculo II")

    criado = client.post(
        f"/disciplinas/{calc2.id_disciplina}/prerequisitos", json={"id_prerequisito": calc1.id_disciplina}, headers=h
    )
    assert criado.status_code == 201

    lista = client.get(f"/disciplinas/{calc2.id_disciplina}/prerequisitos", headers=h)
    assert lista.status_code == 200
    assert [d["codigo"] for d in lista.json()] == ["CALC1"]

    removido = client.delete(f"/disciplinas/{calc2.id_disciplina}/prerequisitos/{calc1.id_disciplina}", headers=h)
    assert removido.status_code == 204
    assert client.get(f"/disciplinas/{calc2.id_disciplina}/prerequisitos", headers=h).json() == []


def test_prerequisito_duplicado_retorna_409(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    a = _disciplina(db_session, "A")
    b = _disciplina(db_session, "B")
    url = f"/disciplinas/{b.id_disciplina}/prerequisitos"

    assert client.post(url, json={"id_prerequisito": a.id_disciplina}, headers=h).status_code == 201
    assert client.post(url, json={"id_prerequisito": a.id_disciplina}, headers=h).status_code == 409


def test_disciplina_nao_pode_ser_prerequisito_de_si_mesma(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    a = _disciplina(db_session, "A")

    resp = client.post(
        f"/disciplinas/{a.id_disciplina}/prerequisitos",
        json={"id_prerequisito": a.id_disciplina},
        headers=_headers(client, "sec@sga.edu"),
    )

    assert resp.status_code == 400


def test_ciclo_direto_e_bloqueado(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    a = _disciplina(db_session, "A")
    b = _disciplina(db_session, "B")

    # B exige A; agora A exigir B fecharia o ciclo
    assert client.post(
        f"/disciplinas/{b.id_disciplina}/prerequisitos", json={"id_prerequisito": a.id_disciplina}, headers=h
    ).status_code == 201
    resp = client.post(
        f"/disciplinas/{a.id_disciplina}/prerequisitos", json={"id_prerequisito": b.id_disciplina}, headers=h
    )

    assert resp.status_code == 409
    assert "ciclo" in resp.json()["detail"]


def test_ciclo_indireto_e_bloqueado(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    a = _disciplina(db_session, "A")
    b = _disciplina(db_session, "B")
    c = _disciplina(db_session, "C")

    # B exige A, C exige B  =>  A exigir C fecharia A -> C -> B -> A
    client.post(f"/disciplinas/{b.id_disciplina}/prerequisitos", json={"id_prerequisito": a.id_disciplina}, headers=h)
    client.post(f"/disciplinas/{c.id_disciplina}/prerequisitos", json={"id_prerequisito": b.id_disciplina}, headers=h)
    resp = client.post(
        f"/disciplinas/{a.id_disciplina}/prerequisitos", json={"id_prerequisito": c.id_disciplina}, headers=h
    )

    assert resp.status_code == 409


def test_dois_prerequisitos_independentes_nao_formam_ciclo(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    a = _disciplina(db_session, "A")
    b = _disciplina(db_session, "B")
    c = _disciplina(db_session, "C")

    # losango: C exige A e B; B exige A. Não é ciclo.
    assert client.post(f"/disciplinas/{b.id_disciplina}/prerequisitos", json={"id_prerequisito": a.id_disciplina}, headers=h).status_code == 201
    assert client.post(f"/disciplinas/{c.id_disciplina}/prerequisitos", json={"id_prerequisito": a.id_disciplina}, headers=h).status_code == 201
    assert client.post(f"/disciplinas/{c.id_disciplina}/prerequisitos", json={"id_prerequisito": b.id_disciplina}, headers=h).status_code == 201


def test_aluno_nao_gerencia_prerequisitos_mas_pode_ver(client, db_session):
    _aluno(db_session, 1)
    h = _headers(client, "aluno1@sga.edu")
    a = _disciplina(db_session, "A")
    b = _disciplina(db_session, "B")

    negado = client.post(
        f"/disciplinas/{b.id_disciplina}/prerequisitos", json={"id_prerequisito": a.id_disciplina}, headers=h
    )
    assert negado.status_code == 403
    assert client.get(f"/disciplinas/{b.id_disciplina}/prerequisitos", headers=h).status_code == 200


def test_prerequisito_com_disciplina_inexistente_retorna_404(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    h = _headers(client, "sec@sga.edu")
    a = _disciplina(db_session, "A")

    assert client.post(f"/disciplinas/{a.id_disciplina}/prerequisitos", json={"id_prerequisito": 9999}, headers=h).status_code == 404
    assert client.post("/disciplinas/9999/prerequisitos", json={"id_prerequisito": a.id_disciplina}, headers=h).status_code == 404
