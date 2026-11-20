import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import get_db


@pytest.fixture(autouse=True)
def isolated_test_database():
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
    yield
    app.dependency_overrides.clear()
    test_engine.dispose()


def test_rodin_provider_status_never_exposes_api_key(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, 'rodin_api_key', 'private-api-key')
    with TestClient(app) as client:
        response = client.get('/api/v1/models/provider-status')
    assert response.status_code == 200
    assert response.json() == {'provider': 'Hyper3D/Rodin', 'configured': True}
    assert 'private-api-key' not in response.text


def test_rodin_generation_requires_consent_and_hides_provider_tokens(monkeypatch, tmp_path):
    from app.api.routes import models
    from app.core.config import settings

    monkeypatch.setattr(settings, 'rodin_api_key', 'test-api-key')
    monkeypatch.setattr(settings, 'rodin_storage_dir', str(tmp_path))
    monkeypatch.setattr(models, 'submit_generation', lambda *_args: ('provider-task', 'private-subscription'))
    monkeypatch.setattr(models, 'get_generation_status', lambda _key: ['Done'])
    monkeypatch.setattr(models, 'download_generation', lambda _task, generation_id: f'{generation_id}.glb')

    with TestClient(app) as client:
        profile = client.post('/api/v1/profiles', json={'display_code': 'EXP-RODIN', 'display_name': 'Expediente Rodin'}).json()
        profile_id = profile['id']
        image = {'image': ('body.png', b'\x89PNG\r\n\x1a\nimage-data', 'image/png')}
        missing_consent = client.post(f'/api/v1/profiles/{profile_id}/models', files=image)
        assert missing_consent.status_code == 403

        consent = client.post(
            f'/api/v1/profiles/{profile_id}/consents',
            json={'purpose': 'captura_corporal_y_analisis_visual', 'policy_version': '1.0'},
        )
        assert consent.status_code == 201
        created = client.post(f'/api/v1/profiles/{profile_id}/models', files=image)
        assert created.status_code == 202
        generation = created.json()
        assert generation['status'] == 'Waiting'
        assert 'private-subscription' not in created.text
        assert 'provider-task' not in created.text

        (tmp_path / f"{generation['id']}.glb").write_bytes(b'glTFtest-model')
        completed = client.get(f"/api/v1/models/{generation['id']}")
        assert completed.status_code == 200
        assert completed.json()['status'] == 'Done'
        assert completed.json()['model_url'] == f"/api/v1/models/{generation['id']}/asset"
        assert client.get(completed.json()['model_url']).content == b'glTFtest-model'


def test_profile_and_measurement_flow():
    with TestClient(app) as client:
        health = client.get('/api/v1/health')
        assert health.status_code == 200
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
