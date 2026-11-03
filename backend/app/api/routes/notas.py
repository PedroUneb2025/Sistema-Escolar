from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.db.session import get_db
from app.models.pessoas import Professor
from app.models.turma import MatriculaTurma, SituacaoMatricula, Turma
from app.models.usuario import Usuario
from app.schemas.turma import MatriculaNotasRead, NotaFrequenciaUpdate, ResumoTurmaRead
from app.services.notas_regras import (
    exigir_permissao_nota,
    resumo_turma,
    validar_matricula_editavel,
    validar_nota_frequencia,
)
from app.services.turma_regras import RegraTurmaError

router = APIRouter(prefix="/turmas", tags=["notas"])

PERFIS_GESTORES = {"SECRETARIA", "ADMIN"}


def _http(erro: RegraTurmaError) -> HTTPException:
    return HTTPException(erro.status_code, erro.detail)


def _id_professor_da_turma(db: Session, id_turma: int) -> int:
    id_professor = db.scalar(select(Turma.id_professor).where(Turma.id_turma == id_turma))
    if id_professor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turma não encontrada")
    return id_professor


def _eh_professor_da_turma(db: Session, usuario: Usuario, id_professor_turma: int) -> bool:
    # Mesmo padrão de alunos_da_turma (relatorios.py).
    id_professor = db.scalar(
        select(Professor.id_professor).where(Professor.id_usuario == usuario.id_usuario)
    )
    return id_professor is not None and id_professor == id_professor_turma


@router.patch("/{id_turma}/matriculas/{id_matricula_turma}", response_model=MatriculaNotasRead)
def lancar_nota_e_frequencia(
    id_turma: int,
    id_matricula_turma: int,
    dados: NotaFrequenciaUpdate,
    usuario: Usuario = Depends(require_perfis("SECRETARIA", "ADMIN", "PROFESSOR")),
    db: Session = Depends(get_db),
):
    """Lança nota final (0 a 10) e/ou frequência (0 a 100) de uma matrícula.

    Quem pode: professor dono da turma, SECRETARIA e ADMIN. Não grava situação:
    o fechamento de diário é da Sprint 4 (RF05).
    """
    id_professor_turma = _id_professor_da_turma(db, id_turma)
    try:
        exigir_permissao_nota(
            usuario.nomes_perfis, _eh_professor_da_turma(db, usuario, id_professor_turma)
        )
    except RegraTurmaError as e:
        raise _http(e)

    enviados = dados.model_fields_set & {"nota_final", "frequencia"}
    if not enviados:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe nota_final e/ou frequencia."
        )

    matricula = db.get(MatriculaTurma, id_matricula_turma)
    if matricula is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Matrícula não encontrada nesta turma.")
    try:
        validar_nota_frequencia(dados.nota_final, dados.frequencia)
        validar_matricula_editavel(matricula.id_turma, id_turma, matricula.situacao.value)
    except RegraTurmaError as e:
        raise _http(e)

    if "nota_final" in enviados:
        matricula.nota_final = dados.nota_final
    if "frequencia" in enviados:
        matricula.frequencia = dados.frequencia
    db.commit()
    db.refresh(matricula)
    return MatriculaNotasRead(
        id_matricula_turma=matricula.id_matricula_turma,
        id_turma=matricula.id_turma,
        id_aluno=matricula.id_aluno,
        situacao=matricula.situacao.value,
        nota_final=float(matricula.nota_final) if matricula.nota_final is not None else None,
        frequencia=float(matricula.frequencia) if matricula.frequencia is not None else None,
    )


@router.get("/{id_turma}/resumo", response_model=ResumoTurmaRead)
def resumo_da_turma(
    id_turma: int,
    usuario: Usuario = Depends(require_perfis("SECRETARIA", "ADMIN", "PROFESSOR")),
    db: Session = Depends(get_db),
):
    """Total de alunos, média das notas, frequência média e contagem por situação.

    Secretaria/Admin veem qualquer turma; professor só vê as próprias.
    """
    id_professor_turma = _id_professor_da_turma(db, id_turma)
    if not (set(usuario.nomes_perfis) & PERFIS_GESTORES):
        if not _eh_professor_da_turma(db, usuario, id_professor_turma):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Você só pode consultar as suas próprias turmas"
            )

    linhas = db.execute(
        select(MatriculaTurma.nota_final, MatriculaTurma.frequencia, MatriculaTurma.situacao).where(
            MatriculaTurma.id_turma == id_turma
        )
    ).all()
    resumo = resumo_turma(
        {
            "nota_final": float(l.nota_final) if l.nota_final is not None else None,
            "frequencia": float(l.frequencia) if l.frequencia is not None else None,
            "situacao": l.situacao.value,
        }
        for l in linhas
    )
    contagem = {s.value: 0 for s in SituacaoMatricula}
    contagem.update(resumo["contagemPorSituacao"])
    return ResumoTurmaRead(
        idTurma=id_turma,
        totalAlunos=resumo["totalAlunos"],
        mediaNotas=resumo["mediaNotas"],
        frequenciaMedia=resumo["frequenciaMedia"],
        contagemPorSituacao=contagem,
    )
