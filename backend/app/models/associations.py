from sqlalchemy import Column, DateTime, ForeignKey, Table, func

from app.db.base import Base

# Espelha exatamente o DDL do DBA: PK composta, sem coluna 'id' própria.
usuario_perfil = Table(
    "usuario_perfil",
    Base.metadata,
    Column("id_perfil", ForeignKey("perfil.id_perfil", ondelete="CASCADE"), primary_key=True),
    Column("id_usuario", ForeignKey("usuario.id_usuario", ondelete="CASCADE"), primary_key=True),
    Column("atribuido_em", DateTime, nullable=False, server_default=func.now()),
)

perfil_permissao = Table(
    "perfil_permissao",
    Base.metadata,
    Column("id_perfil", ForeignKey("perfil.id_perfil", ondelete="CASCADE"), primary_key=True),
    Column("id_permissao", ForeignKey("permissao.id_permissao", ondelete="CASCADE"), primary_key=True),
)
