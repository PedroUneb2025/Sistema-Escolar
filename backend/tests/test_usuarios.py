import pytest

from app.models.rbac import Perfil
from tests.helpers import _aluno, _headers, _usuario

ALUNO_OK = {
    "email": "Novo.Aluno@uneb.br",
    "senha": "Senha@123",
    "matricula": "20269999",
    "nome_completo": "Maria da Silva",
    "cpf": "123.456.789-09",
    "data_nascimento": "2001-05-20",
    "telefone": "71999990000",
}

PROFESSOR_OK = {
    "email": "novo.prof@uneb.br",
    "senha": "Senha@123",
    "matricula_funcional": "F9999",
    "nome_completo": "João Pereira",
    "cpf": "98765432100",
    "titulacao": "Doutor",
}


@pytest.fixture(autouse=True)
def perfis_base(db_session):
    """Em produção quem cria os perfis é o seed; nos testes criamos aqui."""
    for nome in ["ADMIN", "SECRETARIA", "COORDENACAO", "PROFESSOR", "ALUNO", "FINANCEIRO"]:
        db_session.add(Perfil(nome=nome))
    db_session.commit()


def _login(client, email: str, senha: str = "Senha@123"):
    return client.post("/auth/login", data={"username": email, "password": senha})


# --------------------------- cadastro de aluno ---------------------------

def test_secretaria_cadastra_aluno_e_ele_consegue_logar(client, db_session):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")

    resp = client.post("/usuarios/alunos", json=ALUNO_OK, headers=_headers(client, "sec@uneb.br"))

    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["perfis"] == ["ALUNO"]
    assert corpo["id_aluno"] is not None
    assert corpo["email"] == "novo.aluno@uneb.br"  # normalizado para minúsculas
    assert "senha" not in corpo and "senha_hash" not in corpo

    # o ponto principal: a conta criada loga de verdade, como o front faz
    login = _login(client, "novo.aluno@uneb.br")
    assert login.status_code == 200
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert me.status_code == 200
    assert me.json()["perfis"] == ["ALUNO"]
    assert me.json()["status"] == "ativo"


def test_aluno_cadastrado_enxerga_suas_matriculas(client, db_session):
    """Prova que o registro de aluno ficou ligado à conta (senão /minhas dá 404)."""
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    client.post("/usuarios/alunos", json=ALUNO_OK, headers=_headers(client, "sec@uneb.br"))

    token = _login(client, "novo.aluno@uneb.br").json()["access_token"]
    resp = client.get("/matriculas/minhas", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_cpf_com_ou_sem_pontuacao_vira_so_digitos(client, db_session):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    client.post("/usuarios/alunos", json=ALUNO_OK, headers=_headers(client, "sec@uneb.br"))

    # mesmo CPF escrito sem pontuação deve ser reconhecido como duplicado
    outro = {**ALUNO_OK, "email": "outro@uneb.br", "matricula": "20268888", "cpf": "12345678909"}
    resp = client.post("/usuarios/alunos", json=outro, headers=_headers(client, "sec@uneb.br"))
    assert resp.status_code == 409
    assert "CPF" in resp.json()["detail"]


def test_email_e_matricula_duplicados_retornam_409(client, db_session):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    h = _headers(client, "sec@uneb.br")
    assert client.post("/usuarios/alunos", json=ALUNO_OK, headers=h).status_code == 201

    mesmo_email = {**ALUNO_OK, "matricula": "20268888", "cpf": "11122233344"}
    r1 = client.post("/usuarios/alunos", json=mesmo_email, headers=h)
    assert r1.status_code == 409 and "E-mail" in r1.json()["detail"]

    mesma_matricula = {**ALUNO_OK, "email": "x@uneb.br", "cpf": "11122233344"}
    r2 = client.post("/usuarios/alunos", json=mesma_matricula, headers=h)
    assert r2.status_code == 409 and "Matrícula" in r2.json()["detail"]


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("senha", "curta"),            # menos de 8 caracteres
        ("email", "nao-e-email"),
        ("cpf", "123"),
        ("data_nascimento", "20/05/2001"),
        ("nome_completo", "Ab"),
    ],
)
def test_dados_invalidos_retornam_422(client, db_session, campo, valor):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    resp = client.post("/usuarios/alunos", json={**ALUNO_OK, campo: valor}, headers=_headers(client, "sec@uneb.br"))
    assert resp.status_code == 422


def test_falha_no_cadastro_nao_deixa_conta_pela_metade(client, db_session):
    """Se o aluno não pode ser criado, a conta (usuario) também não pode ficar."""
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    h = _headers(client, "sec@uneb.br")
    client.post("/usuarios/alunos", json=ALUNO_OK, headers=h)
    duplicado = {**ALUNO_OK, "email": "fantasma@uneb.br"}  # mesma matrícula/CPF
    assert client.post("/usuarios/alunos", json=duplicado, headers=h).status_code == 409

    assert _login(client, "fantasma@uneb.br").status_code == 401


# --------------------------- cadastro de professor ---------------------------

def test_admin_cadastra_professor_e_ele_loga(client, db_session):
    _usuario(db_session, "adm@uneb.br", "ADMIN")

    resp = client.post("/usuarios/professores", json=PROFESSOR_OK, headers=_headers(client, "adm@uneb.br"))

    assert resp.status_code == 201
    assert resp.json()["perfis"] == ["PROFESSOR"]
    assert resp.json()["id_professor"] is not None
    login = _login(client, "novo.prof@uneb.br")
    assert login.status_code == 200


def test_professor_duplicado_retorna_409(client, db_session):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    h = _headers(client, "sec@uneb.br")
    assert client.post("/usuarios/professores", json=PROFESSOR_OK, headers=h).status_code == 201
    assert client.post("/usuarios/professores", json=PROFESSOR_OK, headers=h).status_code == 409


# --------------------------- permissões ---------------------------

def test_sem_token_retorna_401(client):
    assert client.post("/usuarios/alunos", json=ALUNO_OK).status_code == 401


def test_aluno_e_professor_nao_cadastram_ninguem(client, db_session):
    _aluno(db_session, 1)
    _usuario(db_session, "prof@uneb.br", "PROFESSOR")

    for email in ("aluno1@sga.edu", "prof@uneb.br"):
        h = _headers(client, email)
        assert client.post("/usuarios/alunos", json=ALUNO_OK, headers=h).status_code == 403
        assert client.post("/usuarios/professores", json=PROFESSOR_OK, headers=h).status_code == 403


# --------------------------- funcionários (só admin) ---------------------------

FUNCIONARIO_OK = {"email": "nova.sec@uneb.br", "senha": "Senha@123", "perfis": ["SECRETARIA"]}


def test_admin_cria_secretaria_que_ja_pode_gerir_curriculo(client, db_session):
    _usuario(db_session, "adm@uneb.br", "ADMIN")

    criado = client.post("/usuarios/funcionarios", json=FUNCIONARIO_OK, headers=_headers(client, "adm@uneb.br"))
    assert criado.status_code == 201
    assert criado.json()["perfis"] == ["SECRETARIA"]

    # a nova secretaria loga e tem os poderes do perfil
    h = {"Authorization": f"Bearer {_login(client, 'nova.sec@uneb.br').json()['access_token']}"}
    curso = client.post("/cursos", json={"codigo": "ADS", "nome": "ADS", "grau": "Tecnólogo"}, headers=h)
    assert curso.status_code == 201


def test_funcionario_com_varios_perfis(client, db_session):
    _usuario(db_session, "adm@uneb.br", "ADMIN")
    dados = {**FUNCIONARIO_OK, "perfis": ["COORDENACAO", "SECRETARIA", "SECRETARIA"]}

    resp = client.post("/usuarios/funcionarios", json=dados, headers=_headers(client, "adm@uneb.br"))

    assert resp.status_code == 201
    assert sorted(resp.json()["perfis"]) == ["COORDENACAO", "SECRETARIA"]


def test_secretaria_nao_cria_funcionario(client, db_session):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    resp = client.post("/usuarios/funcionarios", json=FUNCIONARIO_OK, headers=_headers(client, "sec@uneb.br"))
    assert resp.status_code == 403


def test_nao_da_para_criar_admin_escondido_como_aluno(client, db_session):
    """O perfil nunca vem 'solto': perfis fora da lista permitida são rejeitados."""
    _usuario(db_session, "adm@uneb.br", "ADMIN")
    for invalido in (["ALUNO"], ["PROFESSOR"], ["SUPERUSER"], []):
        resp = client.post(
            "/usuarios/funcionarios",
            json={**FUNCIONARIO_OK, "perfis": invalido},
            headers=_headers(client, "adm@uneb.br"),
        )
        assert resp.status_code == 422, invalido


def test_perfil_ausente_no_banco_da_erro_claro(client, db_session):
    _usuario(db_session, "sec@uneb.br", "SECRETARIA")
    db_session.query(Perfil).filter_by(nome="ALUNO").delete()
    db_session.commit()

    resp = client.post("/usuarios/alunos", json=ALUNO_OK, headers=_headers(client, "sec@uneb.br"))

    assert resp.status_code == 400
    assert "seed" in resp.json()["detail"]
