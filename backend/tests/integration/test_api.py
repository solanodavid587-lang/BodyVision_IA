import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import Settings, settings
from app.models.entities import AuditEvent, Consent, Measurement, Profile


@pytest.fixture(autouse=True)
def isolated_test_database(monkeypatch):
    monkeypatch.setattr(settings, 'demo_mode', False)
    test_engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=test_engine)
    testing_session = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield testing_session
    app.dependency_overrides.clear()
    test_engine.dispose()


def test_paid_model_generation_routes_are_removed():
    with TestClient(app) as client:
        assert client.get('/api/v1/models/provider-status').status_code == 404
        assert client.get('/api/v1/models/test-id').status_code == 404
        assert client.post('/api/v1/profiles/test-id/models').status_code == 404


def test_demo_mode_cannot_be_disabled_before_authentication_exists():
    with pytest.raises(ValidationError, match='DEMO_MODE'):
        Settings(demo_mode=False)


def test_demo_mode_only_serves_synthetic_data_and_blocks_writes(monkeypatch, isolated_test_database):
    with isolated_test_database() as db:
        db.add(Profile(id='real-profile-id', display_code='REAL-001', display_name='Private record'))
        db.commit()
    monkeypatch.setattr(settings, 'demo_mode', True)

    with TestClient(app) as client:
        health = client.get('/api/v1/health')
        profiles = client.get('/api/v1/profiles')
        assert health.json()['demo_mode'] is True
        assert profiles.status_code == 200
        assert [profile['display_code'] for profile in profiles.json()] == ['DEMO-001', 'DEMO-002', 'DEMO-003']
        assert 'Private record' not in profiles.text
        measurements = client.get('/api/v1/profiles/demo-profile-001/measurements')
        assert measurements.status_code == 200
        assert measurements.json()
        assert all(item['method'] == 'simulated' for item in measurements.json())
        tall_profile_measurements = client.get('/api/v1/profiles/demo-profile-002/measurements')
        assert tall_profile_measurements.status_code == 200
        assert tall_profile_measurements.json()[0]['profile_id'] == 'demo-profile-002'
        assert client.get('/api/v1/profiles/real-profile-id/measurements').status_code == 404

        assert client.post('/api/v1/profiles', json={'display_code': 'REAL-002', 'display_name': 'New record'}).status_code == 403
        assert client.post(
            '/api/v1/profiles/demo-profile-001/measurements',
            json={'metric_code': 'weight', 'value': 70, 'unit': 'kg', 'method': 'manual', 'measured_at': '2026-11-17T09:30:00Z'},
        ).status_code == 403
        assert client.post(
            '/api/v1/profiles/demo-profile-001/consents',
            json={'purpose': 'demo', 'policy_version': '1.0'},
        ).status_code == 403

    with isolated_test_database() as db:
        assert db.get(Profile, 'real-profile-id') is not None
        assert db.get(Profile, 'REAL-002') is None


def test_profile_and_measurement_flow():
    with TestClient(app) as client:
        health = client.get('/api/v1/health')
        assert health.status_code == 200
        assert health.json()['demo_mode'] is False
        created = client.post('/api/v1/profiles', json={'display_code': 'EXP-001', 'display_name': 'Expediente demo'})
        assert created.status_code == 201
        profile_id = created.json()['id']
        measurement = client.post(
            f'/api/v1/profiles/{profile_id}/measurements',
            json={'metric_code': 'waist', 'value': 84.5, 'unit': 'cm', 'method': 'manual', 'measured_at': '2026-11-17T09:30:00-05:00'},
        )
        assert measurement.status_code == 201
        listed = client.get(f'/api/v1/profiles/{profile_id}/measurements')
        assert len(listed.json()) == 1
        assert listed.json()[0]['created_at']
        assert listed.json()[0]['supersedes_id'] is None


def test_measurement_correction_preserves_the_original_and_is_audited(isolated_test_database):
    with TestClient(app) as client:
        profile = client.post('/api/v1/profiles', json={'display_code': 'EXP-CORR', 'display_name': 'Perfil de prueba'}).json()
        profile_id = profile['id']
        original = client.post(
            f'/api/v1/profiles/{profile_id}/measurements',
            json={'metric_code': 'waist', 'value': 84.5, 'unit': 'cm', 'method': 'manual', 'measured_at': '2026-11-17T09:30:00Z'},
        ).json()
        corrected = client.post(
            f"/api/v1/profiles/{profile_id}/measurements/{original['id']}/corrections",
            json={'metric_code': 'waist', 'value': 82.4, 'unit': 'cm', 'method': 'device', 'measured_at': '2026-11-17T09:30:00Z'},
        )
        assert corrected.status_code == 201
        assert corrected.json()['supersedes_id'] == original['id']
        history = client.get(f'/api/v1/profiles/{profile_id}/measurements').json()
        assert len(history) == 2
        assert [item['value'] for item in history] == [84.5, 82.4]
        repeated = client.post(
            f"/api/v1/profiles/{profile_id}/measurements/{original['id']}/corrections",
            json={'metric_code': 'waist', 'value': 81, 'unit': 'cm', 'method': 'manual', 'measured_at': '2026-11-17T09:30:00Z'},
        )
        assert repeated.status_code == 409

    with isolated_test_database() as db:
        assert db.query(Measurement).count() == 2
        assert db.query(AuditEvent).filter_by(action='measurement.correct').count() == 1


def test_consent_can_be_read_and_revoked_with_audit_history(isolated_test_database):
    with TestClient(app) as client:
        profile = client.post('/api/v1/profiles', json={'display_code': 'EXP-CONS', 'display_name': 'Perfil de prueba'}).json()
        profile_id = profile['id']
        created = client.post(
            f'/api/v1/profiles/{profile_id}/consents',
            json={'purpose': 'pose_analysis', 'policy_version': '1.0'},
        )
        assert created.status_code == 201
        consent_id = created.json()['id']
        assert client.get(f'/api/v1/profiles/{profile_id}/consents').json()[0]['revoked_at'] is None
        revoked = client.post(f'/api/v1/profiles/{profile_id}/consents/{consent_id}/revoke')
        assert revoked.status_code == 200
        assert revoked.json()['revoked_at'] is not None
        assert client.get(f'/api/v1/profiles/{profile_id}/consents').json()[0]['revoked_at'] is not None

    with isolated_test_database() as db:
        assert db.query(Consent).count() == 1
        assert db.query(AuditEvent).filter_by(action='consent.accept').count() == 1
        assert db.query(AuditEvent).filter_by(action='consent.revoke').count() == 1


def test_measurement_rejects_unknown_metrics_and_unitless_timestamps():
    with TestClient(app) as client:
        profile = client.post('/api/v1/profiles', json={'display_code': 'EXP-VAL', 'display_name': 'Perfil de prueba'}).json()
        profile_id = profile['id']
        unknown = client.post(
            f'/api/v1/profiles/{profile_id}/measurements',
            json={'metric_code': 'unknown_metric', 'value': 1, 'unit': 'cm', 'method': 'manual', 'measured_at': '2026-11-17T09:30:00Z'},
        )
        unitless_timestamp = client.post(
            f'/api/v1/profiles/{profile_id}/measurements',
            json={'metric_code': 'waist', 'value': 1, 'unit': 'cm', 'method': 'manual', 'measured_at': '2026-11-17T09:30:00'},
        )
    assert unknown.status_code == 400
    assert unitless_timestamp.status_code == 422


def test_body_composition_percent_measurement_rejects_values_over_100():
    with TestClient(app) as client:
        created = client.post('/api/v1/profiles', json={'display_code': 'EXP-PCT', 'display_name': 'Expediente porcentajes'})
        profile_id = created.json()['id']
        response = client.post(
            f'/api/v1/profiles/{profile_id}/measurements',
            json={
                'metric_code': 'body_fat_pct',
                'value': 101,
                'unit': '%',
                'method': 'device',
                'measured_at': '2026-11-20T04:30:00Z',
            },
        )
    assert response.status_code == 400
