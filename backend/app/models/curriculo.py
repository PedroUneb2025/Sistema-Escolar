from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Curso(Base):
    __tablename__ = "curso"

    id_curso: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    grau: Mapped[str] = mapped_column(String(50), nullable=False)


class Disciplina(Base):
    __tablename__ = "disciplina"

    id_disciplina: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    ementa: Mapped[str | None] = mapped_column(Text)


class MatrizCurricular(Base):
    __tablename__ = "matriz_curricular"
    __table_args__ = (UniqueConstraint("id_curso", "versao_ano", name="uk_matriz_curso_versao"),)

    id_matriz: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_curso: Mapped[int] = mapped_column(ForeignKey("curso.id_curso"), nullable=False)
    versao_ano: Mapped[str] = mapped_column(String(10), nullable=False)
    carga_horaria_total: Mapped[int] = mapped_column(Integer, nullable=False)
    # Há triggers no banco (trg_matriz_curricular_unica_ativa_bi/bu) garantindo
    # que só uma matriz fique ativa por curso — não duplique essa regra na
    # aplicação, só respeite-a (ex: ao ativar uma nova, as outras do mesmo
    # curso são desativadas automaticamente pelo MySQL).
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    curso: Mapped["Curso"] = relationship(lazy="joined")


class MatrizDisciplina(Base):
    __tablename__ = "matriz_disciplina"

    id_matriz: Mapped[int] = mapped_column(
        ForeignKey("matriz_curricular.id_matriz", ondelete="RESTRICT"), primary_key=True
    )
    id_disciplina: Mapped[int] = mapped_column(
        ForeignKey("disciplina.id_disciplina", ondelete="RESTRICT"), primary_key=True
    )
    semestre_ideal: Mapped[int] = mapped_column(Integer, nullable=False)
    carga_horaria: Mapped[int] = mapped_column(Integer, nullable=False)
    obrigatoria: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    disciplina: Mapped["Disciplina"] = relationship(lazy="joined")
