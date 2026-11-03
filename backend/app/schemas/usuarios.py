import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


def _normalizar_cpf(valor: str) -> str:
    """Aceita '123.456.789-09' ou '12345678909' e guarda só os 11 dígitos.

    Não valida os dígitos verificadores de propósito (facilita dados de teste);
    se o time quiser validar de verdade, é só incluir o cálculo aqui.
    """
    digitos = re.sub(r"\D", "", str(valor))
    if len(digitos) != 11:
        raise ValueError("CPF deve ter 11 dígitos")
    return digitos


class _ContaBase(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _email_minusculo(cls, v: str) -> str:
        return v.strip().lower()


class AlunoCreate(_ContaBase):
    matricula: str = Field(min_length=1, max_length=30)
    nome_completo: str = Field(min_length=3, max_length=150)
    cpf: str
    data_nascimento: date
    telefone: str | None = Field(default=None, max_length=20)

    _cpf = field_validator("cpf", mode="before")(_normalizar_cpf)


class ProfessorCreate(_ContaBase):
    matricula_funcional: str = Field(min_length=1, max_length=30)
    nome_completo: str = Field(min_length=3, max_length=150)
    cpf: str
    titulacao: str | None = Field(default=None, max_length=50)

    _cpf = field_validator("cpf", mode="before")(_normalizar_cpf)


class FuncionarioCreate(_ContaBase):
    # ALUNO e PROFESSOR ficam de fora: eles têm rotas próprias, que criam
    # também o registro de aluno/professor.
    perfis: list[Literal["ADMIN", "SECRETARIA", "COORDENACAO", "FINANCEIRO"]] = Field(min_length=1)


class UsuarioCriado(BaseModel):
    id_usuario: int
    email: EmailStr
    perfis: list[str]
    id_aluno: int | None = None
    id_professor: int | None = None
    nome_completo: str | None = None
