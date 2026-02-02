"""Add active_time and total_time to recipes

Revision ID: c729e504e62f
Revises: b618d493d51e
Create Date: 2026-02-02 18:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c729e504e62f'
down_revision = 'b618d493d51e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('recipes', sa.Column('active_time', sa.String(), nullable=True))
    op.add_column('recipes', sa.Column('total_time', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('recipes', 'total_time')
    op.drop_column('recipes', 'active_time')
