def test_login_com_credenciais_validas(client, usuario_ativo):
    resp = client.post("/auth/login", data={"username": "teste@sga.edu", "password": "senha123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert "access_token" in body


def test_login_com_senha_errada(client, usuario_ativo):
    resp = client.post("/auth/login", data={"username": "teste@sga.edu", "password": "errada"})
    assert resp.status_code == 401


def test_login_com_email_inexistente(client):
    resp = client.post("/auth/login", data={"username": "ninguem@sga.edu", "password": "x"})
    assert resp.status_code == 401


def test_me_sem_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_com_token_valido(client, usuario_ativo):
    login = client.post("/auth/login", data={"username": "teste@sga.edu", "password": "senha123"})
    token = login.json()["access_token"]

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "teste@sga.edu"
    assert "aluno" in body["perfis"]


def test_me_com_token_invalido(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer token-invalido"})
    assert resp.status_code == 401
