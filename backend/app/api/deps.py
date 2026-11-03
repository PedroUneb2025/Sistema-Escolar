import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.usuario import StatusUsuario, Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    credenciais_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        id_usuario = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise credenciais_invalidas

    usuario = db.get(Usuario, id_usuario)
    if usuario is None or usuario.status != StatusUsuario.ativo:
        raise credenciais_invalidas
    return usuario


def require_perfis(*perfis_permitidos: str):
    """Uso: Depends(require_perfis("secretaria", "admin"))"""

    def checker(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if not set(usuario.nomes_perfis) & set(perfis_permitidos):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão para este recurso")
        return usuario

    return checker
