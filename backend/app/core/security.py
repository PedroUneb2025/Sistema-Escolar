from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_hasher = PasswordHash.recommended()  # argon2


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, senha_hash: str) -> bool:
    return _hasher.verify(password, senha_hash)


def create_access_token(id_usuario: int, perfis: list[str]) -> str:
    expira_em = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(id_usuario), "perfis": perfis, "exp": expira_em}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    # Deixa jwt.ExpiredSignatureError / jwt.InvalidTokenError propagarem;
    # quem chama (deps.py) decide o HTTPException.
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
