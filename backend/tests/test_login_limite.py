from types import SimpleNamespace

import pytest

from app.api.routes.auth import _ip_do_cliente
from app.core.limitador_login import limitador_login
from tests.helpers import _usuario

URL = "/auth/login"


class Relogio:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t

    def avancar(self, segundos):
        self.t += segundos


@pytest.fixture()
def relogio(monkeypatch):
    r = Relogio()
    monkeypatch.setattr(limitador_login, "_agora", r)
    return r


def _tentar(client, email="teste@sga.edu", senha="errada"):
    return client.post(URL, data={"username": email, "password": senha})


def _falhar(client, vezes, email="teste@sga.edu"):
    return [_tentar(client, email) for _ in range(vezes)]


# ----------------------------- bloqueio -----------------------------

def test_quatro_falhas_ainda_retornam_401(client, usuario_ativo, relogio):
    respostas = _falhar(client, 4)

    assert [r.status_code for r in respostas] == [401, 401, 401, 401]
    assert all("Retry-After" not in r.headers for r in respostas)


def test_quinta_falha_seguida_retorna_429_com_retry_after(client, usuario_ativo, relogio):
    _falhar(client, 4)

    resp = _tentar(client)

    assert resp.status_code == 429
    assert resp.headers["Retry-After"] == "30"
    assert resp.json()["detail"] == "Muitas tentativas. Tente de novo em 1 minuto"


def test_senha_certa_tambem_e_recusada_durante_a_espera(client, usuario_ativo, relogio):
    _falhar(client, 5)

    resp = _tentar(client, senha="senha123")

    assert resp.status_code == 429
    assert resp.headers["Retry-After"] == "30"


def test_retry_after_diminui_e_a_tentativa_na_espera_nao_conta(client, usuario_ativo, relogio):
    _falhar(client, 5)
    relogio.avancar(10)

    primeira = _tentar(client, senha="senha123")
    relogio.avancar(5)
    segunda = _tentar(client)  # errada, mas na espera: não conta e não estende o bloqueio

    assert primeira.headers["Retry-After"] == "20"
    assert segunda.headers["Retry-After"] == "15"


def test_depois_da_espera_a_senha_certa_entra_e_zera_o_contador(client, usuario_ativo, relogio):
    _falhar(client, 5)
    relogio.avancar(30)

    ok = _tentar(client, senha="senha123")
    depois = _falhar(client, 5)

    assert ok.status_code == 200
    assert "access_token" in ok.json()
    # Contador zerado: voltam as 4 falhas com 401 antes de bloquear de novo.
    assert [r.status_code for r in depois] == [401, 401, 401, 401, 429]
    assert depois[-1].headers["Retry-After"] == "30"


def test_a_espera_cresce_ate_15_minutos(client, usuario_ativo, relogio):
    _falhar(client, 4)
    esperas, mensagens = [], []
    for _ in range(8):
        resp = _tentar(client)
        assert resp.status_code == 429
        esperas.append(resp.headers["Retry-After"])
        mensagens.append(resp.json()["detail"])
        relogio.avancar(int(resp.headers["Retry-After"]))

    assert esperas == ["30", "60", "120", "240", "480", "900", "900", "900"]
    assert mensagens[:6] == [
        "Muitas tentativas. Tente de novo em 1 minuto",
        "Muitas tentativas. Tente de novo em 1 minuto",
        "Muitas tentativas. Tente de novo em 2 minutos",
        "Muitas tentativas. Tente de novo em 4 minutos",
        "Muitas tentativas. Tente de novo em 8 minutos",
        "Muitas tentativas. Tente de novo em 15 minutos",
    ]


def test_sucesso_no_meio_zera_a_contagem(client, usuario_ativo, relogio):
    _falhar(client, 4)
    assert _tentar(client, senha="senha123").status_code == 200

    respostas = _falhar(client, 4)

    assert [r.status_code for r in respostas] == [401, 401, 401, 401]


# ----------------------------- independência -----------------------------

def test_um_usuario_nao_afeta_o_outro(client, db_session, usuario_ativo, relogio):
    _usuario(db_session, "outro@sga.edu", "ALUNO")
    _falhar(client, 5)  # teste@ bloqueado

    outro_ok = _tentar(client, "outro@sga.edu", "senha123")
    outro_erro = _tentar(client, "outro@sga.edu", "errada")

    assert outro_ok.status_code == 200
    assert outro_erro.status_code == 401


def test_o_mesmo_email_em_outro_ip_nao_e_bloqueado(client, usuario_ativo, relogio, monkeypatch):
    _falhar(client, 5)
    assert _tentar(client, senha="senha123").status_code == 429

    monkeypatch.setattr("app.api.routes.auth._ip_do_cliente", lambda request: "10.0.0.2")

    assert _tentar(client, senha="senha123").status_code == 200


def test_email_com_outra_grafia_conta_no_mesmo_contador(client, usuario_ativo, relogio):
    for email in ("TESTE@sga.edu", "Teste@SGA.edu", " teste@sga.edu ", "teste@sga.edu"):
        assert _tentar(client, email).status_code == 401

    assert _tentar(client, "TESTE@sga.edu").status_code == 429


# ----------------------------- não revela contas -----------------------------

def test_email_inexistente_tambem_conta_e_responde_igual(client, usuario_ativo, relogio):
    existente = _falhar(client, 5)[-1]
    limitador_login.limpar()

    inexistente = _falhar(client, 5, email="ninguem@sga.edu")[-1]

    assert inexistente.status_code == existente.status_code == 429
    assert inexistente.headers["Retry-After"] == existente.headers["Retry-After"]
    assert inexistente.json() == existente.json()


def test_resposta_401_e_igual_para_conta_existente_e_inexistente(client, usuario_ativo, relogio):
    a = _tentar(client, "teste@sga.edu")
    b = _tentar(client, "ninguem@sga.edu")

    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


# ----------------------------- IP -----------------------------

def test_ip_do_cliente_vem_do_request_client():
    assert _ip_do_cliente(SimpleNamespace(client=SimpleNamespace(host="177.10.20.30"))) == "177.10.20.30"
    assert _ip_do_cliente(SimpleNamespace(client=None)) == "desconhecido"


def test_cabecalho_x_forwarded_for_nao_troca_o_ip_do_contador(client, usuario_ativo, relogio):
    """Quem decide o IP é o uvicorn (proxy confiável). O app não deve confiar no
    cabeçalho por conta própria, senão bastaria mudá-lo a cada tentativa."""
    for n in range(5):
        client.post(URL, data={"username": "teste@sga.edu", "password": "errada"},
                    headers={"X-Forwarded-For": f"8.8.8.{n}"})

    resp = client.post(URL, data={"username": "teste@sga.edu", "password": "senha123"},
                       headers={"X-Forwarded-For": "8.8.4.4"})

    assert resp.status_code == 429
