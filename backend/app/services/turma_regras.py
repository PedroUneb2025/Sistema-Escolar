"""Regras de negócio de Turma, sem dependência de banco ou FastAPI.

Funções puras: fáceis de testar e de reaproveitar na rota (turmas.py).
"""
from dataclasses import dataclass
from typing import Iterable, Optional

DIAS_SEMANA = (
    "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado",
)
STATUS_TURMA = ("aberta", "fechada", "cancelada")

# O banco guarda o dia como SEG..SAB (enum DiaSemana); o front usa por extenso.
DIA_EXTENSO_PARA_CODIGO = {
    "Segunda-feira": "SEG", "Terça-feira": "TER", "Quarta-feira": "QUA",
    "Quinta-feira": "QUI", "Sexta-feira": "SEX", "Sábado": "SAB",
}
DIA_CODIGO_PARA_EXTENSO = {v: k for k, v in DIA_EXTENSO_PARA_CODIGO.items()}


class RegraTurmaError(Exception):
    """Erro de regra de negócio; `status_code` é o HTTP a devolver."""

    def __init__(self, detail: str, status_code: int):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


@dataclass(frozen=True)
class Agenda:
    """Dados de uma turma relevantes para o conflito."""
    codigo: str
    semestre: str
    dia_semana: str
    inicio: str          # "HH:MM"
    fim: str             # "HH:MM"
    id_sala: int
    id_professor: int
    sala: str = ""       # nome/código da sala, só para a mensagem
    professor: str = ""  # nome do professor, só para a mensagem
    status: str = "aberta"
    id_turma: Optional[int] = None


def hora_para_minutos(valor: str) -> int:
    try:
        h, m = str(valor)[:5].split(":")
        h, m = int(h), int(m)
    except (ValueError, AttributeError):
        raise RegraTurmaError(f"Horário inválido: {valor!r}. Use HH:MM.", 422)
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise RegraTurmaError(f"Horário inválido: {valor!r}. Use HH:MM.", 422)
    return h * 60 + m


def validar_horario(inicio: str, fim: str) -> None:
    if hora_para_minutos(fim) <= hora_para_minutos(inicio):
        raise RegraTurmaError(
            "O horário final deve ser maior que o horário inicial.", 422)


def validar_dia_e_status(dia: str, status: str) -> None:
    if dia not in DIAS_SEMANA:
        raise RegraTurmaError(f"Dia da semana inválido: {dia}.", 422)
    if status not in STATUS_TURMA:
        raise RegraTurmaError(f"Status inválido: {status}.", 422)


def sobrepoe(ini_a: str, fim_a: str, ini_b: str, fim_b: str) -> bool:
    """Cada um começa antes de o outro terminar (10:00 encostado em 10:00 não conflita)."""
    return (hora_para_minutos(ini_a) < hora_para_minutos(fim_b)
            and hora_para_minutos(ini_b) < hora_para_minutos(fim_a))


def _descricao(o: Agenda) -> str:
    return f"{o.dia_semana}, {o.inicio} às {o.fim}"


def achar_conflito(nova: Agenda, existentes: Iterable[Agenda]) -> Optional[str]:
    """Devolve a mensagem de conflito (em português) ou None.

    Ignora turmas canceladas, de outro semestre/dia e a própria turma (edição).
    Sala é verificada antes de professor.
    """
    for o in existentes:
        if o.status == "cancelada":
            continue
        if nova.id_turma is not None and o.id_turma == nova.id_turma:
            continue
        if o.semestre != nova.semestre or o.dia_semana != nova.dia_semana:
            continue
        if not sobrepoe(nova.inicio, nova.fim, o.inicio, o.fim):
            continue
        if o.id_sala == nova.id_sala:
            return (f"Conflito de horário: a sala {o.sala or nova.sala} já está "
                    f"ocupada pela turma {o.codigo} ({_descricao(o)}).")
        if o.id_professor == nova.id_professor:
            return (f"Conflito de horário: o professor "
                    f"{o.professor or nova.professor} já ministra a turma "
                    f"{o.codigo} ({_descricao(o)}).")
    return None


def validar_conflito(nova: Agenda, existentes: Iterable[Agenda]) -> None:
    msg = achar_conflito(nova, existentes)
    if msg:
        raise RegraTurmaError(msg, 409)


def validar_vagas(vagas: int, matriculados: int = 0) -> None:
    if vagas <= 0:
        raise RegraTurmaError("O número de vagas deve ser maior que zero.", 422)
    if vagas < matriculados:
        raise RegraTurmaError(
            f"Não é possível reduzir as vagas para {vagas}: "
            f"a turma já tem {matriculados} aluno(s) matriculado(s).", 409)


def validar_exclusao(total_matriculas: int) -> None:
    if total_matriculas > 0:
        raise RegraTurmaError(
            "Não é possível excluir a turma: existem matrículas vinculadas.", 409)


def calcular_vagas(vagas_totais: int, ocupadas: int) -> dict:
    """Corpo de GET /turmas/{id}/vagas (T3). `ocupadas` = só situação matriculado."""
    return {
        "vagasTotais": vagas_totais,
        "vagasOcupadas": ocupadas,
        "vagasDisponiveis": max(vagas_totais - ocupadas, 0),
    }
