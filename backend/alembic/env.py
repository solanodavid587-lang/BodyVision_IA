from alembic import context
from app.db.session import engine
from app.db.base import Base
from app.models import entities  # register table metadata


with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
