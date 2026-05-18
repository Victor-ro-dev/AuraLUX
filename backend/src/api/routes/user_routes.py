from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.core.settings.database import get_db
from src.core.schemas.user_schemas import UserResponseSchema, ChronotypeUpdateSchema
from src.core.entities.user import User
from src.services.user_service import UserService
from src.services.dependencies.auth_dependencies import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponseSchema)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/chronotype", response_model=UserResponseSchema)
def update_chronotype(
    body: ChronotypeUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UserService(db).update_chronotype(
        current_user.id,
        body.chronotype,
        body.wake_time,
        body.sleep_time,
        body.device_id,
    )
