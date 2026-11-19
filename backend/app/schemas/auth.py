from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    dni: str = Field(pattern=r"^\d{8}$")
    password: str = Field(min_length=1, max_length=128)