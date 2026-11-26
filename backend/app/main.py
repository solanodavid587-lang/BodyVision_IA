from contextlib import asynccontextmanager
import logging
from uuid import uuid4
from sqlalchemy import text
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes.profiles import router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models.entities import Profile, Measurement, Consent, AuditEvent

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.demo_mode:
        Base.metadata.create_all(bind=engine)
    else:
        with engine.connect() as connection:
            if connection.execute(text('SELECT version_num FROM alembic_version')).scalar() != '0002':
                raise RuntimeError('Ejecuta alembic upgrade head antes de iniciar la API.')

    yield


app = FastAPI(title='BODYVISION AI API', version='4.0.0', openapi_url='/api/openapi.json', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(router, prefix='/api/v1')


@app.exception_handler(Exception)
async def internal_error(request: Request, exc: Exception):
    correlation_id = str(uuid4())
    logging.getLogger('bodyvision').error('request_failed id=%s type=%s', correlation_id, type(exc).__name__)
    return JSONResponse(status_code=500, content={'code': 'INTERNAL_ERROR', 'message': 'Error interno del servidor.', 'correlation_id': correlation_id})


@app.get('/api/v1/ready')
def readiness():
    with engine.connect() as connection:
        connection.execute(text('SELECT 1'))
    return {'status': 'ready'}


@app.middleware('http')
async def private_responses(request: Request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response
