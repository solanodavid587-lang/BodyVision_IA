from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
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
    if payload.metric_code in {'body_fat_pct', 'muscle_mass_pct'} and payload.value > 100:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'El porcentaje debe estar entre 0 y 100.'})


def _audit(db: Session, action: str, resource: str) -> None:
    db.add(AuditEvent(actor_id='starter-user', action=action, resource=resource, outcome='success'))


@router.get('/health')
def health():
    return {'status': 'ok', 'service': 'bodyvision-api', 'version': '4.0', 'demo_mode': settings.demo_mode}


@router.get('/profiles', response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    if settings.demo_mode:
        return DEMO_PROFILES
    return db.scalars(select(Profile).order_by(Profile.created_at.desc())).all()


@router.post('/profiles', response_model=ProfileOut, status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración usa datos sintéticos de solo lectura.'})
    profile = Profile(**payload.model_dump())
    db.add(profile)
    try:
        db.flush()
        _audit(db, 'profile.create', f'/profiles/{profile.id}')
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail={'code': 'CONFLICT', 'message': 'El código de expediente ya existe.'}) from error
    db.refresh(profile)
    return profile


@router.get('/profiles/{profile_id}/measurements', response_model=list[MeasurementOut])
def list_measurements(profile_id: str, db: Session = Depends(get_db)):
    if settings.demo_mode:
        if profile_id not in DEMO_MEASUREMENTS_BY_PROFILE:
            raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
        return DEMO_MEASUREMENTS_BY_PROFILE[profile_id]
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    return db.scalars(
        select(Measurement)
        .where(Measurement.profile_id == profile_id)
        .order_by(Measurement.measured_at.asc(), Measurement.created_at.asc())
    ).all()


@router.post('/profiles/{profile_id}/measurements', response_model=MeasurementOut, status_code=201)
def create_measurement(profile_id: str, payload: MeasurementCreate, db: Session = Depends(get_db)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración usa datos sintéticos de solo lectura.'})
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    _validate_measurement(payload)
    measurement = Measurement(profile_id=profile_id, created_by='starter-user', **payload.model_dump())
    db.add(measurement)
    db.flush()
    _audit(db, 'measurement.create', f'/measurements/{measurement.id}')
    db.commit()
    db.refresh(measurement)
    return measurement


@router.post('/profiles/{profile_id}/measurements/{measurement_id}/corrections', response_model=MeasurementOut, status_code=201)
def correct_measurement(profile_id: str, measurement_id: str, payload: MeasurementCreate, db: Session = Depends(get_db)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración usa datos sintéticos de solo lectura.'})
    previous = db.get(Measurement, measurement_id)
    if not previous or previous.profile_id != profile_id:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Medición inexistente.'})
    if previous.metric_code != payload.metric_code:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'La corrección debe conservar la métrica original.'})
    if db.scalar(select(Measurement.id).where(Measurement.supersedes_id == previous.id)):
        raise HTTPException(status_code=409, detail={'code': 'ALREADY_CORRECTED', 'message': 'La medición ya tiene una corrección.'})
    _validate_measurement(payload)
    correction = Measurement(
        profile_id=profile_id,
        created_by='starter-user',
        supersedes_id=previous.id,
        **payload.model_dump(),
    )
    db.add(correction)
    db.flush()
    _audit(db, 'measurement.correct', f'/measurements/{correction.id}')
    db.commit()
    db.refresh(correction)
    return correction


@router.get('/profiles/{profile_id}/consents', response_model=list[ConsentOut])
def list_consents(profile_id: str, db: Session = Depends(get_db)):
    if settings.demo_mode:
        if profile_id != DEMO_PROFILE['id']:
            raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
        return []
    if not db.get(Profile, profile_id):
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    return db.scalars(select(Consent).where(Consent.profile_id == profile_id).order_by(Consent.accepted_at.asc())).all()


@router.post('/profiles/{profile_id}/consents', response_model=ConsentOut, status_code=201)
def register_consent(profile_id: str, payload: ConsentCreate, db: Session = Depends(get_db)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración no registra consentimientos reales.'})
    if not db.get(Profile, profile_id):
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    consent = Consent(profile_id=profile_id, accepted_at=datetime.now(timezone.utc), **payload.model_dump())
    db.add(consent)
    db.flush()
    _audit(db, 'consent.accept', f'/consents/{consent.id}')
    db.commit()
    db.refresh(consent)
    return consent


@router.post('/profiles/{profile_id}/consents/{consent_id}/revoke', response_model=ConsentOut)
def revoke_consent(profile_id: str, consent_id: str, db: Session = Depends(get_db)):
    if settings.demo_mode:
        raise HTTPException(status_code=403, detail={'code': 'DEMO_READ_ONLY', 'message': 'El modo de demostración no modifica consentimientos.'})
    consent = db.get(Consent, consent_id)
    if not consent or consent.profile_id != profile_id:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Consentimiento inexistente.'})
    if consent.revoked_at is None:
        consent.revoked_at = datetime.now(timezone.utc)
        _audit(db, 'consent.revoke', f'/consents/{consent.id}')
        db.commit()
        db.refresh(consent)
    return consent
