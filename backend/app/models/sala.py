from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Sala(Base):
    __tablename__ = "sala"

    id_sala: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    bloco_predio: Mapped[str] = mapped_column(String(50), nullable=False)
    capacidade: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, default="AULA")
