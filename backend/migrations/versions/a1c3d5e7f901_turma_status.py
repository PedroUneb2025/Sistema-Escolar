"""turma: coluna status (aberta, fechada, cancelada)

Revision ID: a1c3d5e7f901
Revises: e56c53147d20
Create Date: 2026-11-03 10:30:00.000000

ATENÇÃO: confirmar com o DBA antes de aplicar. Se o DBA aplicar o ALTER TABLE
por SQL, rode `alembic stamp head` em vez de `alembic upgrade head`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c3d5e7f901'
down_revision: Union[str, Sequence[str], None] = 'e56c53147d20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'turma',
        sa.Column(
            'status',
            sa.Enum('aberta', 'fechada', 'cancelada', name='statusturma'),
            nullable=False,
            server_default='aberta',
        ),
    )


def downgrade() -> None:
    op.drop_column('turma', 'status')
