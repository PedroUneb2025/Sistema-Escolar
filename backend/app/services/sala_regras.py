"""Validações de Sala (T1), sem banco."""
from app.services.turma_regras import RegraTurmaError


def validar_sala(codigo: str, capacidade: int) -> None:
    if not codigo or not codigo.strip():
        raise RegraTurmaError("O código da sala é obrigatório.", 422)
    if len(codigo) > 20:
        raise RegraTurmaError("O código da sala deve ter até 20 caracteres.", 422)
    if capacidade is None or capacidade <= 0:
        raise RegraTurmaError("A capacidade deve ser maior que zero.", 422)


def validar_exclusao_sala(total_turmas: int) -> None:
    if total_turmas > 0:
        raise RegraTurmaError(
            "Não é possível excluir a sala: existem turmas vinculadas.", 409)
