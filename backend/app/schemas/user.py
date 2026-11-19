from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

UserRole = Literal["admin", "specialist", "user"]


class UserCreate(BaseModel):
    dni: str = Field(pattern=r"^\d{8}$")
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)
    role: UserRole = "user"

    @field_validator("full_name")
    @classmethod
    def trim_full_name(cls, value: str) -> str:
        name = value.strip()
        if len(name) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return name


class UserUpdate(BaseModel):
    dni: str | None = Field(default=None, pattern=r"^\d{8}$")
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    password: str | None = Field(default=None, min_length=10, max_length=128)
    role: UserRole | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def trim_optional_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        name = value.strip()
        if len(name) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return name


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dni: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime