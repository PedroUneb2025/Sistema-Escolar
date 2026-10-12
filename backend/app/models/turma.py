import enum
from datetime import time

from sqlalchemy import ForeignKey, Integer, Numeric, String, Time, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.curriculo import Disciplina
from app.models.pessoas import Professor
from app.models.sala import Sala


class DiaSemana(str, enum.Enum):
    SEG = "SEG"
    TER = "TER"
    QUA = "QUA"
    QUI = "QUI"
    SEX = "SEX"
    SAB = "SAB"


class SituacaoMatricula(str, enum.Enum):
    matriculado = "matriculado"
    aprovado = "aprovado"
    reprovado_nota = "reprovado_nota"
    reprovado_falta = "reprovado_falta"
    trancado = "trancado"


class Turma(Base):
    __tablename__ = "turma"

    id_turma: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_disciplina: Mapped[int] = mapped_column(ForeignKey("disciplina.id_disciplina"), nullable=False)
    id_professor: Mapped[int] = mapped_column(ForeignKey("professor.id_professor"), nullable=False)
    id_sala: Mapped[int] = mapped_column(ForeignKey("sala.id_sala"), nullable=False)
    semestre_letivo: Mapped[str] = mapped_column(String(10), nullable=False)
    codigo_turma: Mapped[str] = mapped_column(String(20), nullable=False)
    dia_semana: Mapped[DiaSemana] = mapped_column(
        SAEnum(DiaSemana, native_enum=True, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    hora_inicio: Mapped[time] = mapped_column(Time, nullable=False)
    hora_fim: Mapped[time] = mapped_column(Time, nullable=False)
    vagas_totais: Mapped[int] = mapped_column(Integer, nullable=False)

    disciplina: Mapped[Disciplina] = relationship(lazy="joined")
    professor: Mapped[Professor] = relationship(lazy="joined")
    sala: Mapped[Sala] = relationship(lazy="joined")


class MatriculaTurma(Base):
    __tablename__ = "matricula_turma"
    __table_args__ = (UniqueConstraint("id_aluno", "id_turma", name="uk_aluno_turma"),)

    id_matricula_turma: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_aluno: Mapped[int] = mapped_column(ForeignKey("aluno.id_aluno"), nullable=False)
    id_turma: Mapped[int] = mapped_column(ForeignKey("turma.id_turma"), nullable=False)
    nota_final: Mapped[float | None] = mapped_column(Numeric(4, 2))
    frequencia: Mapped[float | None] = mapped_column(Numeric(5, 2))
    situacao: Mapped[SituacaoMatricula] = mapped_column(
        SAEnum(SituacaoMatricula, native_enum=True, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=SituacaoMatricula.matriculado,
    )
