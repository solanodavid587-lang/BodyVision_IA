from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import read_session_token
from app.db.session import get_db
from app.models.user import User

Database = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, database: Database) -> User:
    token = request.cookies.get("bodyvision_session")
    session_data = read_session_token(token) if token else None
    user = database.get(User, session_data[0]) if session_data else None
    if (
        user is None
        or not user.is_active
        or session_data is None
        or user.session_version != session_data[1]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inicia sesión para continuar.",
        )
    return user


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol de administrador.",
        )
    return current_user


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]