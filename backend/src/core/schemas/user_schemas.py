from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreateSchema(BaseModel):
    name: str
    email: EmailStr
    password: str


class ChronotypeUpdateSchema(BaseModel):
    chronotype: str           # "morning" | "evening"
    wake_time: Optional[str] = None    # "06:00"
    sleep_time: Optional[str] = None   # "22:00"
    device_id: Optional[str] = None    # ID do ESP32


class AutoLightModeSchema(BaseModel):
    auto_light_mode: bool


class UserResponseSchema(BaseModel):
    id: str
    name: str
    email: str
    chronotype: Optional[str] = None
    device_id: Optional[str] = None
    wake_time: Optional[str] = None
    sleep_time: Optional[str] = None
    auto_light_mode: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
