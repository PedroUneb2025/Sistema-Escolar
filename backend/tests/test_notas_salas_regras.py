import pytest
from app.services.turma_regras import RegraTurmaError
from app.services import notas_regras as n, sala_regras as s


def codigo(fn, *a):
    with pytest.raises(RegraTurmaError) as e:
        fn(*a)
    return e.value.status_code


@pytest.mark.parametrize("nota,freq", [(-1, 50), (10.1, 50), (5, -1), (5, 100.5)])
def test_nota_frequencia_fora_da_faixa(nota, freq):
    assert codigo(n.validar_nota_frequencia, nota, freq) == 422


def test_nota_frequencia_limites_e_none():
    n.validar_nota_frequencia(0, 0)
    n.validar_nota_frequencia(10, 100)
    n.validar_nota_frequencia(None, 80)


def test_matricula_de_outra_turma_404():
    assert codigo(n.validar_matricula_editavel, 2, 1, "matriculado") == 404


def test_matricula_trancada_409():
    assert codigo(n.validar_matricula_editavel, 1, 1, n.SITUACAO_TRANCADA) == 409


def test_matricula_ok():
    n.validar_matricula_editavel(1, 1, "matriculado")


def test_permissoes():
    assert n.pode_lancar_nota(["PROFESSOR"], True)
    assert not n.pode_lancar_nota(["PROFESSOR"], False)
    assert n.pode_lancar_nota(["secretaria"], False)
    assert n.pode_lancar_nota(["ADMIN"], False)
    assert not n.pode_lancar_nota(["ALUNO"], False)
    assert not n.pode_lancar_nota(["COORDENACAO"], False)
    assert codigo(n.exigir_permissao_nota, ["ALUNO"], False) == 403


def test_situacao_sugerida():
    assert n.situacao_sugerida(7.0, 75) == "aprovado"
    assert n.situacao_sugerida(6.9, 90) == "reprovado"
    assert n.situacao_sugerida(8, 74.9) == "reprovado"
    assert n.situacao_sugerida(None, 90) is None
    assert n.situacao_sugerida(8, None) is None


def test_resumo():
    r = n.resumo_turma([
        {"nota_final": 8, "frequencia": 90, "situacao": "matriculado"},
        {"nota_final": 6, "frequencia": 70, "situacao": "matriculado"},
        {"nota_final": None, "frequencia": None, "situacao": "trancado"},
    ])
    assert r == {"totalAlunos": 3, "mediaNotas": 7.0, "frequenciaMedia": 80.0,
                 "contagemPorSituacao": {"matriculado": 2, "trancado": 1}}


def test_resumo_vazio():
    r = n.resumo_turma([])
    assert r["totalAlunos"] == 0 and r["mediaNotas"] is None


def test_sala():
    s.validar_sala("A101", 40)
    assert codigo(s.validar_sala, "", 40) == 422
    assert codigo(s.validar_sala, "X" * 21, 40) == 422
    assert codigo(s.validar_sala, "A101", 0) == 422
    s.validar_exclusao_sala(0)
    assert codigo(s.validar_exclusao_sala, 2) == 409
