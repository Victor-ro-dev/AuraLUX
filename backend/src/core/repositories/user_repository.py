from sqlalchemy.orm import Session
from src.core.entities.user import User
from typing import Optional
from datetime import datetime


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def find_by_id(self, user_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save_outlook_tokens(
        self,
        user_id: str,
        access_token: str,
        refresh_token: Optional[str],
        expiry: datetime,
    ) -> Optional[User]:
        user = self.find_by_id(user_id)
        if not user:
            return None
        user.outlook_token = access_token
        if refresh_token:
            user.outlook_refresh_token = refresh_token
        user.outlook_token_expiry = expiry
        self.db.commit()
        self.db.refresh(user)
        return user

    def clear_outlook_tokens(self, user_id: str) -> Optional[User]:
        user = self.find_by_id(user_id)
        if not user:
            return None
        user.outlook_token = None
        user.outlook_refresh_token = None
        user.outlook_token_expiry = None
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_chronotype(
        self,
        user_id: str,
        chronotype: str,
        wake_time: Optional[str],
        sleep_time: Optional[str],
        device_id: Optional[str],
    ) -> Optional[User]:
        user = self.find_by_id(user_id)
        if not user:
            return None
        user.chronotype = chronotype
        if wake_time:
            user.wake_time = wake_time
        if sleep_time:
            user.sleep_time = sleep_time
        if device_id:
            user.device_id = device_id
        self.db.commit()
        self.db.refresh(user)
        return user
