# Destino: backend/app/api/routes/alunos.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.db.session import get_db
from app.models.pessoas import Aluno
from app.models.usuario import Usuario
from app.schemas.aluno import AlunoDetalhe, AlunoStatusUpdate, AlunoUpdate

gestor = Depends(require_perfis("SECRETARIA", "COORDENACAO", "ADMIN"))

router = APIRouter(prefix="/alunos", tags=["alunos"])


def _detalhe(aluno: Aluno) -> AlunoDetalhe:
    return AlunoDetalhe(
        id_aluno=aluno.id_aluno,
        email=aluno.usuario.email,
        status=aluno.usuario.status,
        matricula=aluno.matricula,
        nome_completo=aluno.nome_completo,
        cpf=aluno.cpf,
        data_nascimento=aluno.data_nascimento,
        telefone=aluno.telefone,
    )


def _obter(db: Session, id_aluno: int) -> Aluno:
    aluno = db.get(Aluno, id_aluno)
    if aluno is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aluno não encontrado")
    return aluno


@router.get("/me", response_model=AlunoDetalhe)
def consultar_meu_perfil(
    usuario: Usuario = Depends(require_perfis("ALUNO")),
    db: Session = Depends(get_db),
):
    aluno = db.scalar(select(Aluno).where(Aluno.id_usuario == usuario.id_usuario))
    if aluno is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Este usuário não possui cadastro de aluno")
    return _detalhe(aluno)


@router.get("/{id_aluno}", response_model=AlunoDetalhe, dependencies=[gestor])
def consultar_aluno(id_aluno: int, db: Session = Depends(get_db)):
    return _detalhe(_obter(db, id_aluno))


@router.put("/{id_aluno}", response_model=AlunoDetalhe, dependencies=[gestor])
def editar_aluno(id_aluno: int, dados: AlunoUpdate, db: Session = Depends(get_db)):
    aluno = _obter(db, id_aluno)

    outros = select(Aluno).where(Aluno.id_aluno != id_aluno)
    if db.scalar(outros.where(Aluno.cpf == dados.cpf)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "CPF já cadastrado")
    if db.scalar(outros.where(Aluno.matricula == dados.matricula)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Matrícula já cadastrada")

    aluno.matricula = dados.matricula
    aluno.nome_completo = dados.nome_completo
    aluno.cpf = dados.cpf
    aluno.data_nascimento = dados.data_nascimento
    aluno.telefone = dados.telefone
    try:
        db.commit()
    except IntegrityError:  # corrida entre duas requisições
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "CPF ou matrícula já cadastrados")
    db.refresh(aluno)
    return _detalhe(aluno)


@router.patch("/{id_aluno}/status", response_model=AlunoDetalhe, dependencies=[gestor])
def alterar_status(id_aluno: int, dados: AlunoStatusUpdate, db: Session = Depends(get_db)):
    aluno = _obter(db, id_aluno)
    aluno.usuario.status = dados.status
    db.commit()
    db.refresh(aluno)
    return _detalhe(aluno)


# ---------------------------------------------------------------------------
# Falta, fora deste arquivo (HU-04):
#
# 1) auth.py, no login, DEPOIS de conferir a senha (para não revelar o status a
#    quem errou a senha):
#
#       if usuario.status != StatusUsuario.ativo:
#           raise HTTPException(status.HTTP_403_FORBIDDEN, "Conta inativa ou bloqueada")
#
#    (Se o auth.py já recusa conta não ativa, só confira o código de status que ele usa
#    e ajuste os testes.) O token já emitido JÁ é derrubado: o get_current_user do
#    deps.py confere o status a cada requisição.
# 2) main.py: app.include_router(alunos.router)
# 3) relatorios.py: acrescentar `status: StatusUsuario` ao AlunoResumo e ao select.
# ---------------------------------------------------------------------------
