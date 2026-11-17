from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.usuarios import _normalizar_cpf


class ProfessorResumo(BaseModel):
    """Item da listagem GET /professores (sem CPF, RNF02)."""

    id_professor: int
    nome_completo: str
    matricula_funcional: str
    email: str
    titulacao: str | None
    status: str  # ativo | inativo | bloqueado


class ProfessorRead(ProfessorResumo):
    """Detalhe GET /professores/{id}: inclui o CPF (11 dígitos), só para gestores."""

    id_usuario: int
    cpf: str


class ProfessorUpdate(BaseModel):
    """Corpo do PUT: substitui todos os campos editáveis (titulacao pode ser null)."""

    email: EmailStr
    matricula_funcional: str = Field(min_length=1, max_length=30)
    nome_completo: str = Field(min_length=3, max_length=150)
    cpf: str
    titulacao: str | None = Field(default=None, max_length=50)

    _cpf = field_validator("cpf", mode="before")(_normalizar_cpf)

    @field_validator("email")
    @classmethod
    def _email_minusculo(cls, v: str) -> str:
        return v.strip().lower()


class ProfessorPatch(BaseModel):
    """Corpo do PATCH: só os campos enviados mudam. Só titulacao aceita null."""

    email: EmailStr | None = None
    matricula_funcional: str | None = Field(default=None, min_length=1, max_length=30)
    nome_completo: str | None = Field(default=None, min_length=3, max_length=150)
    cpf: str | None = None
    titulacao: str | None = Field(default=None, max_length=50)

    @field_validator("cpf", mode="before")
    @classmethod
    def _cpf(cls, v):
        return None if v is None else _normalizar_cpf(v)

    @field_validator("email")
    @classmethod
    def _email_minusculo(cls, v: str | None) -> str | None:
        return None if v is None else v.strip().lower()


class ProfessorStatusUpdate(BaseModel):
    status: Literal["ativo", "inativo"]
