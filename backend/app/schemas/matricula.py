from datetime import time

from pydantic import BaseModel, ConfigDict

from app.models.turma import DiaSemana, SituacaoMatricula


class MatriculaCreate(BaseModel):
    id_turma: int
    # Aluno logado: ignorado/validado (a matrícula é sempre dele mesmo).
    # Secretaria/Admin: obrigatório (quem será matriculado).
    id_aluno: int | None = None


class MatriculaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_matricula_turma: int
    id_aluno: int
    id_turma: int
    nota_final: float | None
    frequencia: float | None
    situacao: SituacaoMatricula


class MatriculaDetalhe(BaseModel):
    """Uma matrícula do aluno já com os dados da turma (para o painel de consulta)."""

    id_matricula_turma: int
    id_turma: int
    codigo_turma: str
    semestre_letivo: str
    disciplina_codigo: str
    disciplina_nome: str
    professor_nome: str
    sala_codigo: str
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fim: time
    nota_final: float | None
    frequencia: float | None
    situacao: SituacaoMatricula
