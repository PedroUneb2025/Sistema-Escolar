# Destino: backend/tests/test_alunos.py
import pytest

from tests.helpers import _aluno, _headers, _professor, _usuario

SENHA_PADRAO = "senha123"  # a mesma senha que o _usuario() dos helpers grava

CORPO_VALIDO = {
    "matricula": "NOVA-1",
    "nome_completo": "Aluno Editado",
    "cpf": "529.982.247-25",
    "data_nascimento": "2001-02-03",
    "telefone": "71999990000",
}


def _login(client, email, senha=SENHA_PADRAO):
    return client.post("/auth/login", data={"username": email, "password": senha})


def _gestor(client, db_session):
    _usuario(db_session, "sec@sga.edu", "SECRETARIA")
    return _headers(client, "sec@sga.edu")


# ----------------------------- HU-03: consultar -----------------------------

def test_gestor_consulta_aluno_com_cpf(client, db_session):
    aluno = _aluno(db_session, 1)
    resp = client.get(f"/alunos/{aluno.id_aluno}", headers=_gestor(client, db_session))

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["email"] == "aluno1@sga.edu"
    assert corpo["status"] == "ativo"
    assert corpo["cpf"] == aluno.cpf


def test_aluno_consulta_proprio_perfil(client, db_session):
    aluno = _aluno(db_session, 1)
    resp = client.get("/alunos/me", headers=_headers(client, "aluno1@sga.edu"))
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["email"] == "aluno1@sga.edu"
    assert corpo["matricula"] == aluno.matricula
    assert corpo["nome_completo"] == aluno.nome_completo


def test_aluno_e_professor_recebem_403(client, db_session):
    aluno = _aluno(db_session, 1)
    _professor(db_session, 1)
    url = f"/alunos/{aluno.id_aluno}"

    for email in ("aluno1@sga.edu", "prof1@sga.edu"):
        h = _headers(client, email)
        assert client.get(url, headers=h).status_code == 403
        assert client.put(url, json=CORPO_VALIDO, headers=h).status_code == 403
        assert client.patch(f"{url}/status", json={"status": "bloqueado"}, headers=h).status_code == 403


def test_aluno_inexistente_retorna_404(client, db_session):
    h = _gestor(client, db_session)
    assert client.get("/alunos/9999", headers=h).status_code == 404
    assert client.put("/alunos/9999", json=CORPO_VALIDO, headers=h).status_code == 404
    assert client.patch("/alunos/9999/status", json={"status": "inativo"}, headers=h).status_code == 404


# ----------------------------- HU-03: editar -----------------------------

def test_editar_aluno_salva_e_nao_muda_email(client, db_session):
    aluno = _aluno(db_session, 1)
    resp = client.put(f"/alunos/{aluno.id_aluno}", json=CORPO_VALIDO, headers=_gestor(client, db_session))

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["matricula"] == "NOVA-1"
    assert corpo["nome_completo"] == "Aluno Editado"
    assert corpo["cpf"] == "52998224725"  # sÃ³ os dÃ­gitos
    assert corpo["email"] == "aluno1@sga.edu"


def test_editar_mantendo_proprio_cpf_e_matricula_nao_da_409(client, db_session):
    aluno = _aluno(db_session, 1)
    corpo = {**CORPO_VALIDO, "cpf": aluno.cpf, "matricula": aluno.matricula}
    resp = client.put(f"/alunos/{aluno.id_aluno}", json=corpo, headers=_gestor(client, db_session))
    assert resp.status_code == 200


def test_cpf_ou_matricula_duplicados_retornam_409(client, db_session):
    a1 = _aluno(db_session, 1)
    a2 = _aluno(db_session, 2)
    h = _gestor(client, db_session)

    com_cpf_de_a2 = {**CORPO_VALIDO, "cpf": a2.cpf}
    assert client.put(f"/alunos/{a1.id_aluno}", json=com_cpf_de_a2, headers=h).status_code == 409

    com_matricula_de_a2 = {**CORPO_VALIDO, "matricula": a2.matricula}
    assert client.put(f"/alunos/{a1.id_aluno}", json=com_matricula_de_a2, headers=h).status_code == 409


def test_cpf_invalido_retorna_422(client, db_session):
    aluno = _aluno(db_session, 1)
    corpo = {**CORPO_VALIDO, "cpf": "123"}
    resp = client.put(f"/alunos/{aluno.id_aluno}", json=corpo, headers=_gestor(client, db_session))
    assert resp.status_code == 422


# ----------------------------- HU-04: status -----------------------------

@pytest.mark.parametrize("novo_status", ["inativo", "bloqueado"])
def test_inativar_ou_bloquear_impede_login_e_derruba_token(client, db_session, novo_status):
    aluno = _aluno(db_session, 1)
    h_gestor = _gestor(client, db_session)
    h_aluno = _headers(client, "aluno1@sga.edu")
    assert client.get("/auth/me", headers=h_aluno).status_code == 200

    resp = client.patch(f"/alunos/{aluno.id_aluno}/status", json={"status": novo_status}, headers=h_gestor)

    assert resp.status_code == 200
    assert resp.json()["status"] == novo_status
    assert _login(client, "aluno1@sga.edu").status_code == 401
    assert client.get("/auth/me", headers=h_aluno).status_code == 401  # token jÃ¡ emitido


def test_reativar_devolve_o_acesso(client, db_session):
    aluno = _aluno(db_session, 1)
    h_gestor = _gestor(client, db_session)
    h_aluno = _headers(client, "aluno1@sga.edu")
    url = f"/alunos/{aluno.id_aluno}/status"

    client.patch(url, json={"status": "bloqueado"}, headers=h_gestor)
    assert _login(client, "aluno1@sga.edu").status_code == 401

    assert client.patch(url, json={"status": "ativo"}, headers=h_gestor).status_code == 200
    assert _login(client, "aluno1@sga.edu").status_code == 200
    assert client.get("/auth/me", headers=h_aluno).status_code == 200


def test_status_invalido_retorna_422(client, db_session):
    aluno = _aluno(db_session, 1)
    resp = client.patch(
        f"/alunos/{aluno.id_aluno}/status", json={"status": "suspenso"}, headers=_gestor(client, db_session)
    )
    assert resp.status_code == 422


def test_lista_de_alunos_mostra_o_status(client, db_session):
    aluno = _aluno(db_session, 1)
    h = _gestor(client, db_session)
    client.patch(f"/alunos/{aluno.id_aluno}/status", json={"status": "bloqueado"}, headers=h)

    resp = client.get("/relatorios/alunos", headers=h)

    assert resp.status_code == 200
    assert resp.json()[0]["status"] == "bloqueado"
    assert "cpf" not in resp.json()[0]
