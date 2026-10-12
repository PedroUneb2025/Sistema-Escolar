from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.usuario import StatusUsuario, Usuario
from app.schemas.auth import Token, UsuarioRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # form.username carrega o e-mail (OAuth2PasswordRequestForm sempre usa
    # esse nome de campo; o front envia como application/x-www-form-urlencoded).
    usuario = db.scalar(select(Usuario).where(Usuario.email == form.username))

    credenciais_invalidas = HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciais inválidas")

    if usuario is None or not verify_password(form.password, usuario.senha_hash):
        raise credenciais_invalidas
    if usuario.status != StatusUsuario.ativo:
        # Mensagem genérica de propósito: não revela se a conta existe/está bloqueada.
        raise credenciais_invalidas

    token = create_access_token(usuario.id_usuario, usuario.nomes_perfis)
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def me(usuario_atual: Usuario = Depends(get_current_user)):
    return UsuarioRead.from_orm_usuario(usuario_atual)
