from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import AuditEvent, Consent, Measurement, Profile
from app.schemas.contracts import ConsentCreate, MeasurementCreate, MeasurementOut, ProfileCreate, ProfileOut

router = APIRouter()


@router.get('/health')
def health():
    return {'status': 'ok', 'service': 'bodyvision-api', 'version': '4.0'}


@router.get('/profiles', response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    return db.scalars(select(Profile).order_by(Profile.created_at.desc())).all()


@router.post('/profiles', response_model=ProfileOut, status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    profile = Profile(**payload.model_dump())
    db.add(profile)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail={'code': 'CONFLICT', 'message': 'El código de expediente ya existe.'}) from error
    db.refresh(profile)
    db.add(AuditEvent(actor_id='starter-user', action='profile.create', resource=f'/profiles/{profile.id}', outcome='success'))
    db.commit()
    return profile


@router.get('/profiles/{profile_id}/measurements', response_model=list[MeasurementOut])
def list_measurements(profile_id: str, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    return db.scalars(select(Measurement).where(Measurement.profile_id == profile_id).order_by(Measurement.measured_at.asc())).all()


@router.post('/profiles/{profile_id}/measurements', response_model=MeasurementOut, status_code=201)
def create_measurement(profile_id: str, payload: MeasurementCreate, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    if payload.method not in {'manual', 'device', 'visual_estimate'}:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'Método de medición no admitido.'})
    allowed_units = {
        'height': {'m', 'cm'},
        'weight': {'kg'},
        'waist': {'cm', 'm'},
        'hip': {'cm', 'm'},
        'chest': {'cm', 'm'},
        'body_fat_pct': {'%'},
        'muscle_mass_pct': {'%'},
    }
    if payload.metric_code in allowed_units and payload.unit not in allowed_units[payload.metric_code]:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'Unidad incompatible con la métrica.'})
    if payload.metric_code in {'body_fat_pct', 'muscle_mass_pct'} and payload.value > 100:
        raise HTTPException(status_code=400, detail={'code': 'VALIDATION_ERROR', 'message': 'El porcentaje debe estar entre 0 y 100.'})
    measurement = Measurement(profile_id=profile_id, created_by='starter-user', **payload.model_dump())
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    db.add(AuditEvent(actor_id='starter-user', action='measurement.create', resource=f'/measurements/{measurement.id}', outcome='success'))
    db.commit()
    return measurement


@router.post('/profiles/{profile_id}/consents', status_code=201)
def register_consent(profile_id: str, payload: ConsentCreate, db: Session = Depends(get_db)):
    if not db.get(Profile, profile_id):
        raise HTTPException(status_code=404, detail={'code': 'NOT_FOUND', 'message': 'Expediente inexistente.'})
    consent = Consent(profile_id=profile_id, accepted_at=datetime.now(timezone.utc), **payload.model_dump())
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return {'id': consent.id, 'profile_id': profile_id, 'purpose': consent.purpose, 'policy_version': consent.policy_version, 'accepted_at': consent.accepted_at}
