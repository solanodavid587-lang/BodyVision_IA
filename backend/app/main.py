from contextlib import asynccontextmanager
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
    Base.metadata.create_all(bind=engine)
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
    return JSONResponse(status_code=500, content={'code': 'INTERNAL_ERROR', 'message': 'Error interno del servidor.', 'correlation_id': request.headers.get('x-correlation-id', 'local')})
