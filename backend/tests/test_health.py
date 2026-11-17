from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import health
from app.main import app

client = TestClient(app)


def test_health_reports_api_and_database_ready() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_reports_database_unavailable(monkeypatch) -> None:
    class UnavailableEngine:
        def connect(self):
            raise SQLAlchemyError("database unavailable")

    monkeypatch.setattr(health, "engine", UnavailableEngine())

    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "database": "unavailable",
    }
