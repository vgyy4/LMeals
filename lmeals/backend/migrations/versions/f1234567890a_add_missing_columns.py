"""add_missing_columns

Revision ID: f1234567890a
Revises: e8f9a7b3c4d1
Create Date: 2026-01-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1234567890a'
down_revision = 'e8f9a7b3c4d1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add meal_type to meal_plan_entries
    with op.batch_alter_table('meal_plan_entries', schema=None) as batch_op:
        # Check if column exists is hard in generic alembic without inspection,
        # but since we assume fresh install or broken state, we'll try to add it.
        # SQLite doesn't support 'ADD COLUMN IF NOT EXISTS' easily via Alembic 
        # without inspection.
        # However, typically 'add_column' is fine.
        batch_op.add_column(sa.Column('meal_type', sa.String(), nullable=True, server_default='Dinner'))

    # Add keywords to allergens
    with op.batch_alter_table('allergens', schema=None) as batch_op:
        batch_op.add_column(sa.Column('keywords', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('allergens', schema=None) as batch_op:
        batch_op.drop_column('keywords')

    with op.batch_alter_table('meal_plan_entries', schema=None) as batch_op:
        batch_op.drop_column('meal_type')
