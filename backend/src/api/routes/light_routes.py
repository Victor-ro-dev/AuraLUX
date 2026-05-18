from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from src.core.settings.database import get_db
from src.core.schemas.light_schemas import ManualLightSchema, BrightnessSchema, PowerSchema
from src.core.entities.user import User
from src.services.light_service import LightService
from src.services.dependencies.auth_dependencies import get_current_user

router = APIRouter()


@router.post("/auto")
def auto_light(
    event_type: Optional[str] = Query(None, description="Tipo de evento atual do calendário"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aplica luz automática baseada em cronotipo + calendário."""
    return LightService(db).apply_auto_light(current_user.id, event_type)


@router.post("/manual")
def manual_light(
    body: ManualLightSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aplica cor manual escolhida no dashboard."""
    return LightService(db).apply_manual_light(
        current_user.id, body.r, body.g, body.b, body.brightness
    )


@router.post("/brightness")
def set_brightness(
    body: BrightnessSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return LightService(db).set_brightness(current_user.id, body.brightness)


@router.post("/power")
def set_power(
    body: PowerSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return LightService(db).set_power(current_user.id, body.state)


@router.get("/history")
def get_history(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return LightService(db).get_history(current_user.id, limit)


@router.get("/presets")
def get_presets():
    """Retorna os presets de cor disponíveis."""
    from src.utils.chronobiology.color_calculator import COLOR_PRESETS
    return [
        {"key": k, "label": v["label"], "r": v["r"], "g": v["g"], "b": v["b"], "cct": v["cct"]}
        for k, v in COLOR_PRESETS.items()
    ]
