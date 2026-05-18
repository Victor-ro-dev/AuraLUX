from sqlalchemy.orm import Session
from src.utils.chronobiology.color_calculator import calculate_light_command
from src.services.mqtt_publisher import mqtt_publisher_service
from src.core.repositories.user_repository import UserRepository
from src.core.entities.light_command import LightCommand
from fastapi import HTTPException, status
from typing import Optional


class LightService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def _save_command(self, user_id: str, command: dict, triggered_by: str):
        record = LightCommand(
            user_id=user_id,
            r=command["r"],
            g=command["g"],
            b=command["b"],
            brightness=command.get("brightness", 80),
            cct=command.get("cct"),
            label=command.get("label"),
            triggered_by=triggered_by,
        )
        self.db.add(record)
        self.db.commit()

    def _get_user_or_404(self, user_id: str):
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        return user

    def apply_auto_light(self, user_id: str, event_type: Optional[str] = None) -> dict:
        """Aplica a luz ideal com base no cronotipo + fase circadiana / evento."""
        user = self._get_user_or_404(user_id)
        if not user.chronotype:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cronotipo não configurado. Complete o formulário primeiro.",
            )
        command = calculate_light_command(user.chronotype, event_type)
        device_id = user.device_id or user_id
        mqtt_publisher_service.publish_light_command(device_id, command)
        self._save_command(user_id, command, command["triggered_by"])
        return command

    def apply_manual_light(self, user_id: str, r: int, g: int, b: int, brightness: int = 80) -> dict:
        """Aplica cor manual escolhida pelo usuário no dashboard."""
        user = self._get_user_or_404(user_id)
        command = {"r": r, "g": g, "b": b, "brightness": brightness, "label": "Manual", "triggered_by": "manual"}
        device_id = user.device_id or user_id
        mqtt_publisher_service.publish_light_command(device_id, command)
        self._save_command(user_id, command, "manual")
        return command

    def set_brightness(self, user_id: str, brightness: int) -> dict:
        user = self._get_user_or_404(user_id)
        device_id = user.device_id or user_id
        mqtt_publisher_service.publish_brightness(device_id, brightness)
        return {"brightness": brightness}

    def set_power(self, user_id: str, state: bool) -> dict:
        user = self._get_user_or_404(user_id)
        device_id = user.device_id or user_id
        mqtt_publisher_service.publish_power(device_id, state)
        return {"power": state}

    def get_history(self, user_id: str, limit: int = 10):
        return (
            self.db.query(LightCommand)
            .filter(LightCommand.user_id == user_id)
            .order_by(LightCommand.created_at.desc())
            .limit(limit)
            .all()
        )
