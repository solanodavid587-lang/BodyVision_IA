from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, Database
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/users", response_model=list[UserResponse])
def list_users(admin: AdminUser, database: Database) -> list[User]:
    _ = admin
    return list(database.scalars(select(User).order_by(User.created_at.desc())))


@router.post(
    "/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def create_user(payload: UserCreate, admin: AdminUser, database: Database) -> User:
    _ = admin
    if database.scalar(select(User).where(User.dni == payload.dni)):
        raise HTTPException(status_code=409, detail="Ese DNI ya está registrado.")
    user = User(
        dni=payload.dni,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(status_code=409, detail="Ese DNI ya está registrado.")
    database.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    admin: AdminUser,
    database: Database,
) -> User:
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "dni" in changes:
        duplicate = database.scalar(
            select(User).where(User.dni == changes["dni"], User.id != user.id)
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="Ese DNI ya está registrado.")
    if user.id == admin.id and changes.get("is_active") is False:
        raise HTTPException(
            status_code=400, detail="No puedes desactivar tu propia cuenta."
        )
    if user.role == "admin" and (
        changes.get("role") not in (None, "admin")
        or changes.get("is_active") is False
    ):
        active_admins = list(
            database.scalars(
                select(User).where(User.role == "admin", User.is_active.is_(True))
            )
        )
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Debe quedar al menos un administrador activo.",
            )

    password = changes.pop("password", None)
    if password:
        user.password_hash = hash_password(password)
        user.session_version += 1
    for field, value in changes.items():
        setattr(user, field, value)

    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(status_code=409, detail="Ese DNI ya está registrado.")
    database.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int, admin: AdminUser, database: Database
) -> Response:
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="No puedes desactivar tu propia cuenta."
        )
    if user.is_active and user.role == "admin":
        active_admins = list(
            database.scalars(
                select(User).where(User.role == "admin", User.is_active.is_(True))
            )
        )
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Debe quedar al menos un administrador activo.",
            )
    user.is_active = False
    database.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)