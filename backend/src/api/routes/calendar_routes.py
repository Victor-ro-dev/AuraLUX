from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.settings.database import get_db
from src.core.entities.user import User
from src.services.calendar_service import CalendarService
from src.services.light_service import LightService
from src.services.outlook_oauth_service import OutlookOAuthService
from src.services.dependencies.auth_dependencies import get_current_user
from src.utils.chronobiology.color_calculator import calculate_light_command
from datetime import datetime

router = APIRouter()


def _get_outlook_token(user: User, db: Session) -> str:
    """Obtém um access_token válido do Outlook ou lança 401."""
    token = OutlookOAuthService().get_valid_access_token(user, db)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Outlook não conectado. Acesse /api/auth/outlook/url para autorizar.",
        )
    return token


@router.get("/events")
def get_current_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna os eventos do calendário Outlook dos próximos 24 horas."""
    token = _get_outlook_token(current_user, db)
    events = CalendarService().get_upcoming_events(token, hours=24)
    return {"events": events}


@router.get("/events-week")
def get_week_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna os eventos do calendário Outlook dos próximos 7 dias (para debugar)."""
    token = _get_outlook_token(current_user, db)
    events = CalendarService().get_upcoming_events(token, hours=24*7)
    return {"events": events}


@router.post("/sync-light")
def sync_light_from_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lê o evento atual do Outlook e ajusta a luz automaticamente."""
    token = _get_outlook_token(current_user, db)
    cal_service = CalendarService()
    events = cal_service.get_current_events(token)
    event_type = cal_service.classify_event(events[0]["subject"]) if events else None

    command = LightService(db).apply_auto_light(current_user.id, event_type)
    return {"command": command, "event_type": event_type}


@router.get("/simulate")
def simulate_light(
    hour: int = 14,
    chronotype: str = "morning",
    event_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simula qual cor de luz seria usada em um cenário específico.
    
    Parâmetros:
    - hour: 0-23 (hora a simular)
    - chronotype: 'morning' ou 'evening' (cronotipo do usuário)
    - event_type: optional - 'focus', 'meeting', 'relax', 'reading', ou deixe vazio
    
    Exemplo:
    GET /api/calendar/simulate?hour=14&chronotype=evening&event_type=focus
    """
    
    # Validar parâmetros
    if not 0 <= hour <= 23:
        raise HTTPException(status_code=400, detail="hour deve estar entre 0-23")
    if chronotype not in ["morning", "evening"]:
        raise HTTPException(status_code=400, detail="chronotype deve ser 'morning' ou 'evening'")
    
    # Criar um datetime simulado
    import pytz
    tz_brazil = pytz.timezone("America/Sao_Paulo")
    now = datetime.now(tz_brazil)
    simulated_time = now.replace(hour=hour, minute=30, second=0, microsecond=0)
    
    # Calcular a cor de luz COM A HORA SIMULADA
    color_command = calculate_light_command(
        chronotype=chronotype,
        event_type=event_type,
        brightness=80,
        hour=hour  # ← Passar a hora simulada!
    )
    
    # Mapear event_type para label
    event_label = event_type if event_type else "Nenhum evento"
    
    return {
        "simulated_time": simulated_time.strftime("%H:%M"),
        "chronotype": chronotype,
        "event_type": event_type or "nenhum",
        "triggered_by": color_command["triggered_by"],
        "color": {
            "r": color_command["r"],
            "g": color_command["g"],
            "b": color_command["b"],
            "cct": color_command["cct"],
            "label": color_command["label"],
            "brightness": color_command["brightness"],
        },
        "explanation": (
            f"Evento '{event_type}' sobrescreve fase circadiana" 
            if event_type else
            f"Fase circadiana: {color_command['label']}"
        )
    }


@router.get("/simulate-timeline")
def simulate_timeline(
    chronotype: str = "morning",
    snapshots: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simula 24h com time-skips, mostrando transições de luz.
    Perfeito para demonstração educativa!
    
    Parâmetros:
    - chronotype: 'morning' ou 'evening'
    - snapshots: número de snapshots (padrão 24, um por hora)
    
    Eventos distribuídos:
    - 10:00 - Reunião (meeting)
    - 18:00 - Leitura (reading)
    
    Exemplo:
    GET /api/calendar/simulate-timeline?chronotype=morning&snapshots=24
    """
    
    if chronotype not in ["morning", "evening"]:
        raise HTTPException(status_code=400, detail="chronotype deve ser 'morning' ou 'evening'")
    if snapshots < 1 or snapshots > 96:
        raise HTTPException(status_code=400, detail="snapshots deve estar entre 1-96")
    
    import pytz
    tz_brazil = pytz.timezone("America/Sao_Paulo")
    
    # Distribuir eventos ao longo do dia
    events_schedule = {
        10: "meeting",    # Reunião às 10h
        18: "reading",    # Leitura às 18h
    }
    
    timeline = []
    interval = 24 / snapshots
    
    for i in range(snapshots):
        # Calcular a hora
        hour_float = i * interval
        hour = int(hour_float)
        
        # Verificar se há evento nesta hora
        event_type = None
        for event_hour, event_name in events_schedule.items():
            # Considerar evento se estiver dentro de 1 hora
            if abs(hour - event_hour) < 1:
                event_type = event_name
                break
        
        # Calcular a cor de luz COM A HORA SIMULADA
        color_command = calculate_light_command(
            chronotype=chronotype,
            event_type=event_type,
            brightness=80,
            hour=hour  # ← Passar a hora simulada!
        )
        
        # Criar datetime simulado
        simulated_time = tz_brazil.localize(
            datetime(2026, 5, 17, hour, int((hour_float % 1) * 60))
        )
        
        timeline.append({
            "index": i,
            "hour": hour,
            "time": simulated_time.strftime("%H:%M"),
            "event_type": event_type,
            "color": {
                "r": color_command["r"],
                "g": color_command["g"],
                "b": color_command["b"],
                "cct": color_command["cct"],
                "label": color_command["label"],
                "brightness": color_command["brightness"],
            },
            "triggered_by": color_command["triggered_by"],
            "explanation": (
                f"📅 Evento '{event_type}' em andamento"
                if event_type else
                f"🌅 Fase circadiana: {color_command['label']}"
            )
        })
    
    return {
        "timeline": timeline,
        "chronotype": chronotype,
        "total_snapshots": snapshots,
        "duration_seconds": 20,  # Tempo recomendado para animar
        "events": {
            10: "meeting - Reunião/Call",
            18: "reading - Leitura"
        }
    }
