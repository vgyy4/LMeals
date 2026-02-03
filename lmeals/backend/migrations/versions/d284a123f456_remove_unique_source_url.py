"""Remove unique constraint from source_url

Revision ID: d284a123f456
Revises: c729e504e62f
Create Date: 2026-02-02 21:42:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd284a123f456'
down_revision = 'c729e504e62f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite requires batch mode for index/constraint changes
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_index('ix_recipes_source_url')
        batch_op.create_index('ix_recipes_source_url', ['source_url'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_index('ix_recipes_source_url')
        batch_op.create_index('ix_recipes_source_url', ['source_url'], unique=True)
