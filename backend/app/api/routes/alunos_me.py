# Destino: backend/app/api/routes/alunos_me.py
#
# GET /alunos/me: o aluno logado consulta o próprio cadastro (sem CPF).
# É um router separado porque o alunos.py exige perfil de gestor em todas as rotas.
# No main.py, este router PRECISA ser registrado ANTES do alunos.router; senão,
# "/alunos/me" cai em "/alunos/{id_aluno}" e dá 422 (ou 403 para o aluno).
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.db.session import get_db
from app.models.pessoas import Aluno
from app.models.usuario import StatusUsuario, Usuario

router = APIRouter(prefix="/alunos", tags=["alunos"])


class AlunoPerfil(BaseModel):
    """Dados do próprio aluno. O CPF não sai por aqui."""

    id_aluno: int
    email: str
    status: StatusUsuario
    matricula: str
    nome_completo: str


@router.get("/me", response_model=AlunoPerfil)
def meu_cadastro(
    usuario: Usuario = Depends(require_perfis("ALUNO")),
    db: Session = Depends(get_db),
):
    aluno = db.scalar(select(Aluno).where(Aluno.id_usuario == usuario.id_usuario))
    if aluno is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadastro de aluno não encontrado")
    return AlunoPerfil(
        id_aluno=aluno.id_aluno,
        email=usuario.email,
        status=usuario.status,
        matricula=aluno.matricula,
        nome_completo=aluno.nome_completo,
    )
