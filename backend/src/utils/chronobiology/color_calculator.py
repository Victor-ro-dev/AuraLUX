"""
Módulo de Cronobiologia - AuraLUX
==================================
Calcula o comando de luz ideal com base em:
  1. Cronotipo do usuário (matutino / vespertino)
  2. Fase circadiana atual (hora do dia)
  3. Tipo de evento no calendário

Temperatura de cor (CCT) → RGB aproximado:
  6500K  →  Branco frio / azulado   (Foco Profundo)
  5000K  →  Branco neutro-frio      (Trabalho)
  4000K  →  Branco neutro           (Reunião)
  3000K  →  Branco quente           (Tarde)
  2700K  →  Âmbar quente            (Relaxamento / Leitura)
  1800K  →  Âmbar profundo          (Sono)
"""

from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

TZ_BRAZIL = ZoneInfo("America/Sao_Paulo")

# ──────────────────────────────────────────────
#  Presets de cor por fase / atividade
# ──────────────────────────────────────────────
COLOR_PRESETS = {
    "wake_up":    {"r": 255, "g": 120, "b": 30,  "cct": 2200, "label": "Acordar"},
    "work":       {"r": 255, "g": 255, "b": 240, "cct": 5000, "label": "Trabalho"},
    "deep_focus": {"r": 200, "g": 230, "b": 255, "cct": 6500, "label": "Foco Profundo"},
    "meeting":    {"r": 255, "g": 220, "b": 180, "cct": 4000, "label": "Reunião"},
    "neutral":    {"r": 255, "g": 200, "b": 140, "cct": 3500, "label": "Neutro"},
    "relax":      {"r": 255, "g": 160, "b": 60,  "cct": 2700, "label": "Relaxamento"},
    "sleep":      {"r": 255, "g": 80,  "b": 0,   "cct": 1800, "label": "Preparar Sono"},
}

# Offset em horas para cada cronotipo (matutino = 0h, vespertino = +2h)
CHRONOTYPE_OFFSET = {
    "morning": 0,
    "evening": 2,
}


def get_circadian_phase(current_time: datetime, chronotype: str) -> str:
    """Retorna a fase circadiana baseada na hora e cronotipo do usuário."""
    offset = CHRONOTYPE_OFFSET.get(chronotype, 0)
    adjusted_hour = (current_time.hour - offset) % 24

    if 4 <= adjusted_hour < 7:
        return "wake_up"
    elif 7 <= adjusted_hour < 9:
        return "work"
    elif 9 <= adjusted_hour < 12:
        return "deep_focus"
    elif 12 <= adjusted_hour < 14:
        return "neutral"
    elif 14 <= adjusted_hour < 17:
        return "work"
    elif 17 <= adjusted_hour < 20:
        return "relax"
    elif 20 <= adjusted_hour < 22:
        return "sleep"
    else:
        return "sleep"


def get_light_for_event(event_type: str) -> dict:
    """Retorna o preset de luz para o tipo de evento do calendário."""
    event_lower = event_type.lower()
    mapping = {
        "focus":        "deep_focus",
        "deep_work":    "deep_focus",
        "foco":         "deep_focus",
        "concentração": "deep_focus",
        "estudo":       "deep_focus",
        "meeting":      "meeting",
        "reunião":      "meeting",
        "call":         "meeting",
        "sync":         "meeting",
        "standup":      "meeting",
        "reading":      "relax",
        "leitura":      "relax",
        "pausa":        "relax",
        "relaxamento":  "sleep",
        "almoço":       "neutral",
    }
    for keyword, preset_key in mapping.items():
        if keyword in event_lower:
            return COLOR_PRESETS[preset_key]
    return COLOR_PRESETS["neutral"]


def calculate_light_command(
    chronotype: str,
    event_type: Optional[str] = None,
    brightness: int = 80,
    hour: Optional[int] = None,
) -> dict:
    """
    Função principal: calcula o comando de luz ideal.

    Prioridade:
      1. Evento do calendário (se houver)
      2. Fase circadiana (baseada em hora + cronotipo)
      
    Parâmetros:
      - chronotype: 'morning' ou 'evening'
      - event_type: tipo de evento (foco, reunião, leitura, relaxamento)
      - brightness: brilho de 0-100
      - hour: hora específica (0-23) para simulação. Se None, usa hora atual.
    """
    if hour is not None:
        # Usar hora simulada
        test_time = datetime(2026, 5, 17, hour, 30, tzinfo=TZ_BRAZIL)
    else:
        # Usar hora atual
        test_time = datetime.now(TZ_BRAZIL)

    if event_type:
        preset = get_light_for_event(event_type)
        triggered_by = "calendar"
    else:
        phase = get_circadian_phase(test_time, chronotype)
        preset = COLOR_PRESETS[phase]
        triggered_by = "auto"

    return {
        "r": preset["r"],
        "g": preset["g"],
        "b": preset["b"],
        "cct": preset["cct"],
        "label": preset["label"],
        "brightness": brightness,
        "triggered_by": triggered_by,
    }
