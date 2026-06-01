from sqlalchemy.orm import Session
from src.core.repositories.user_repository import UserRepository
from fastapi import HTTPException, status
from typing import Optional


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_profile(self, user_id: str):
        user = self.repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        return user

    def update_chronotype(
        self,
        user_id: str,
        chronotype: str,
        wake_time: Optional[str] = None,
        sleep_time: Optional[str] = None,
        device_id: Optional[str] = None,
    ):
        if chronotype not in ("morning", "evening"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cronotipo inválido. Use 'morning' ou 'evening'.",
            )
        user = self.repo.update_chronotype(user_id, chronotype, wake_time, sleep_time, device_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        return user

    def set_auto_light_mode(self, user_id: str, enabled: bool):
        user = self.repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        user.auto_light_mode = enabled
        self.repo.db.commit()
        self.repo.db.refresh(user)
        return user
