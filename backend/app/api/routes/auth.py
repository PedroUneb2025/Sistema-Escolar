import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.limitador_login import limitador_login
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.usuario import StatusUsuario, Usuario
from app.schemas.auth import Token, UsuarioRead

router = APIRouter(prefix="/auth", tags=["auth"])

# Vai para o log do uvicorn; é também por aqui que se confere qual IP a API enxerga.
logger = logging.getLogger("uvicorn.error")


def _ip_do_cliente(request: Request) -> str:
    """IP que o uvicorn enxerga. Atrás de túnel/proxy ele só vira o IP real se o
    uvicorn confiar no proxy (--proxy-headers e --forwarded-allow-ips). Não leio
    X-Forwarded-For na mão, porque qualquer pessoa poderia inventar esse cabeçalho
    para trocar de IP a cada tentativa."""
    return request.client.host if request.client else "desconhecido"


def _muitas_tentativas(segundos: int) -> HTTPException:
    minutos = max(1, math.ceil(segundos / 60))
    unidade = "minuto" if minutos == 1 else "minutos"
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Muitas tentativas. Tente de novo em {minutos} {unidade}",
        headers={"Retry-After": str(segundos)},
    )


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # form.username carrega o e-mail (OAuth2PasswordRequestForm sempre usa
    # esse nome de campo; o front envia como application/x-www-form-urlencoded).
    ip = _ip_do_cliente(request)
    chave = limitador_login.chave(form.username, ip)

    # Durante a espera nem a senha certa passa, e a tentativa não é nem avaliada.
    espera = limitador_login.segundos_restantes(chave)
    if espera:
        raise _muitas_tentativas(espera)

    usuario = db.scalar(select(Usuario).where(Usuario.email == form.username))

    credenciais_invalidas = HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciais inválidas")

    # Toda falha conta (e-mail que não existe, senha errada ou conta inativa), para não
    # revelar quais contas existem. A mensagem é genérica de propósito.
    if (
        usuario is None
        or not verify_password(form.password, usuario.senha_hash)
        or usuario.status != StatusUsuario.ativo
    ):
        espera = limitador_login.registrar_falha(chave)
        if espera:
            logger.warning(
                "login bloqueado: ip=%s falhas_seguidas=%s espera=%ss",
                ip, limitador_login.falhas_seguidas(chave), espera,
            )
            raise _muitas_tentativas(espera)
        raise credenciais_invalidas

    limitador_login.registrar_sucesso(chave)
    token = create_access_token(usuario.id_usuario, usuario.nomes_perfis)
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def me(usuario_atual: Usuario = Depends(get_current_user)):
    return UsuarioRead.from_orm_usuario(usuario_atual)
