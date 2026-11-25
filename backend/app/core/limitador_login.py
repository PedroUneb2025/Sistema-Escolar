"""Limite de tentativas de login, com espera crescente.

Conta as falhas seguidas por (e-mail, IP). Da 5ª falha em diante a pessoa precisa
esperar 30 s, depois 1, 2, 4 e 8 min, com teto de 15 min. Enquanto espera, até a
senha certa é recusada. Um login correto zera o contador.

Os contadores ficam NA MEMÓRIA do processo: só valem com um worker do uvicorn e
zeram se a API reiniciar. Com mais de um worker (ou mais de uma instância), cada
um teria o seu contador e o limite deixaria de valer; aí seria preciso um
armazenamento compartilhado, como o Redis.

Este módulo não conhece FastAPI nem banco, então dá para testar sem nenhum dos dois.
"""
import math
import threading
import time
from dataclasses import dataclass
from typing import Callable

FALHAS_ATE_BLOQUEAR = 5
# Espera depois da 5ª, 6ª, 7ª, 8ª, 9ª e 10ª falha (ou mais): 30 s, 1, 2, 4, 8 e 15 min.
ESPERAS_SEGUNDOS = (30, 60, 120, 240, 480, 900)
# Sem nenhuma tentativa por 1 hora (contada a partir do fim da espera), o contador é esquecido.
ESQUECER_APOS_SEGUNDOS = 3600
# Limite de contadores na memória, para quem tentar com milhares de e-mails inventados.
MAX_ENTRADAS = 10_000

Chave = tuple[str, str]


@dataclass
class _Entrada:
    falhas: int = 0
    bloqueado_ate: float = 0.0
    ultima_falha: float = 0.0


class LimitadorLogin:
    def __init__(
        self,
        agora: Callable[[], float] = time.monotonic,
        max_entradas: int = MAX_ENTRADAS,
    ):
        # Relógio injetável: os testes avançam o tempo sem dormir.
        self._agora = agora
        self._max_entradas = max_entradas
        self._entradas: dict[Chave, _Entrada] = {}
        self._trava = threading.Lock()

    @staticmethod
    def chave(email: str, ip: str) -> Chave:
        """E-mail em minúsculas e sem espaços, para 'Ana@x.com' e 'ana@x.com ' contarem juntos."""
        return (email.strip().lower()[:254], ip)

    @staticmethod
    def espera_para(falhas: int) -> int:
        """Segundos de espera depois de `falhas` falhas seguidas (0 = ainda pode tentar)."""
        if falhas < FALHAS_ATE_BLOQUEAR:
            return 0
        return ESPERAS_SEGUNDOS[min(falhas - FALHAS_ATE_BLOQUEAR, len(ESPERAS_SEGUNDOS) - 1)]

    def segundos_restantes(self, chave: Chave) -> int:
        """Segundos que faltam para a pessoa poder tentar de novo (0 = liberado)."""
        with self._trava:
            agora = self._agora()
            entrada = self._entradas.get(chave)
            if entrada is None:
                return 0
            if self._esquecida(entrada, agora):
                del self._entradas[chave]
                return 0
            if entrada.bloqueado_ate > agora:
                return math.ceil(entrada.bloqueado_ate - agora)
            return 0

    def registrar_falha(self, chave: Chave) -> int:
        """Conta uma falha. Devolve a espera em segundos (0 se ainda não bloqueou)."""
        with self._trava:
            agora = self._agora()
            if len(self._entradas) >= self._max_entradas:
                self._abrir_espaco(agora)
            entrada = self._entradas.get(chave)
            if entrada is None or self._esquecida(entrada, agora):
                entrada = _Entrada()
            entrada.falhas += 1
            entrada.ultima_falha = agora
            espera = self.espera_para(entrada.falhas)
            entrada.bloqueado_ate = agora + espera if espera else 0.0
            self._entradas[chave] = entrada
            return espera

    def falhas_seguidas(self, chave: Chave) -> int:
        with self._trava:
            entrada = self._entradas.get(chave)
            return entrada.falhas if entrada else 0

    def registrar_sucesso(self, chave: Chave) -> None:
        with self._trava:
            self._entradas.pop(chave, None)

    def limpar(self) -> None:
        with self._trava:
            self._entradas.clear()

    # ----------------------------- internos -----------------------------

    @staticmethod
    def _esquecida(entrada: _Entrada, agora: float) -> bool:
        fim = max(entrada.bloqueado_ate, entrada.ultima_falha)
        return agora - fim > ESQUECER_APOS_SEGUNDOS

    def _abrir_espaco(self, agora: float) -> None:
        """Chamado com a trava já pega. Tira primeiro os vencidos; se não bastar,
        tira os mais antigos, deixando para o fim quem está bloqueado agora."""
        for chave in [c for c, e in self._entradas.items() if self._esquecida(e, agora)]:
            del self._entradas[chave]
        if len(self._entradas) < self._max_entradas:
            return
        ordem = sorted(
            self._entradas,
            key=lambda c: (self._entradas[c].bloqueado_ate > agora, self._entradas[c].ultima_falha),
        )
        for chave in ordem[: max(1, self._max_entradas // 10)]:
            del self._entradas[chave]


# Uma instância só, usada pela rota de login.
limitador_login = LimitadorLogin()
