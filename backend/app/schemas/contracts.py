from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


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
    value: float = Field(ge=0)
    unit: str = Field(min_length=1, max_length=16)
    method: str
    measured_at: datetime
    notes: str | None = None


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


class ConsentCreate(BaseModel):
    purpose: str = Field(min_length=2, max_length=128)
    policy_version: str = Field(min_length=1, max_length=32)
