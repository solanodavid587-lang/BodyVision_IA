import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.user import User


@pytest.fixture
def admin_client():
    with TestClient(app) as test_client:
        with SessionLocal() as database:
            database.query(User).delete()
            database.add(
                User(
                    dni="12345678",
                    full_name="Admin de prueba",
                    password_hash=hash_password("AdminTest_2026!"),
                    role="admin",
                    is_active=True,
                )
            )
            database.commit()
        yield test_client


def login(client: TestClient, dni: str, password: str):
    return client.post("/api/auth/login", json={"dni": dni, "password": password})


def test_login_sets_http_only_cookie_and_protects_user_list(admin_client: TestClient):
    assert admin_client.get("/api/users").status_code == 401
    assert admin_client.get("/api/auth/session").status_code == 204

    response = login(admin_client, "12345678", "AdminTest_2026!")

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert response.headers["set-cookie"].startswith("bodyvision_session=")
    assert "httponly" in response.headers["set-cookie"].lower()
    assert admin_client.get("/api/auth/me").json()["dni"] == "12345678"
    assert admin_client.get("/api/users").status_code == 200


def test_admin_can_create_user_and_change_dni_and_password(admin_client: TestClient):
    assert login(admin_client, "12345678", "AdminTest_2026!").status_code == 200

    created = admin_client.post(
        "/api/users",
        json={
            "dni": "87654321",
            "full_name": "Usuario de prueba",
            "password": "UserTest_2026!",
            "role": "specialist",
        },
    )
    assert created.status_code == 201
    assert "password" not in created.json()
    user_id = created.json()["id"]
    previous_session = TestClient(app)
    assert login(previous_session, "87654321", "UserTest_2026!").status_code == 200

    updated = admin_client.patch(
        f"/api/users/{user_id}",
        json={"dni": "11223344", "password": "Changed_2026!"},
    )
    assert updated.status_code == 200
    assert updated.json()["dni"] == "11223344"
    assert previous_session.get("/api/auth/me").status_code == 401

    assert login(admin_client, "87654321", "UserTest_2026!").status_code == 401
    assert admin_client.post("/api/auth/logout").status_code == 204
    assert login(admin_client, "11223344", "Changed_2026!").status_code == 200


def test_non_admin_cannot_manage_users_and_last_admin_cannot_be_removed(
    admin_client: TestClient,
):
    assert login(admin_client, "12345678", "AdminTest_2026!").status_code == 200
    created = admin_client.post(
        "/api/users",
        json={
            "dni": "87654321",
            "full_name": "Usuario estándar",
            "password": "UserTest_2026!",
            "role": "user",
        },
    )
    assert created.status_code == 201
    admin_id = admin_client.get("/api/auth/me").json()["id"]
    assert admin_client.delete(f"/api/users/{admin_id}").status_code == 400
    assert admin_client.post("/api/auth/logout").status_code == 204

    assert login(admin_client, "87654321", "UserTest_2026!").status_code == 200
    assert admin_client.get("/api/users").status_code == 403
    assert admin_client.post(
        "/api/users",
        json={
            "dni": "11112222",
            "full_name": "Sin permiso",
            "password": "UserTest_2026!",
        },
    ).status_code == 403


def test_invalid_dni_and_disabled_user_cannot_login(admin_client: TestClient):
    assert login(admin_client, "123", "AdminTest_2026!").status_code == 422
    with SessionLocal() as database:
        account = database.query(User).filter_by(dni="12345678").one()
        account.is_active = False
        database.commit()

    assert login(admin_client, "12345678", "AdminTest_2026!").status_code == 401