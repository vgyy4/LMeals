"""Add instruction_template to recipes

Revision ID: bbc46b7f9f68
Revises: f1234567890a
Create Date: 2026-01-22 12:51:46.940447

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbc46b7f9f68'
down_revision: Union[str, Sequence[str], None] = 'f1234567890a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('instruction_template', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_column('instruction_template')
