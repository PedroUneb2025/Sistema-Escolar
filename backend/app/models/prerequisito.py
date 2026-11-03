from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DisciplinaPrerequisito(Base):
    """'id_disciplina' exige que o aluno tenha sido aprovado em 'id_prerequisito'."""

    __tablename__ = "disciplina_prerequisito"
    __table_args__ = (
        CheckConstraint("id_disciplina <> id_prerequisito", name="chk_nao_autoreferencia"),
    )

    id_disciplina: Mapped[int] = mapped_column(
        ForeignKey("disciplina.id_disciplina", ondelete="CASCADE"), primary_key=True
    )
    id_prerequisito: Mapped[int] = mapped_column(
        ForeignKey("disciplina.id_disciplina", ondelete="CASCADE"), primary_key=True
    )
