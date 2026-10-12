import enum
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.associations import usuario_perfil
from app.models.rbac import Perfil


class StatusUsuario(str, enum.Enum):
    ativo = "ativo"
    inativo = "inativo"
    bloqueado = "bloqueado"


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[StatusUsuario] = mapped_column(
        SAEnum(StatusUsuario, native_enum=True, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=StatusUsuario.ativo,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now())

    perfis: Mapped[list[Perfil]] = relationship(secondary=usuario_perfil, lazy="selectin")

    @property
    def nomes_perfis(self) -> list[str]:
        return [p.nome for p in self.perfis]
