from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.sqlite import TEXT
from src.core.settings.database import Base
from datetime import datetime
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

    # Cronobiologia
    chronotype = Column(String, nullable=True)   # "morning" | "evening"
    wake_time = Column(String, nullable=True)    # "06:00"
    sleep_time = Column(String, nullable=True)   # "22:00"

    # Hardware
    device_id = Column(String, nullable=True)    # ID do ESP32 → usado no tópico MQTT

    # Integração Outlook — OAuth 2.0 Authorization Code Flow
    outlook_token = Column(TEXT, nullable=True)          # access_token atual
    outlook_refresh_token = Column(TEXT, nullable=True)  # refresh_token (longa duração)
    outlook_token_expiry = Column(DateTime, nullable=True)  # expiração (UTC, naive)

    created_at = Column(DateTime, default=datetime.utcnow)
