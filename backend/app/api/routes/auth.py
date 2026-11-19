from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, Database
from app.core.config import settings
from app.core.security import (
    SESSION_MAX_AGE,
    create_session_token,
    read_session_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.schemas.user import UserResponse

router = APIRouter()


@router.post("/auth/login", response_model=UserResponse)
def login(credentials: LoginRequest, response: Response, database: Database) -> User:
    user = database.scalar(select(User).where(User.dni == credentials.dni))
    if (
        user is None
        or not user.is_active
        or not verify_password(credentials.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI o contraseña incorrectos.",
        )

    response.set_cookie(
        key="bodyvision_session",
        value=create_session_token(user.id, user.session_version),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/api",
    )
    return user


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, request: Request, database: Database) -> Response:
    token = request.cookies.get("bodyvision_session")
    session_data = read_session_token(token) if token else None
    if session_data:
        user = database.get(User, session_data[0])
        if user is not None and user.session_version == session_data[1]:
            user.session_version += 1
            database.commit()
    response.delete_cookie(
        key="bodyvision_session",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/api",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/auth/me", response_model=UserResponse)
@router.get("/users/me", response_model=UserResponse, include_in_schema=False)
def current_user(current_user: CurrentUser) -> User:
    return current_user


@router.get("/auth/session", response_model=UserResponse | None)
def current_session(request: Request, database: Database) -> User | Response:
    token = request.cookies.get("bodyvision_session")
    session_data = read_session_token(token) if token else None
    user = database.get(User, session_data[0]) if session_data else None
    if (
        user is None
        or not user.is_active
        or session_data is None
        or user.session_version != session_data[1]
    ):
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return user