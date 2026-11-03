from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.db.session import get_db
from app.models.curriculo import Disciplina
from app.models.pessoas import Aluno, Professor
from app.models.prerequisito import DisciplinaPrerequisito
from app.models.sala import Sala
from app.models.turma import MatriculaTurma, SituacaoMatricula, Turma
from app.models.usuario import Usuario
from app.schemas.matricula import MatriculaCreate, MatriculaDetalhe, MatriculaRead

router = APIRouter(prefix="/matriculas", tags=["matriculas"])

PERFIS_GESTORES = {"SECRETARIA", "ADMIN"}


def _prerequisitos_pendentes(db: Session, aluno: Aluno, turma: Turma) -> list[str]:
    """Nomes dos pré-requisitos da disciplina da turma que o aluno ainda NÃO cumpriu.

    Cumprido = o aluno tem alguma matrícula com situacao 'aprovado' em qualquer
    turma daquela disciplina (turmas de semestres diferentes valem).
    Estar apenas 'matriculado' (cursando) ou reprovado não conta.
    """
    ja_aprovado = (
        select(MatriculaTurma.id_matricula_turma)
        .join(Turma, Turma.id_turma == MatriculaTurma.id_turma)
        .where(
            MatriculaTurma.id_aluno == aluno.id_aluno,
            MatriculaTurma.situacao == SituacaoMatricula.aprovado,
            Turma.id_disciplina == DisciplinaPrerequisito.id_prerequisito,
        )
        .exists()
    )
    return list(
        db.scalars(
            select(Disciplina.nome)
            .join(
                DisciplinaPrerequisito,
                DisciplinaPrerequisito.id_prerequisito == Disciplina.id_disciplina,
            )
            .where(DisciplinaPrerequisito.id_disciplina == turma.id_disciplina, ~ja_aprovado)
            .order_by(Disciplina.nome)
        ).all()
    )


@router.post("", response_model=MatriculaRead, status_code=status.HTTP_201_CREATED)
def criar_matricula(
    dados: MatriculaCreate,
    usuario: Usuario = Depends(require_perfis("ALUNO", "SECRETARIA", "ADMIN")),
    db: Session = Depends(get_db),
):
    # --- 1. Descobrir quem será matriculado ---
    eh_gestor = bool(set(usuario.nomes_perfis) & PERFIS_GESTORES)

    if eh_gestor:
        if dados.id_aluno is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Informe o id_aluno a ser matriculado")
        aluno = db.get(Aluno, dados.id_aluno)
        if aluno is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Aluno não encontrado")
    else:
        aluno = db.scalar(select(Aluno).where(Aluno.id_usuario == usuario.id_usuario))
        if aluno is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Este usuário não possui cadastro de aluno")
        if dados.id_aluno not in (None, aluno.id_aluno):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Você só pode se matricular em seu próprio nome")

    # --- 2. Travar a linha da turma ---
    # Serializa matrículas simultâneas na mesma turma, para duas pessoas não
    # ocuparem a última vaga ao mesmo tempo. O lock dura até o commit.
    # (Seleciona só o id para travar apenas a turma, sem os joins de relacionamento.)
    travada = db.execute(
        select(Turma.id_turma, Turma.vagas_totais).where(Turma.id_turma == dados.id_turma).with_for_update()
    ).first()
    if travada is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turma não encontrada")
    turma = db.get(Turma, dados.id_turma)

    # --- 3. Já matriculado? ---
    existente = db.scalar(
        select(MatriculaTurma).where(
            MatriculaTurma.id_aluno == aluno.id_aluno,
            MatriculaTurma.id_turma == turma.id_turma,
        )
    )
    if existente is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"O aluno já possui matrícula nesta turma (situação: {existente.situacao.value})",
        )

    # --- 4. Vagas ---
    # Mesma regra da consulta de vagas do DBA: só 'matriculado' ocupa vaga.
    # Esta contagem só é confiável porque (a) a turma está travada acima, então
    # ninguém matricula nela ao mesmo tempo, e (b) o banco roda em READ COMMITTED
    # (ver app/db/session.py), então a contagem enxerga a matrícula que outra
    # pessoa acabou de confirmar. NÃO troque por leitura travada (FOR SHARE): ela
    # trava o fim do índice e causa deadlock entre turmas diferentes.
    ocupadas = db.scalar(
        select(func.count())
        .select_from(MatriculaTurma)
        .where(
            MatriculaTurma.id_turma == turma.id_turma,
            MatriculaTurma.situacao == SituacaoMatricula.matriculado,
        )
    )
    if ocupadas >= travada.vagas_totais:
        raise HTTPException(status.HTTP_409_CONFLICT, "Não há vagas disponíveis nesta turma")

    # --- 5. Pré-requisitos ---
    pendentes = _prerequisitos_pendentes(db, aluno, turma)
    if pendentes:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Pré-requisitos não cumpridos: " + ", ".join(pendentes),
        )

    # --- 6. Conflito de horário do próprio aluno ---
    # Dois horários se sobrepõem quando cada um começa antes do outro terminar
    # (então 08-10 e 10-12 NÃO conflitam).
    conflito = db.execute(
        select(Turma.codigo_turma)
        .join(MatriculaTurma, MatriculaTurma.id_turma == Turma.id_turma)
        .where(
            MatriculaTurma.id_aluno == aluno.id_aluno,
            MatriculaTurma.situacao == SituacaoMatricula.matriculado,
            Turma.semestre_letivo == turma.semestre_letivo,
            Turma.dia_semana == turma.dia_semana,
            Turma.hora_inicio < turma.hora_fim,
            Turma.hora_fim > turma.hora_inicio,
        )
    ).first()
    if conflito is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Conflito de horário com a turma {conflito[0]} em que o aluno já está matriculado",
        )

    # --- 7. Matricular ---
    matricula = MatriculaTurma(id_aluno=aluno.id_aluno, id_turma=turma.id_turma)
    db.add(matricula)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "O aluno já possui matrícula nesta turma")
    db.refresh(matricula)
    return matricula


@router.get("/minhas", response_model=list[MatriculaDetalhe])
def minhas_matriculas(
    usuario: Usuario = Depends(require_perfis("ALUNO")),
    db: Session = Depends(get_db),
):
    """Matrículas do aluno logado, com turma, horário, nota e frequência."""
    aluno = db.scalar(select(Aluno).where(Aluno.id_usuario == usuario.id_usuario))
    if aluno is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Este usuário não possui cadastro de aluno")

    # Seleciona colunas (não entidades) para não disparar os joins automáticos
    # dos relacionamentos da Turma.
    linhas = db.execute(
        select(
            MatriculaTurma.id_matricula_turma,
            Turma.id_turma,
            Turma.codigo_turma,
            Turma.semestre_letivo,
            Disciplina.codigo.label("disciplina_codigo"),
            Disciplina.nome.label("disciplina_nome"),
            Professor.nome_completo.label("professor_nome"),
            Sala.codigo.label("sala_codigo"),
            Turma.dia_semana,
            Turma.hora_inicio,
            Turma.hora_fim,
            MatriculaTurma.nota_final,
            MatriculaTurma.frequencia,
            MatriculaTurma.situacao,
        )
        .join(Turma, Turma.id_turma == MatriculaTurma.id_turma)
        .join(Disciplina, Disciplina.id_disciplina == Turma.id_disciplina)
        .join(Professor, Professor.id_professor == Turma.id_professor)
        .join(Sala, Sala.id_sala == Turma.id_sala)
        .where(MatriculaTurma.id_aluno == aluno.id_aluno)
        .order_by(Turma.semestre_letivo.desc(), Turma.dia_semana, Turma.hora_inicio)
    ).all()

    return [MatriculaDetalhe(**linha._mapping) for linha in linhas]
