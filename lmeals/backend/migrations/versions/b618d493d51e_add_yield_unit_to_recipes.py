"""Add yield_unit to recipes

Revision ID: b618d493d51e
Revises: bbc46b7f9f68
Create Date: 2026-01-22 14:07:35.932439

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b618d493d51e'
down_revision: Union[str, Sequence[str], None] = 'bbc46b7f9f68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('yield_unit', sa.String(), server_default='servings', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_column('yield_unit')
