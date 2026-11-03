from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.db.session import get_db
from app.models.curriculo import Disciplina
from app.models.pessoas import Aluno, Professor
from app.models.turma import MatriculaTurma, SituacaoMatricula, Turma
from app.models.usuario import Usuario
from app.schemas.relatorios import (
    AlunoNaTurma,
    AlunoResumo,
    MatriculadoRow,
    TurmaAlunosRead,
)

router = APIRouter(prefix="/relatorios", tags=["relatorios"])

PERFIS_GESTORES = {"SECRETARIA", "ADMIN"}
somente_gestor = Depends(require_perfis("SECRETARIA", "ADMIN"))

# Todas as consultas selecionam colunas (não entidades) e paginam, para não
# carregar relacionamentos desnecessários nem devolver listas gigantes (RNF04).


@router.get("/alunos", response_model=list[AlunoResumo], dependencies=[somente_gestor])
def listar_alunos(
    busca: str | None = Query(default=None, description="Filtra por nome ou matrícula"),
    limite: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Aluno.id_aluno, Aluno.matricula, Aluno.nome_completo, Usuario.email)
        .join(Usuario, Usuario.id_usuario == Aluno.id_usuario)
        .order_by(Aluno.nome_completo)
        .limit(limite)
        .offset(offset)
    )
    if busca:
        padrao = f"%{busca}%"
        stmt = stmt.where(or_(Aluno.nome_completo.ilike(padrao), Aluno.matricula.ilike(padrao)))

    return [AlunoResumo(**linha._mapping) for linha in db.execute(stmt).all()]


@router.get("/matriculados", response_model=list[MatriculadoRow], dependencies=[somente_gestor])
def listar_matriculados(
    semestre_letivo: str | None = None,
    id_disciplina: int | None = None,
    id_turma: int | None = None,
    situacao: SituacaoMatricula = SituacaoMatricula.matriculado,
    limite: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = (
        select(
            MatriculaTurma.id_matricula_turma,
            Aluno.id_aluno,
            Aluno.matricula,
            Aluno.nome_completo,
            Turma.id_turma,
            Turma.codigo_turma,
            Turma.semestre_letivo,
            Disciplina.codigo.label("disciplina_codigo"),
            Disciplina.nome.label("disciplina_nome"),
            MatriculaTurma.situacao,
        )
        .join(Aluno, Aluno.id_aluno == MatriculaTurma.id_aluno)
        .join(Turma, Turma.id_turma == MatriculaTurma.id_turma)
        .join(Disciplina, Disciplina.id_disciplina == Turma.id_disciplina)
        .where(MatriculaTurma.situacao == situacao)
        .order_by(Turma.semestre_letivo.desc(), Turma.codigo_turma, Aluno.nome_completo)
        .limit(limite)
        .offset(offset)
    )
    if semestre_letivo:
        stmt = stmt.where(Turma.semestre_letivo == semestre_letivo)
    if id_disciplina is not None:
        stmt = stmt.where(Turma.id_disciplina == id_disciplina)
    if id_turma is not None:
        stmt = stmt.where(Turma.id_turma == id_turma)

    return [MatriculadoRow(**linha._mapping) for linha in db.execute(stmt).all()]


@router.get("/turmas/{id_turma}/alunos", response_model=TurmaAlunosRead)
def alunos_da_turma(
    id_turma: int,
    usuario: Usuario = Depends(require_perfis("SECRETARIA", "ADMIN", "PROFESSOR")),
    db: Session = Depends(get_db),
):
    """Alunos de uma turma, com situação, nota e frequência consolidada.

    Secretaria/Admin veem qualquer turma; professor só vê as próprias turmas.
    """
    turma = db.execute(
        select(
            Turma.id_turma,
            Turma.codigo_turma,
            Turma.semestre_letivo,
            Turma.vagas_totais,
            Turma.id_professor,
            Disciplina.nome.label("disciplina_nome"),
        )
        .join(Disciplina, Disciplina.id_disciplina == Turma.id_disciplina)
        .where(Turma.id_turma == id_turma)
    ).first()
    if turma is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turma não encontrada")

    if not (set(usuario.nomes_perfis) & PERFIS_GESTORES):
        id_professor = db.scalar(
            select(Professor.id_professor).where(Professor.id_usuario == usuario.id_usuario)
        )
        if id_professor != turma.id_professor:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Você só pode consultar as suas próprias turmas")

    linhas = db.execute(
        select(
            MatriculaTurma.id_matricula_turma,
            Aluno.id_aluno,
            Aluno.matricula,
            Aluno.nome_completo,
            MatriculaTurma.situacao,
            MatriculaTurma.nota_final,
            MatriculaTurma.frequencia,
        )
        .join(Aluno, Aluno.id_aluno == MatriculaTurma.id_aluno)
        .where(MatriculaTurma.id_turma == id_turma)
        .order_by(Aluno.nome_completo)
    ).all()
    alunos = [AlunoNaTurma(**linha._mapping) for linha in linhas]

    return TurmaAlunosRead(
        id_turma=turma.id_turma,
        codigo_turma=turma.codigo_turma,
        semestre_letivo=turma.semestre_letivo,
        disciplina_nome=turma.disciplina_nome,
        vagas_totais=turma.vagas_totais,
        total_alunos=len(alunos),
        alunos=alunos,
    )
