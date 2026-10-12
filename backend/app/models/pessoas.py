from sqlalchemy import CHAR, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Aluno(Base):
    __tablename__ = "aluno"

    id_aluno: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuario.id_usuario"), unique=True, nullable=False)
    matricula: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nome_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    cpf: Mapped[str] = mapped_column(CHAR(11), unique=True, nullable=False)
    data_nascimento: Mapped[str] = mapped_column(Date, nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20))

    usuario = relationship("Usuario", lazy="joined")


class Professor(Base):
    __tablename__ = "professor"

    id_professor: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuario.id_usuario"), unique=True, nullable=False)
    matricula_funcional: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nome_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    cpf: Mapped[str] = mapped_column(CHAR(11), unique=True, nullable=False)
    titulacao: Mapped[str | None] = mapped_column(String(50))

    usuario = relationship("Usuario", lazy="joined")
