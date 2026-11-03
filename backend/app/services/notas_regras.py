"""Regras de notas, frequência e resumo da turma (T4), sem banco.

Atenção: o nome da situação "trancada" depende do enum real do projeto
(SituacaoMatricula). Ajuste SITUACAO_TRANCADA quando abrir o model.
"""
from typing import Iterable, Optional

from app.services.turma_regras import RegraTurmaError

# Regra de aprovação SUGERIDA no docx; precisa ser confirmada com o time/professor.
MEDIA_MINIMA_APROVACAO = 7.0
FREQUENCIA_MINIMA_APROVACAO = 75.0
SITUACAO_TRANCADA = "trancado"  # AJUSTAR ao enum real
PERFIS_LANCAM_NOTA = ("SECRETARIA", "ADMIN")


def validar_nota_frequencia(nota_final: Optional[float],
                            frequencia: Optional[float]) -> None:
    if nota_final is not None and not (0 <= nota_final <= 10):
        raise RegraTurmaError("A nota final deve estar entre 0 e 10.", 422)
    if frequencia is not None and not (0 <= frequencia <= 100):
        raise RegraTurmaError("A frequência deve estar entre 0 e 100.", 422)


def validar_matricula_editavel(id_turma_da_matricula: int, id_turma: int,
                               situacao: str) -> None:
    if id_turma_da_matricula != id_turma:
        raise RegraTurmaError("Matrícula não encontrada nesta turma.", 404)
    if situacao == SITUACAO_TRANCADA:
        raise RegraTurmaError(
            "Não é possível alterar nota ou frequência de matrícula trancada.", 409)


def pode_lancar_nota(perfis: Iterable[str], eh_professor_da_turma: bool) -> bool:
    """Professor dono da turma, SECRETARIA e ADMIN. Os demais: 403."""
    p = {x.upper() for x in perfis}
    return eh_professor_da_turma or bool(p & set(PERFIS_LANCAM_NOTA))


def exigir_permissao_nota(perfis: Iterable[str], eh_professor_da_turma: bool) -> None:
    if not pode_lancar_nota(perfis, eh_professor_da_turma):
        raise RegraTurmaError("Você não tem permissão para lançar notas nesta turma.", 403)


def situacao_sugerida(nota_final: Optional[float],
                      frequencia: Optional[float]) -> Optional[str]:
    """'aprovado' / 'reprovado', ou None se faltar nota ou frequência.

    Apenas calcula; NÃO grava (o fechamento de diário é da Sprint 4, RF05).
    """
    if nota_final is None or frequencia is None:
        return None
    ok = (nota_final >= MEDIA_MINIMA_APROVACAO
          and frequencia >= FREQUENCIA_MINIMA_APROVACAO)
    return "aprovado" if ok else "reprovado"


def resumo_turma(matriculas: Iterable[dict]) -> dict:
    """Cada item: {'nota_final': float|None, 'frequencia': float|None, 'situacao': str}."""
    itens = list(matriculas)
    notas = [m["nota_final"] for m in itens if m.get("nota_final") is not None]
    freqs = [m["frequencia"] for m in itens if m.get("frequencia") is not None]
    contagem: dict = {}
    for m in itens:
        contagem[m["situacao"]] = contagem.get(m["situacao"], 0) + 1
    return {
        "totalAlunos": len(itens),
        "mediaNotas": round(sum(notas) / len(notas), 2) if notas else None,
        "frequenciaMedia": round(sum(freqs) / len(freqs), 2) if freqs else None,
        "contagemPorSituacao": contagem,
    }
