"""Add optional unique email field to Lecturer

Revision ID: 75b6d8a9f123
Revises: 
Create Date: 2025-10-31 11:42:53.967731

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '75b6d8a9f123'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email column as nullable (optional)
    op.add_column('lecturers', sa.Column('email', sa.String(), nullable=True))
    
    # Add unique constraint that only applies to non-null values
    op.create_unique_constraint('uq_lecturers_email', 'lecturers', ['email'])


def downgrade() -> None:
    # Remove the unique constraint
    op.drop_constraint('uq_lecturers_email', 'lecturers', type_='unique')
    
    # Remove the email column
    op.drop_column('lecturers', 'email')