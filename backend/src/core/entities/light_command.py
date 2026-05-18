from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from src.core.settings.database import Base
from datetime import datetime
from zoneinfo import ZoneInfo
import uuid

TZ_BRAZIL = ZoneInfo("America/Sao_Paulo")


class LightCommand(Base):
    __tablename__ = "light_commands"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    r = Column(Integer, nullable=False)
    g = Column(Integer, nullable=False)
    b = Column(Integer, nullable=False)
    brightness = Column(Integer, default=80)
    cct = Column(Integer, nullable=True)            # Temperatura de cor em Kelvin
    label = Column(String, nullable=True)           # "Foco Profundo", "Relaxamento"...
    triggered_by = Column(String, default="manual") # "auto" | "manual" | "calendar"
    created_at = Column(DateTime, default=lambda: datetime.now(TZ_BRAZIL))
