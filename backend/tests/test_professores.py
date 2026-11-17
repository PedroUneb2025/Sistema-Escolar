from app.models.usuario import StatusUsuario
from tests.helpers import _aluno, _headers, _professor, _usuario


def _equipe(db):
    """Três professores e uma secretaria, coordenação e admin."""
    p1, p2, p3 = _professor(db, 1), _professor(db, 2), _professor(db, 3)
    p1.nome_completo, p1.titulacao = "Ana Beatriz", "Doutora"
    p2.nome_completo, p2.titulacao = "Carlos Eduardo", "Mestre"
    p3.nome_completo = "Zélia Souza"
    db.commit()
    _usuario(db, "sec@sga.edu", "SECRETARIA")
    _usuario(db, "coord@sga.edu", "COORDENACAO")
    _usuario(db, "adm@sga.edu", "ADMIN")
    return p1, p2, p3


def _corpo(**extra):
    corpo = {
        "email": "prof1@sga.edu",
        "matricula_funcional": "F0001",
        "nome_completo": "Professor 1",
        "cpf": "90000000001",
        "titulacao": "Mestre",
    }
    corpo.update(extra)
    return corpo


def _sec(client):
    return _headers(client, "sec@sga.edu")


# ----------------------------- GET /professores -----------------------------

def test_lista_traz_email_titulacao_e_status_sem_cpf(client, db_session):
    _equipe(db_session)

    resp = client.get("/professores", headers=_sec(client))

    assert resp.status_code == 200
    corpo = resp.json()
    assert [p["nome_completo"] for p in corpo] == ["Ana Beatriz", "Carlos Eduardo", "Zélia Souza"]
    assert set(corpo[0]) == {
        "id_professor", "nome_completo", "matricula_funcional", "email", "titulacao", "status"}
    assert corpo[0]["email"] == "prof1@sga.edu"
    assert corpo[0]["titulacao"] == "Doutora"
    assert corpo[0]["status"] == "ativo"
    assert corpo[2]["titulacao"] is None


def test_busca_por_nome_ignora_maiusculas_e_acha_trecho(client, db_session):
    _equipe(db_session)

    resp = client.get("/professores?busca=carlos", headers=_sec(client))

    assert [p["nome_completo"] for p in resp.json()] == ["Carlos Eduardo"]


def test_busca_por_matricula_funcional(client, db_session):
    _equipe(db_session)

    resp = client.get("/professores?busca=%20f0002%20", headers=_sec(client))

    assert [p["matricula_funcional"] for p in resp.json()] == ["F0002"]


def test_busca_sem_resultado_e_curinga_literal(client, db_session):
    _equipe(db_session)
    h = _sec(client)

    assert client.get("/professores?busca=inexistente", headers=h).json() == []
    # '%' é texto comum, não curinga: não casa com todo mundo.
    assert client.get("/professores?busca=%25", headers=h).json() == []
    assert len(client.get("/professores?busca=", headers=h).json()) == 3


def test_paginacao_com_limite_e_offset(client, db_session):
    _equipe(db_session)
    h = _sec(client)

    primeira = client.get("/professores?limite=2&offset=0", headers=h).json()
    segunda = client.get("/professores?limite=2&offset=2", headers=h).json()

    assert [p["nome_completo"] for p in primeira] == ["Ana Beatriz", "Carlos Eduardo"]
    assert [p["nome_completo"] for p in segunda] == ["Zélia Souza"]
    assert client.get("/professores?offset=50", headers=h).json() == []


def test_limite_maximo_e_valores_invalidos(client, db_session):
    _equipe(db_session)
    h = _sec(client)

    assert client.get("/professores?limite=500", headers=h).status_code == 200
    assert client.get("/professores?limite=501", headers=h).status_code == 422
    assert client.get("/professores?limite=0", headers=h).status_code == 422
    assert client.get("/professores?offset=-1", headers=h).status_code == 422


def test_filtro_por_status(client, db_session):
    _, p2, _ = _equipe(db_session)
    p2.usuario.status = StatusUsuario.inativo
    db_session.commit()
    h = _sec(client)

    inativos = client.get("/professores?status=inativo", headers=h).json()
    ativos = client.get("/professores?status=ativo", headers=h).json()
    todos = client.get("/professores", headers=h).json()

    assert [p["nome_completo"] for p in inativos] == ["Carlos Eduardo"]
    assert inativos[0]["status"] == "inativo"
    assert len(ativos) == 2
    assert len(todos) == 3
    assert client.get("/professores?status=xyz", headers=h).status_code == 422


def test_listagem_so_para_gestao(client, db_session):
    _equipe(db_session)
    _aluno(db_session, 1)

    for email in ("sec@sga.edu", "coord@sga.edu", "adm@sga.edu"):
        assert client.get("/professores", headers=_headers(client, email)).status_code == 200
    assert client.get("/professores", headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.get("/professores", headers=_headers(client, "prof1@sga.edu")).status_code == 403
    assert client.get("/professores").status_code == 401


# ----------------------------- GET /professores/{id} -----------------------------

def test_detalhe_do_professor_com_cpf(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.get(f"/professores/{p1.id_professor}", headers=_sec(client))

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["cpf"] == "90000000001"
    assert corpo["email"] == "prof1@sga.edu"
    assert corpo["id_usuario"] == p1.id_usuario
    assert corpo["status"] == "ativo"


def test_detalhe_inexistente_e_permissoes(client, db_session):
    p1, _, _ = _equipe(db_session)
    _aluno(db_session, 1)
    url = f"/professores/{p1.id_professor}"

    assert client.get("/professores/999", headers=_sec(client)).status_code == 404
    assert client.get(url, headers=_headers(client, "adm@sga.edu")).status_code == 200
    # O detalhe tem CPF: coordenação, professor e aluno não veem.
    assert client.get(url, headers=_headers(client, "coord@sga.edu")).status_code == 403
    assert client.get(url, headers=_headers(client, "prof1@sga.edu")).status_code == 403
    assert client.get(url, headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.get(url).status_code == 401


# ----------------------------- PUT /professores/{id} -----------------------------

def test_put_substitui_os_dados(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.put(
        f"/professores/{p1.id_professor}",
        json=_corpo(email="Novo@SGA.edu", matricula_funcional="F9999",
                    nome_completo="Ana B. Lima", cpf="123.456.789-09", titulacao="Pós-doutora"),
        headers=_sec(client),
    )

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["email"] == "novo@sga.edu"  # e-mail guardado em minúsculas
    assert corpo["matricula_funcional"] == "F9999"
    assert corpo["nome_completo"] == "Ana B. Lima"
    assert corpo["cpf"] == "12345678909"  # só os dígitos
    assert corpo["titulacao"] == "Pós-doutora"
    # A conta passou a usar o novo e-mail.
    assert client.post("/auth/login", data={"username": "novo@sga.edu", "password": "senha123"}).status_code == 200
    assert client.post("/auth/login", data={"username": "prof1@sga.edu", "password": "senha123"}).status_code == 401


def test_put_com_os_proprios_dados_nao_conflita_consigo(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.put(f"/professores/{p1.id_professor}", json=_corpo(titulacao=None), headers=_sec(client))

    assert resp.status_code == 200
    assert resp.json()["titulacao"] is None


def test_put_cpf_repetido_retorna_409(client, db_session):
    p1, p2, _ = _equipe(db_session)

    resp = client.put(f"/professores/{p1.id_professor}", json=_corpo(cpf=p2.cpf), headers=_sec(client))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "CPF já cadastrado"


def test_put_matricula_funcional_repetida_retorna_409(client, db_session):
    p1, p2, _ = _equipe(db_session)

    resp = client.put(
        f"/professores/{p1.id_professor}",
        json=_corpo(matricula_funcional=p2.matricula_funcional),
        headers=_sec(client),
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "Matrícula funcional já cadastrada"


def test_put_email_repetido_retorna_409(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.put(f"/professores/{p1.id_professor}", json=_corpo(email="PROF2@sga.edu"), headers=_sec(client))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "E-mail já cadastrado"


def test_put_duplicidade_nao_altera_nada(client, db_session):
    p1, p2, _ = _equipe(db_session)
    h = _sec(client)

    client.put(f"/professores/{p1.id_professor}",
               json=_corpo(nome_completo="Outro Nome", cpf=p2.cpf), headers=h)
    depois = client.get(f"/professores/{p1.id_professor}", headers=h).json()

    assert depois["nome_completo"] == "Ana Beatriz"
    assert depois["cpf"] == "90000000001"


def test_put_dados_invalidos_retornam_422(client, db_session):
    p1, _, _ = _equipe(db_session)
    h = _sec(client)
    url = f"/professores/{p1.id_professor}"

    assert client.put(url, json=_corpo(cpf="123"), headers=h).status_code == 422
    assert client.put(url, json=_corpo(email="nao-e-email"), headers=h).status_code == 422
    assert client.put(url, json=_corpo(nome_completo="Al"), headers=h).status_code == 422
    sem_cpf = _corpo()
    del sem_cpf["cpf"]
    assert client.put(url, json=sem_cpf, headers=h).status_code == 422


def test_put_inexistente_e_permissoes(client, db_session):
    p1, _, _ = _equipe(db_session)
    _aluno(db_session, 1)
    url = f"/professores/{p1.id_professor}"

    assert client.put("/professores/999", json=_corpo(), headers=_sec(client)).status_code == 404
    assert client.put(url, json=_corpo(), headers=_headers(client, "adm@sga.edu")).status_code == 200
    assert client.put(url, json=_corpo(), headers=_headers(client, "coord@sga.edu")).status_code == 403
    assert client.put(url, json=_corpo(), headers=_headers(client, "prof1@sga.edu")).status_code == 403
    assert client.put(url, json=_corpo(), headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.put(url, json=_corpo()).status_code == 401


# ----------------------------- PATCH /professores/{id} -----------------------------

def test_patch_altera_so_o_campo_enviado(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.patch(f"/professores/{p1.id_professor}", json={"titulacao": "Livre-docente"}, headers=_sec(client))

    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["titulacao"] == "Livre-docente"
    assert corpo["nome_completo"] == "Ana Beatriz"
    assert corpo["email"] == "prof1@sga.edu"
    assert corpo["cpf"] == "90000000001"


def test_patch_titulacao_nula_limpa_o_campo(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.patch(f"/professores/{p1.id_professor}", json={"titulacao": None}, headers=_sec(client))

    assert resp.status_code == 200
    assert resp.json()["titulacao"] is None


def test_patch_cpf_formatado_e_email(client, db_session):
    p1, _, _ = _equipe(db_session)

    resp = client.patch(
        f"/professores/{p1.id_professor}",
        json={"cpf": "111.222.333-44", "email": "Outro@SGA.edu"},
        headers=_sec(client),
    )

    assert resp.status_code == 200
    assert resp.json()["cpf"] == "11122233344"
    assert resp.json()["email"] == "outro@sga.edu"


def test_patch_duplicidade_retorna_409(client, db_session):
    p1, p2, _ = _equipe(db_session)
    h = _sec(client)
    url = f"/professores/{p1.id_professor}"

    assert client.patch(url, json={"cpf": p2.cpf}, headers=h).json()["detail"] == "CPF já cadastrado"
    assert client.patch(url, json={"matricula_funcional": p2.matricula_funcional}, headers=h).status_code == 409
    assert client.patch(url, json={"email": "prof2@sga.edu"}, headers=h).status_code == 409
    # Reenviar o próprio valor não é duplicidade.
    assert client.patch(url, json={"matricula_funcional": p1.matricula_funcional}, headers=h).status_code == 200


def test_patch_vazio_ou_com_campo_obrigatorio_nulo_retorna_422(client, db_session):
    p1, _, _ = _equipe(db_session)
    h = _sec(client)
    url = f"/professores/{p1.id_professor}"

    assert client.patch(url, json={}, headers=h).status_code == 422
    assert client.patch(url, json={"nome_completo": None}, headers=h).status_code == 422
    assert client.patch(url, json={"cpf": "12"}, headers=h).status_code == 422


def test_patch_permissoes_e_404(client, db_session):
    p1, _, _ = _equipe(db_session)
    _aluno(db_session, 1)
    url = f"/professores/{p1.id_professor}"
    corpo = {"titulacao": "Mestre"}

    assert client.patch("/professores/999", json=corpo, headers=_sec(client)).status_code == 404
    assert client.patch(url, json=corpo, headers=_headers(client, "coord@sga.edu")).status_code == 403
    assert client.patch(url, json=corpo, headers=_headers(client, "prof1@sga.edu")).status_code == 403
    assert client.patch(url, json=corpo, headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.patch(url, json=corpo).status_code == 401


# ----------------------------- PATCH /professores/{id}/status -----------------------------

def test_inativar_professor_bloqueia_login_e_token(client, db_session):
    p1, _, _ = _equipe(db_session)
    token_antigo = _headers(client, "prof1@sga.edu")
    assert client.get("/auth/me", headers=token_antigo).status_code == 200

    resp = client.patch(f"/professores/{p1.id_professor}/status", json={"status": "inativo"}, headers=_sec(client))

    assert resp.status_code == 200
    assert resp.json()["status"] == "inativo"
    # Inativo não entra: nem logando de novo, nem com o token que já tinha.
    assert client.post("/auth/login", data={"username": "prof1@sga.edu", "password": "senha123"}).status_code == 401
    assert client.get("/auth/me", headers=token_antigo).status_code == 401


def test_reativar_professor_libera_o_login(client, db_session):
    p1, _, _ = _equipe(db_session)
    h = _sec(client)
    url = f"/professores/{p1.id_professor}/status"
    client.patch(url, json={"status": "inativo"}, headers=h)

    resp = client.patch(url, json={"status": "ativo"}, headers=h)

    assert resp.status_code == 200
    assert resp.json()["status"] == "ativo"
    assert client.post("/auth/login", data={"username": "prof1@sga.edu", "password": "senha123"}).status_code == 200


def test_status_aparece_na_listagem_e_no_detalhe(client, db_session):
    p1, _, _ = _equipe(db_session)
    h = _sec(client)
    client.patch(f"/professores/{p1.id_professor}/status", json={"status": "inativo"}, headers=h)

    lista = client.get("/professores?status=inativo", headers=h).json()
    detalhe = client.get(f"/professores/{p1.id_professor}", headers=h).json()

    assert [p["id_professor"] for p in lista] == [p1.id_professor]
    assert detalhe["status"] == "inativo"


def test_status_invalido_retorna_422(client, db_session):
    p1, _, _ = _equipe(db_session)
    url = f"/professores/{p1.id_professor}/status"
    h = _sec(client)

    assert client.patch(url, json={"status": "bloqueado"}, headers=h).status_code == 422
    assert client.patch(url, json={"status": "xyz"}, headers=h).status_code == 422
    assert client.patch(url, json={}, headers=h).status_code == 422


def test_conta_bloqueada_nao_e_alterada_por_aqui(client, db_session):
    p1, _, _ = _equipe(db_session)
    p1.usuario.status = StatusUsuario.bloqueado
    db_session.commit()

    resp = client.patch(f"/professores/{p1.id_professor}/status", json={"status": "ativo"}, headers=_sec(client))

    assert resp.status_code == 409
    assert "bloqueada" in resp.json()["detail"]


def test_status_permissoes_e_404(client, db_session):
    p1, _, _ = _equipe(db_session)
    _aluno(db_session, 1)
    url = f"/professores/{p1.id_professor}/status"
    corpo = {"status": "inativo"}

    assert client.patch("/professores/999/status", json=corpo, headers=_sec(client)).status_code == 404
    assert client.patch(url, json=corpo, headers=_headers(client, "coord@sga.edu")).status_code == 403
    assert client.patch(url, json=corpo, headers=_headers(client, "aluno1@sga.edu")).status_code == 403
    assert client.patch(url, json=corpo).status_code == 401
    assert client.patch(url, json=corpo, headers=_headers(client, "adm@sga.edu")).status_code == 200
