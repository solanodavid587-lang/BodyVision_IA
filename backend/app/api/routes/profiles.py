from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.identity import Actor, identity
from app.core.config import settings
from app.db.session import get_db
from app.demo_data import DEMO_MEASUREMENTS_BY_PROFILE, DEMO_PROFILE, DEMO_PROFILES
from app.models.entities import AuditEvent, Consent, Measurement, Profile
from app.schemas.contracts import ConsentCreate, ConsentOut, MeasurementCreate, MeasurementOut, ProfileCreate, ProfileOut

router = APIRouter()

METRIC_UNITS = {
    'height': {'m', 'cm'},
    'weight': {'kg'},
    'waist': {'cm', 'm'},
    'hip': {'cm', 'm'},
    'chest': {'cm', 'm'},
    'body_fat_pct': {'%'},
    'muscle_mass_pct': {'%'},
}


def _validate_measurement(payload: MeasurementCreate) -> None:
    if payload.metric_code not in METRIC_UNITS:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'Métrica no admitida.'})
    if payload.method not in {'manual', 'device', 'visual_estimate'}:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'Método de medición no admitido.'})
    if payload.unit not in METRIC_UNITS[payload.metric_code]:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'Unidad incompatible con la métrica.'})
    percentage = payload.metric_code in {'body_fat_pct', 'muscle_mass_pct'}
    if not percentage and payload.value <= 0:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'La medición debe ser mayor que cero.'})
    if percentage and payload.method == 'visual_estimate':
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'El porcentaje requiere una medición independiente.'})
    if percentage and payload.value > 100:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'El porcentaje debe estar entre 0 y 100.'})


def visible_profiles(actor: Actor):
    query = select(Profile).where(Profile.organization_id == actor.organization, Profile.owner_id.is_not(None))
    if 'bodyvision:admin' not in actor.scopes:
        query = query.where(Profile.owner_id == actor.id)
    return query


def require_profile(db: Session, actor: Actor, profile_id: str):
    profile = db.scalar(visible_profiles(actor).where(Profile.id == profile_id).with_for_update())
    if profile is None:
        raise HTTPException(404, 'Expediente inexistente.')
    return profile


def require_consent(db: Session, profile_id: str, purpose: str):
    latest = db.scalar(select(Consent).where(Consent.profile_id == profile_id, Consent.purpose == purpose)
                       .order_by(Consent.accepted_at.desc(), Consent.id.desc()).limit(1))
    if not latest or latest.revoked_at is not None or latest.policy_version != '1.0':
        raise HTTPException(403, 'Se requiere consentimiento vigente.')


def _audit(db: Session, actor: Actor, action: str, resource: str) -> None:
    db.add(AuditEvent(actor_id=actor.id, action=action, resource=resource, outcome='success'))


@router.get('/health')
def health():
    return {'status': 'ok', 'service': 'bodyvision-api', 'version': '4.0', 'demo_mode': settings.demo_mode}


@router.get('/profiles', response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        return DEMO_PROFILES
    return db.scalars(visible_profiles(actor).order_by(Profile.created_at.desc())).all()


@router.post('/profiles', response_model=ProfileOut, status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración usa datos sintéticos de solo lectura.'})
    profile = Profile(owner_id=actor.id, organization_id=actor.organization, **payload.model_dump())
    db.add(profile)
    try:
        db.flush()
        _audit(db, actor, 'profile.create', f'/profiles/{profile.id}')
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail={'code': 'CONFLICT', 'message': 'El código de expediente ya existe.'}) from error
    db.refresh(profile)
    return profile


@router.get('/profiles/{profile_id}/measurements', response_model=list[MeasurementOut])
def list_measurements(profile_id: str, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        if profile_id not in DEMO_MEASUREMENTS_BY_PROFILE:
            raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
        return DEMO_MEASUREMENTS_BY_PROFILE[profile_id]
    require_profile(db, actor, profile_id)
    return db.scalars(
        select(Measurement)
        .where(Measurement.profile_id == profile_id)
        .order_by(Measurement.measured_at.asc(), Measurement.created_at.asc())
    ).all()


@router.post('/profiles/{profile_id}/measurements', response_model=MeasurementOut, status_code=201)
def create_measurement(profile_id: str, payload: MeasurementCreate, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración usa datos sintéticos de solo lectura.'})
    require_profile(db, actor, profile_id)
    _validate_measurement(payload)
    require_consent(db, profile_id, "measurements")
    measurement = Measurement(profile_id=profile_id, created_by=actor.id, **payload.model_dump())
    db.add(measurement)
    db.flush()
    _audit(db, actor, 'measurement.create', f'/measurements/{measurement.id}')
    db.commit()
    db.refresh(measurement)
    return measurement


@router.post('/profiles/{profile_id}/measurements/{measurement_id}/corrections', response_model=MeasurementOut, status_code=201)
def correct_measurement(profile_id: str, measurement_id: str, payload: MeasurementCreate, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración usa datos sintéticos de solo lectura.'})
    require_profile(db, actor, profile_id)
    previous = db.get(Measurement, measurement_id)
    if not previous or previous.profile_id != profile_id:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Medición inexistente.'})
    if previous.metric_code != payload.metric_code:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'La corrección debe conservar la métrica original.'})
    if db.scalar(select(Measurement.id).where(Measurement.supersedes_id == previous.id)):
        raise HTTPException(status_code=409, detail={'code': 'ALREADY_CORRECTED', 'message': 'La medición ya tiene una corrección.'})
    _validate_measurement(payload)
    require_consent(db, profile_id, "measurements")
    correction = Measurement(
        profile_id=profile_id,
        created_by=actor.id,
        supersedes_id=previous.id,
        **payload.model_dump(),
    )
    db.add(correction)
    db.flush()
    _audit(db, actor, 'measurement.correct', f'/measurements/{correction.id}')
    db.commit()
    db.refresh(correction)
    return correction


@router.get('/profiles/{profile_id}/consents', response_model=list[ConsentOut])
def list_consents(profile_id: str, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        if profile_id != DEMO_PROFILE['id']:
            raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
        return []
    require_profile(db, actor, profile_id)
    return db.scalars(select(Consent).where(Consent.profile_id == profile_id).order_by(Consent.accepted_at.asc(), Consent.id.asc())).all()


@router.post('/profiles/{profile_id}/consents', response_model=ConsentOut, status_code=201)
def register_consent(profile_id: str, payload: ConsentCreate, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración no registra consentimientos reales.'})
    require_profile(db, actor, profile_id)
    if payload.purpose not in {'measurements', 'body_capture', 'face_capture', 'pose_analysis'} or payload.policy_version != '1.0':
        raise HTTPException(422, 'Finalidad o versión de consentimiento desconocida.')
    consent = Consent(profile_id=profile_id, accepted_at=datetime.now(timezone.utc), **payload.model_dump())
    db.add(consent)
    db.flush()
    _audit(db, actor, 'consent.accept', f'/consents/{consent.id}')
    db.commit()
    db.refresh(consent)
    return consent


@router.post('/profiles/{profile_id}/consents/{consent_id}/revoke', response_model=ConsentOut)
def revoke_consent(profile_id: str, consent_id: str, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración no modifica consentimientos.'})
    require_profile(db, actor, profile_id)
    consent = db.get(Consent, consent_id)
    if not consent or consent.profile_id != profile_id:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Consentimiento inexistente.'})
    if consent.revoked_at is None:
        consent.revoked_at = datetime.now(timezone.utc)
        _audit(db, actor, 'consent.revoke', f'/consents/{consent.id}')
        db.commit()
        db.refresh(consent)
    return consent


@router.get('/profiles/{profile_id}/processing/{purpose}', status_code=204)
def processing_status(profile_id: str, purpose: str, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    if settings.demo_mode or purpose not in {'body_capture', 'face_capture', 'pose_analysis'}:
        raise HTTPException(403, 'Procesamiento no disponible.')
    require_profile(db, actor, profile_id)
    require_consent(db, profile_id, purpose)


@router.post('/profiles/{profile_id}/processing/{purpose}', status_code=204)
def authorize_processing(profile_id: str, purpose: str, db: Session = Depends(get_db), actor: Actor = Depends(identity)):
    processing_status(profile_id, purpose, db, actor)
    _audit(db, actor, 'processing.authorize', f'/profiles/{profile_id}/{purpose}')
    db.commit()
