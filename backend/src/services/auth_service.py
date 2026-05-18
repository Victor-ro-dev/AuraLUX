import bcrypt
from sqlalchemy.orm import Session
from src.core.entities.user import User
from src.core.repositories.user_repository import UserRepository
from src.utils.auth.jwt_handler import create_access_token
from fastapi import HTTPException, status


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register(self, name: str, email: str, password: str) -> User:
        if self.repo.find_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado",
            )
        user = User(name=name, email=email, password_hash=_hash_password(password))
        return self.repo.create(user)

    def login(self, email: str, password: str) -> dict:
        user = self.repo.find_by_email(email)
        if not user or not _verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
            )
        token = create_access_token({"sub": user.id})
        return {"access_token": token, "token_type": "bearer"}
