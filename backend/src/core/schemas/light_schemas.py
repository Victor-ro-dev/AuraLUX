from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ManualLightSchema(BaseModel):
    r: int = Field(ge=0, le=255, description="Canal vermelho (0-255)")
    g: int = Field(ge=0, le=255, description="Canal verde (0-255)")
    b: int = Field(ge=0, le=255, description="Canal azul (0-255)")
    brightness: int = Field(default=80, ge=0, le=100, description="Brilho em %")


class BrightnessSchema(BaseModel):
    brightness: int = Field(ge=0, le=100)


class PowerSchema(BaseModel):
    state: bool


class LightCommandResponseSchema(BaseModel):
    r: int
    g: int
    b: int
    brightness: int
    cct: Optional[int] = None
    label: Optional[str] = None
    triggered_by: str


class LightHistoryItemSchema(BaseModel):
    id: str
    r: int
    g: int
    b: int
    brightness: int
    label: Optional[str] = None
    triggered_by: str
    created_at: datetime

    class Config:
        from_attributes = True
