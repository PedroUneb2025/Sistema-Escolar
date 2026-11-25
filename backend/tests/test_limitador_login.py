"""Testes do contador de tentativas de login (sem FastAPI e sem banco)."""
from app.core.limitador_login import LimitadorLogin


class Relogio:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t

    def avancar(self, segundos):
        self.t += segundos


def _limitador(**kw):
    relogio = Relogio()
    return LimitadorLogin(agora=relogio, **kw), relogio


A = LimitadorLogin.chave("ana@sga.edu", "1.1.1.1")
B = LimitadorLogin.chave("bia@sga.edu", "1.1.1.1")


def test_as_quatro_primeiras_falhas_nao_bloqueiam():
    lim, _ = _limitador()
    assert [lim.registrar_falha(A) for _ in range(4)] == [0, 0, 0, 0]
    assert lim.segundos_restantes(A) == 0


def test_quinta_falha_bloqueia_por_30_segundos():
    lim, _ = _limitador()
    for _ in range(4):
        lim.registrar_falha(A)

    assert lim.registrar_falha(A) == 30
    assert lim.segundos_restantes(A) == 30


def test_a_espera_cresce_ate_o_teto_de_15_minutos():
    lim, relogio = _limitador()
    for _ in range(4):
        lim.registrar_falha(A)

    esperas = []
    for _ in range(8):
        espera = lim.registrar_falha(A)
        esperas.append(espera)
        relogio.avancar(espera)  # espera acabar para poder falhar de novo

    # 30 s, 1, 2, 4, 8 e 15 min; daí em diante fica em 15 min.
    assert esperas == [30, 60, 120, 240, 480, 900, 900, 900]


def test_espera_diminui_com_o_tempo_e_libera_no_fim():
    lim, relogio = _limitador()
    for _ in range(5):
        lim.registrar_falha(A)

    relogio.avancar(10)
    assert lim.segundos_restantes(A) == 20
    relogio.avancar(19.5)
    assert lim.segundos_restantes(A) == 1  # arredonda para cima
    relogio.avancar(0.5)
    assert lim.segundos_restantes(A) == 0


def test_sucesso_zera_o_contador():
    lim, _ = _limitador()
    for _ in range(4):
        lim.registrar_falha(A)

    lim.registrar_sucesso(A)

    assert lim.falhas_seguidas(A) == 0
    assert [lim.registrar_falha(A) for _ in range(4)] == [0, 0, 0, 0]
    assert lim.registrar_falha(A) == 30


def test_sucesso_depois_da_espera_volta_ao_comeco():
    lim, relogio = _limitador()
    for _ in range(5):
        lim.registrar_falha(A)
    relogio.avancar(30)

    lim.registrar_sucesso(A)

    assert lim.falhas_seguidas(A) == 0
    assert lim.segundos_restantes(A) == 0


def test_cada_e_mail_tem_o_seu_contador():
    lim, _ = _limitador()
    for _ in range(5):
        lim.registrar_falha(A)

    assert lim.segundos_restantes(A) == 30
    assert lim.segundos_restantes(B) == 0
    assert lim.registrar_falha(B) == 0


def test_cada_ip_tem_o_seu_contador():
    lim, _ = _limitador()
    de_outro_ip = LimitadorLogin.chave("ana@sga.edu", "2.2.2.2")
    for _ in range(5):
        lim.registrar_falha(A)

    assert lim.segundos_restantes(de_outro_ip) == 0


def test_chave_ignora_maiusculas_e_espacos_do_email():
    assert LimitadorLogin.chave("  ANA@SGA.edu ", "1.1.1.1") == A


def test_email_gigante_e_cortado():
    chave = LimitadorLogin.chave("x" * 5000, "1.1.1.1")
    assert len(chave[0]) == 254


def test_contador_esquecido_depois_de_uma_hora_sem_tentar():
    lim, relogio = _limitador()
    for _ in range(3):
        lim.registrar_falha(A)

    relogio.avancar(3601)

    assert lim.registrar_falha(A) == 0
    assert lim.falhas_seguidas(A) == 1


def test_bloqueio_nao_e_esquecido_durante_a_espera():
    lim, relogio = _limitador()
    for _ in range(10):
        lim.registrar_falha(A)  # 10ª: espera de 15 min

    relogio.avancar(800)

    assert lim.segundos_restantes(A) == 100


def test_memoria_e_limitada_e_preserva_quem_esta_bloqueado():
    lim, relogio = _limitador(max_entradas=20)
    for _ in range(10):
        lim.registrar_falha(A)  # A está bloqueado por 15 min
    for n in range(100):
        relogio.avancar(1)
        lim.registrar_falha(LimitadorLogin.chave(f"fake{n}@x.com", "9.9.9.9"))

    assert len(lim._entradas) <= 20
    assert lim.segundos_restantes(A) > 0  # o bloqueio de A não foi expulso


def test_limpar_zera_tudo():
    lim, _ = _limitador()
    for _ in range(5):
        lim.registrar_falha(A)

    lim.limpar()

    assert lim.segundos_restantes(A) == 0
    assert lim.falhas_seguidas(A) == 0
