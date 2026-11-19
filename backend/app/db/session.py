from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

engine_options = {"pool_pre_ping": True}
if settings.database_url.startswith("sqlite"):
	engine_options["connect_args"] = {"check_same_thread": False}
	if ":memory:" in settings.database_url:
		engine_options["poolclass"] = StaticPool

engine = create_engine(settings.database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
	database = SessionLocal()
	try:
		yield database
	finally:
		database.close()
