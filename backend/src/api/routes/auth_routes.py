from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.core.settings.database import get_db
from src.core.schemas.auth_schemas import LoginSchema, TokenSchema
from src.core.schemas.user_schemas import UserCreateSchema, UserResponseSchema
from src.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponseSchema, status_code=201)
def register(body: UserCreateSchema, db: Session = Depends(get_db)):
    return AuthService(db).register(body.name, body.email, body.password)


@router.post("/login", response_model=TokenSchema)
def login(body: LoginSchema, db: Session = Depends(get_db)):
    return AuthService(db).login(body.email, body.password)
