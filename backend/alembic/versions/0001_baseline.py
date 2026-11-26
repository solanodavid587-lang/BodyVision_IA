from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None


def upgrade():
    op.create_table('audit_events',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('actor_id', sa.String(length=36), nullable=False),
    sa.Column('action', sa.String(length=128), nullable=False),
    sa.Column('resource', sa.String(length=255), nullable=False),
    sa.Column('outcome', sa.String(length=32), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('profiles',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organization_id', sa.String(length=36), nullable=True),
    sa.Column('display_code', sa.String(length=64), nullable=False),
    sa.Column('display_name', sa.String(length=255), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('display_code')
    )
    op.create_index(op.f('ix_profiles_organization_id'), 'profiles', ['organization_id'], unique=False)
    op.create_table('consents',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('profile_id', sa.String(length=36), nullable=False),
    sa.Column('purpose', sa.String(length=128), nullable=False),
    sa.Column('policy_version', sa.String(length=32), nullable=False),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_consents_profile_id'), 'consents', ['profile_id'], unique=False)
    op.create_table('measurements',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('profile_id', sa.String(length=36), nullable=False),
    sa.Column('metric_code', sa.String(length=64), nullable=False),
    sa.Column('value', sa.Float(), nullable=False),
    sa.Column('unit', sa.String(length=16), nullable=False),
    sa.Column('method', sa.String(length=32), nullable=False),
    sa.Column('measured_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_by', sa.String(length=36), nullable=False),
    sa.Column('supersedes_id', sa.String(length=36), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_measurements_metric_code'), 'measurements', ['metric_code'], unique=False)
    op.create_index(op.f('ix_measurements_profile_id'), 'measurements', ['profile_id'], unique=False)
