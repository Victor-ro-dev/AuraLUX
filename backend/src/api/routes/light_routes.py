from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from src.core.settings.database import get_db
from src.core.schemas.light_schemas import ManualLightSchema, BrightnessSchema, PowerSchema, AutoLightSchema
from src.core.entities.user import User
from src.services.light_service import LightService
from src.services.dependencies.auth_dependencies import get_current_user

router = APIRouter()


@router.post("/auto")
def auto_light(
    body: AutoLightSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Controla a troca de modo Manual ↔ Auto.
    
    - current_mode='manual': Desativa auto_light_mode no BD → scheduler para de chamar IA
    - current_mode='auto': Ativa auto_light_mode no BD → chama IA IMEDIATAMENTE
      na primeira vez, e o scheduler continua verificando a cada 1 minuto
    """
    from src.services.user_service import UserService
    
    current_mode = body.current_mode.lower()  # 'manual' ou 'auto'
    user_service = UserService(db)
    
    # ─── MODO MANUAL ───────────────────────────────────────────
    if current_mode == "manual":
        # Desativar auto_light_mode → scheduler ignora este usuário
        user_service.set_auto_light_mode(current_user.id, False)
        print(f"[LightRoutes] ⏸️ {current_user.email} → Modo MANUAL (IA background desativada)")
        return {
            "mode": "manual",
            "auto_light_mode": False,
            "message": "Modo manual ativo - background da IA desativado"
        }
    
    # ─── MODO AUTO ─────────────────────────────────────────────
    # Ativar auto_light_mode → scheduler passa a verificar a cada 1 minuto
    user_service.set_auto_light_mode(current_user.id, True)
    print(f"[LightRoutes] ▶️ {current_user.email} → Modo AUTO (IA background ativada)")
    
    # Chamar IA IMEDIATAMENTE na troca para AUTO
    from src.services.calendar_service import CalendarService
    from src.services.outlook_oauth_service import OutlookOAuthService
    
    try:
        # Buscar token do Outlook
        outlook_service = OutlookOAuthService()
        token = outlook_service.get_valid_access_token(current_user, db)
        
        if not token:
            return {
                "mode": "auto",
                "auto_light_mode": True,
                "error": "Outlook não conectado",
                "message": "Modo automático ativado, mas Outlook não conectado. Conecte para usar IA."
            }
        
        # Buscar eventos do calendário
        cal_service = CalendarService()
        events = cal_service.get_current_events(token)
        
        if not events:
            # Sem evento agora — aplicar luz circadiana automática
            light_service = LightService(db)
            command = light_service.apply_auto_light(current_user.id, None)
            return {
                "mode": "auto",
                "auto_light_mode": True,
                "event": None,
                "command": command,
                "message": "Modo automático ativado - nenhum evento agora, usando fase circadiana"
            }
        
        # Há um evento! Classificar com IA
        current_event = events[0]
        classification = cal_service.classify_event_with_ai(
            current_event["subject"],
            current_event.get("description", "")
        )
        
        # Aplicar luz com IA (prioridade máxima do scheduler)
        light_service = LightService(db)
        command = light_service.apply_scheduler_ai(current_user.id, classification["event_type"])
        
        return {
            "mode": "auto",
            "auto_light_mode": True,
            "event": current_event["subject"],
            "classification": classification,
            "command": command,
            "message": f"Automático ativado - {classification['label']} ({current_event['subject']})"
        }
        
    except Exception as e:
        print(f"[LightRoutes] ✗ Erro ao ativar automático: {e}")
        return {
            "mode": "auto",
            "auto_light_mode": True,
            "error": str(e),
            "message": "Modo automático ativado, mas erro ao chamar IA"
        }


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
