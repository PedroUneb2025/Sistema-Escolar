# Destino: backend/app/schemas/aluno.py
from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.models.usuario import StatusUsuario
from app.schemas.usuarios import _normalizar_cpf  # AJUSTE: módulo onde está o AlunoCreate


class AlunoDetalhe(BaseModel):
    """Resposta de GET/PUT/PATCH. O CPF só aparece aqui, nunca na lista."""

    id_aluno: int
    email: str
    status: StatusUsuario
    matricula: str
    nome_completo: str
    cpf: str
    data_nascimento: date
    telefone: str | None = None


class AlunoUpdate(BaseModel):
    """PUT: e-mail e senha não mudam por aqui (campos extras são ignorados)."""

    matricula: str = Field(min_length=1, max_length=30)
    nome_completo: str = Field(min_length=3, max_length=150)
    cpf: str
    data_nascimento: date
    telefone: str | None = Field(default=None, max_length=20)

    _cpf = field_validator("cpf", mode="before")(_normalizar_cpf)


class AlunoStatusUpdate(BaseModel):
    status: StatusUsuario
