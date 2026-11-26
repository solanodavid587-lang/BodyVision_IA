from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'


def upgrade():
    op.add_column('profiles', sa.Column('owner_id', sa.String(36), nullable=True))
    op.create_index('ix_profiles_owner_id', 'profiles', ['owner_id'])
