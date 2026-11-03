import pytest
from app.services.turma_regras import (
    Agenda, RegraTurmaError, achar_conflito, calcular_vagas, sobrepoe,
    validar_conflito, validar_dia_e_status, validar_exclusao,
    validar_horario, validar_vagas,
)

BASE = dict(semestre="2026.1", dia_semana="Segunda-feira",
            inicio="08:00", fim="10:00", id_sala=1, id_professor=1,
            sala="A101", professor="Ana", codigo="MAT0101-T01", id_turma=1)


def ag(**kw):
    return Agenda(**{**BASE, **kw})


def nova(**kw):
    return ag(**{"codigo": "NOVA", "id_turma": None, "id_sala": 2,
                 "id_professor": 2, "sala": "B202", "professor": "Bia", **kw})


def test_sobreposicao():
    assert sobrepoe("08:00", "10:00", "09:00", "11:00")
    assert sobrepoe("08:00", "12:00", "09:00", "10:00")  # contida
    assert not sobrepoe("08:00", "10:00", "10:00", "12:00")  # encostado
    assert not sobrepoe("10:00", "12:00", "08:00", "10:00")


def test_conflito_mesma_sala_mensagem_exata():
    msg = achar_conflito(nova(id_sala=1, sala="A101"), [ag()])
    assert msg == ("Conflito de horário: a sala A101 já está ocupada pela "
                   "turma MAT0101-T01 (Segunda-feira, 08:00 às 10:00).")


def test_conflito_mesmo_professor():
    msg = achar_conflito(nova(id_professor=1), [ag()])
    assert msg.startswith("Conflito de horário: o professor Ana")
    assert "MAT0101-T01" in msg


def test_sem_conflito_horario_encostado():
    assert achar_conflito(nova(id_sala=1, id_professor=1,
                               inicio="10:00", fim="12:00"), [ag()]) is None


def test_sem_conflito_outro_dia_ou_semestre():
    assert achar_conflito(nova(id_sala=1, dia_semana="Terça-feira"), [ag()]) is None
    assert achar_conflito(nova(id_sala=1, semestre="2026.2"), [ag()]) is None


def test_sem_conflito_sala_e_professor_diferentes():
    assert achar_conflito(nova(), [ag()]) is None


def test_ignora_cancelada():
    assert achar_conflito(nova(id_sala=1), [ag(status="cancelada")]) is None


def test_fechada_ainda_conflita():
    assert achar_conflito(nova(id_sala=1), [ag(status="fechada")]) is not None


def test_edicao_ignora_a_propria_turma():
    editando = nova(id_turma=1, id_sala=1, id_professor=1)
    assert achar_conflito(editando, [ag()]) is None


def test_validar_conflito_levanta_409():
    with pytest.raises(RegraTurmaError) as e:
        validar_conflito(nova(id_sala=1), [ag()])
    assert e.value.status_code == 409
    assert "Conflito de horário" in e.value.detail


@pytest.mark.parametrize("ini,fim", [("10:00", "10:00"), ("10:00", "08:00")])
def test_horario_final_invalido_422(ini, fim):
    with pytest.raises(RegraTurmaError) as e:
        validar_horario(ini, fim)
    assert e.value.status_code == 422


@pytest.mark.parametrize("v", ["25:00", "abc", "08:60", None])
def test_hora_malformada_422(v):
    with pytest.raises(RegraTurmaError) as e:
        validar_horario(v, "12:00")
    assert e.value.status_code == 422


def test_horario_valido():
    validar_horario("08:00", "10:00")


def test_dia_e_status():
    validar_dia_e_status("Sábado", "aberta")
    with pytest.raises(RegraTurmaError):
        validar_dia_e_status("Domingo", "aberta")
    with pytest.raises(RegraTurmaError):
        validar_dia_e_status("Sábado", "pendente")


def test_vagas():
    validar_vagas(30, 30)
    with pytest.raises(RegraTurmaError) as e:
        validar_vagas(20, 25)
    assert e.value.status_code == 409
    with pytest.raises(RegraTurmaError) as e:
        validar_vagas(0)
    assert e.value.status_code == 422


def test_exclusao():
    validar_exclusao(0)
    with pytest.raises(RegraTurmaError) as e:
        validar_exclusao(3)
    assert e.value.status_code == 409


def test_calcular_vagas():
    assert calcular_vagas(40, 28) == {
        "vagasTotais": 40, "vagasOcupadas": 28, "vagasDisponiveis": 12}
    assert calcular_vagas(10, 12)["vagasDisponiveis"] == 0
