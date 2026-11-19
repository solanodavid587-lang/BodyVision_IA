import logging

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import User  # noqa: F401 - registers ORM metadata

logger = logging.getLogger(__name__)


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    if not settings.initial_admin_dni or not settings.initial_admin_password:
        logger.warning("No initial administrator configured; user login is unavailable.")
        return

    with SessionLocal() as database:
        existing = database.scalar(
            select(User).where(User.dni == settings.initial_admin_dni)
        )
        if existing is None:
            database.add(
                User(
                    dni=settings.initial_admin_dni,
                    full_name=settings.initial_admin_name,
                    password_hash=hash_password(settings.initial_admin_password),
                    role="admin",
                    is_active=True,
                )
            )
            database.commit()