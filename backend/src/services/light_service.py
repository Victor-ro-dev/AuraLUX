from sqlalchemy.orm import Session
from src.utils.chronobiology.color_calculator import calculate_light_command
from src.services.redis_publisher import redis_publisher_service
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

    def _get_last_command_source(self, user_id: str) -> Optional[str]:
        """Retorna o triggered_by do último comando."""
        last = (
            self.db.query(LightCommand)
            .filter(LightCommand.user_id == user_id)
            .order_by(LightCommand.created_at.desc())
            .first()
        )
        return last.triggered_by if last else None

    def _can_apply(self, new_source: str, last_source: Optional[str]) -> bool:
        """
        Verifica se o novo comando pode sobrescrever o anterior.
        Ordem de prioridade: scheduler_ai > sync_light > auto > manual
        """
        priority = {"scheduler_ai": 4, "sync_light": 3, "auto": 2, "manual": 1}
        new_priority = priority.get(new_source, 0)
        last_priority = priority.get(last_source, 0) if last_source else 0

        # Novo comando pode aplicar se tiver prioridade >= anterior
        return new_priority >= last_priority

    def apply_auto_light(self, user_id: str, event_type: Optional[str] = None) -> dict:
        """
        Aplica a luz ideal com base no cronotipo + fase circadiana / evento.
        Respeita prioridade: IA > AUTO > MANUAL
        """
        user = self._get_user_or_404(user_id)
        if not user.chronotype:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cronotipo não configurado. Complete o formulário primeiro.",
            )

        # Verificar prioridade
        last_source = self._get_last_command_source(user_id)
        if not self._can_apply("auto", last_source):
            # Não sobrescrever - retornar último comando
            last_cmd = (
                self.db.query(LightCommand)
                .filter(LightCommand.user_id == user_id)
                .order_by(LightCommand.created_at.desc())
                .first()
            )
            if last_cmd:
                return {
                    "r": last_cmd.r,
                    "g": last_cmd.g,
                    "b": last_cmd.b,
                    "brightness": last_cmd.brightness,
                    "cct": last_cmd.cct,
                    "label": last_cmd.label,
                    "message": f"Bloqueado por {last_source} - prioridade superior",
                }

        command = calculate_light_command(user.chronotype, event_type)
        device_id = user.device_id or user_id
        redis_publisher_service.publish_light_command(device_id, command)
        self._save_command(user_id, command, "auto")
        return command

    def apply_manual_light(self, user_id: str, r: int, g: int, b: int, brightness: int = 80) -> dict:
        """Aplica cor manual escolhida pelo usuário no dashboard.
        
        SEMPRE sobrescreve, pois é ação explícita do usuário no frontend.
        Não respeita prioridade - o usuário quebra a automação ao clicar.
        """
        user = self._get_user_or_404(user_id)
        
        command = {"r": r, "g": g, "b": b, "brightness": brightness, "label": "Manual", "triggered_by": "manual"}
        device_id = user.device_id or user_id
        redis_publisher_service.publish_light_command(device_id, command)
        self._save_command(user_id, command, "manual")
        return command

    def apply_scheduler_ai(self, user_id: str, event_type: Optional[str] = None) -> dict:
        """
        Aplicada APENAS pelo scheduler - tem prioridade MÁXIMA.
        Não pode ser sobrescrita por auto ou manual.
        """
        user = self._get_user_or_404(user_id)
        if not user.chronotype:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cronotipo não configurado.",
            )

        command = calculate_light_command(user.chronotype, event_type)
        device_id = user.device_id or user_id
        redis_publisher_service.publish_light_command(device_id, command)
        self._save_command(user_id, command, "scheduler_ai")  # Tag de prioridade máxima
        return command

    def apply_sync_light(self, user_id: str, event_type: Optional[str] = None) -> dict:
        """
        Aplicada pelo botão "Atualizar" (sync calendário) - segunda prioridade.
        Pode sobrescrever auto mas não scheduler_ai.
        """
        user = self._get_user_or_404(user_id)
        if not user.chronotype:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cronotipo não configurado.",
            )

        command = calculate_light_command(user.chronotype, event_type)
        device_id = user.device_id or user_id
        redis_publisher_service.publish_light_command(device_id, command)
        self._save_command(user_id, command, "sync_light")  # Segunda prioridade
        return command

    def set_brightness(self, user_id: str, brightness: int) -> dict:
        user = self._get_user_or_404(user_id)
        device_id = user.device_id or user_id
        redis_publisher_service.publish_brightness(device_id, brightness)
        return {"brightness": brightness}

    def set_power(self, user_id: str, state: bool) -> dict:
        user = self._get_user_or_404(user_id)
        device_id = user.device_id or user_id
        redis_publisher_service.publish_power(device_id, state)
        return {"power": state}

    def get_history(self, user_id: str, limit: int = 10):
        return (
            self.db.query(LightCommand)
            .filter(LightCommand.user_id == user_id)
            .order_by(LightCommand.created_at.desc())
            .limit(limit)
            .all()
        )
