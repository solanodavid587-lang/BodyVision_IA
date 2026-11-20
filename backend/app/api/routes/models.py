from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import AuditEvent, Consent, ModelGeneration, Profile
from app.services.rodin import RodinError, download_generation, get_generation_status, submit_generation

router = APIRouter()
CONSENT_PURPOSE = 'captura_corporal_y_analisis_visual'
ACTIVE_STATES = {'Waiting', 'Generating'}


@router.get('/models/provider-status')
def get_model_provider_status():
    return {'provider': 'Hyper3D/Rodin', 'configured': bool(settings.rodin_api_key)}


def _generation_response(generation: ModelGeneration) -> dict:
    return {
        'id': generation.id,
        'profile_id': generation.profile_id,
        'provider': generation.provider,
        'status': generation.status,
        'model_url': f'/api/v1/models/{generation.id}/asset' if generation.status == 'Done' else None,
        'error_message': generation.error_message,
        'created_at': generation.created_at,
        'updated_at': generation.updated_at,
    }


@router.post('/profiles/{profile_id}/models', status_code=202)
def create_model_generation(
    profile_id: str,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not settings.rodin_api_key:
        raise HTTPException(status_code=503, detail={'code': 'PROVIDER_NOT_CONFIGURED', 'message': 'La generación 3D requiere configurar RODIN_API_KEY en el backend.'})
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})

    consent = db.scalars(
        select(Consent)
        .where(
            Consent.profile_id == profile_id,
            Consent.purpose == CONSENT_PURPOSE,
            Consent.revoked_at.is_(None),
        )
        .order_by(Consent.accepted_at.desc())
    ).first()
    if not consent:
        raise HTTPException(status_code=403, detail={'code': 'CONSENT_REQUIRED', 'message': 'Se requiere consentimiento vigente para enviar la imagen a Rodin.'})

    if image.content_type not in {'image/jpeg', 'image/png'}:
        raise HTTPException(status_code=415, detail={'code': 'INVALID_IMAGE', 'message': 'Sube una imagen JPEG o PNG.'})
    content = image.file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not content:
        raise HTTPException(status_code=400, detail={'code': 'EMPTY_IMAGE', 'message': 'El archivo está vacío.'})
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail={'code': 'IMAGE_TOO_LARGE', 'message': f'La imagen supera el límite de {settings.max_upload_mb} MB.'})
    if not (content.startswith(b'\xff\xd8\xff') if image.content_type == 'image/jpeg' else content.startswith(b'\x89PNG\r\n\x1a\n')):
        raise HTTPException(status_code=415, detail={'code': 'INVALID_IMAGE', 'message': 'El contenido del archivo no coincide con su formato.'})

    generation_id = str(uuid4())
    try:
        task_uuid, subscription_key = submit_generation(content, image.filename or 'capture.jpg', image.content_type)
    except RodinError as error:
        raise HTTPException(status_code=502, detail={'code': 'RODIN_ERROR', 'message': str(error)}) from error

    generation = ModelGeneration(
        id=generation_id,
        profile_id=profile_id,
        task_uuid=task_uuid,
        subscription_key=subscription_key,
        status='Waiting',
    )
    db.add(generation)
    db.add(AuditEvent(actor_id='starter-user', action='model_generation.create', resource=f'/models/{generation_id}', outcome='success'))
    db.commit()
    db.refresh(generation)
    return _generation_response(generation)


@router.get('/models/{generation_id}')
def get_model_generation(generation_id: str, db: Session = Depends(get_db)):
    generation = db.get(ModelGeneration, generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Generación inexistente.'})
    if generation.status in ACTIVE_STATES:
        now = datetime.now(timezone.utc)
        last_poll = generation.last_polled_at
        if last_poll and (now - last_poll.replace(tzinfo=timezone.utc)).total_seconds() < 5:
            return _generation_response(generation)
        generation.last_polled_at = now
        try:
            states = get_generation_status(generation.subscription_key)
            if 'Failed' in states:
                generation.status = 'Failed'
                generation.error_message = 'Rodin no pudo generar el modelo. Puedes probar con otra imagen de cuerpo completo y buena iluminación.'
            elif states and all(state == 'Done' for state in states):
                generation.model_filename = download_generation(generation.task_uuid, generation.id)
                generation.status = 'Done'
            else:
                generation.status = 'Generating' if 'Generating' in states else 'Waiting'
            db.commit()
        except RodinError as error:
            db.rollback()
            raise HTTPException(status_code=502, detail={'code': 'RODIN_ERROR', 'message': str(error)}) from error
    return _generation_response(generation)


@router.get('/models/{generation_id}/asset')
def get_model_asset(generation_id: str, db: Session = Depends(get_db)):
    generation = db.get(ModelGeneration, generation_id)
    if not generation or generation.status != 'Done' or not generation.model_filename:
        raise HTTPException(status_code=404, detail={'code': 'MODEL_NOT_READY', 'message': 'El modelo todavía no está disponible.'})
    storage = Path(settings.rodin_storage_dir).resolve()
    asset = (storage / generation.model_filename).resolve()
    if asset.parent != storage or not asset.is_file():
        raise HTTPException(status_code=404, detail={'code': 'MODEL_NOT_FOUND', 'message': 'No se encontró el archivo del modelo.'})
    return FileResponse(asset, media_type='model/gltf-binary', filename='bodyvision-model.glb')
