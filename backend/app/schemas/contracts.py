from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProfileCreate(BaseModel):
    display_code: str = Field(min_length=2, max_length=64)
    display_name: str = Field(min_length=2, max_length=255)


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_code: str
    display_name: str
    status: str
    created_at: datetime


class MeasurementCreate(BaseModel):
    metric_code: str = Field(min_length=2, max_length=64)
    value: float = Field(ge=0, allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=16)
    method: str
    measured_at: datetime
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator('metric_code')
    @classmethod
    def normalize_metric_code(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator('measured_at')
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError('La fecha debe incluir zona horaria.')
        return value.astimezone(timezone.utc)


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    profile_id: str
    metric_code: str
    value: float
    unit: str
    method: str
    measured_at: datetime
    created_by: str
    notes: str | None
    supersedes_id: str | None
    created_at: datetime


class ConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    profile_id: str
    purpose: str
    policy_version: str
    accepted_at: datetime | None
    revoked_at: datetime | None


class ConsentCreate(BaseModel):
    purpose: str = Field(min_length=2, max_length=128)
    policy_version: str = Field(min_length=1, max_length=32)
