"""
Integração com Microsoft Graph API (Outlook Calendar)
======================================================
Lê os eventos ativos do calendário do usuário via token OAuth2.

Para obter o token, o usuário deve autorizar o app no Azure AD:
  https://portal.azure.com → App registrations → Permissions: Calendars.Read
"""

import requests
from datetime import datetime, timezone, timedelta
from typing import Optional
import pytz

from src.services.ai_classification_service import get_ai_classification_service


GRAPH_BASE = "https://graph.microsoft.com/v1.0"

# Palavras-chave para classificação automática de eventos
FOCUS_KEYWORDS = ["foco", "focus", "deep work", "concentração", "estudo", "sprint"]
MEETING_KEYWORDS = ["reunião", "meeting", "call", "sync", "standup", "apresentação"]
RELAX_KEYWORDS = ["leitura", "reading", "pausa", "relaxamento", "almoço", "break"]


def _convert_to_brasilia_time(datetime_str: str) -> str:
    """Converte um datetime string UTC para Brasília (UTC-3)."""
    if not datetime_str:
        return datetime_str
    
    try:
        # Parse o datetime (pode vir com ou sem Z)
        if datetime_str.endswith('Z'):
            dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        elif '+' in datetime_str or datetime_str.count('-') > 2:
            # Já tem timezone
            dt = datetime.fromisoformat(datetime_str.replace('.0000000', ''))
        else:
            # Sem timezone, assumir UTC
            dt = datetime.fromisoformat(datetime_str.replace('.0000000', ''))
            dt = dt.replace(tzinfo=timezone.utc)
        
        # Converter para Brasília
        brasilia_tz = pytz.timezone("America/Sao_Paulo")
        dt_brasilia = dt.astimezone(brasilia_tz)
        
        # Retornar no formato ISO
        return dt_brasilia.isoformat()
    except Exception as e:
        print(f"[CalendarService] ⚠️ Erro ao converter horário '{datetime_str}': {e}")
        return datetime_str


class CalendarService:
    """Integração com Microsoft Graph API para leitura de eventos do Outlook."""

    def _get_calendars(self, access_token: str) -> list:
        """Lista todos os calendários do usuário."""
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        try:
            response = requests.get(
                f"{GRAPH_BASE}/me/calendars",
                headers=headers,
                timeout=10,
            )
            if response.status_code != 200:
                return []
            
            calendars = response.json().get("value", [])
            return calendars
        except Exception as exc:
            print(f"[CalendarService] ✗ Erro ao buscar calendários: {str(exc)}")
            return []

    def get_current_events(self, access_token: str) -> list:
        """Retorna eventos que estão ocorrendo agora em Brasília."""
        # Usar timezone de Brasília para referência
        brasilia_tz = pytz.timezone("America/Sao_Paulo")
        now_brasilia = datetime.now(brasilia_tz)
        
        # Converter para UTC para a query (Graph API funciona melhor com UTC)
        now_utc = now_brasilia.astimezone(timezone.utc)
        end_utc = now_utc + timedelta(minutes=1)
        
        start_iso = now_utc.isoformat()
        end_iso = end_utc.isoformat()

        print(f"[CalendarService] 🔍 get_current_events: {now_brasilia.strftime('%H:%M:%S')} (Brasília) → query UTC: {now_utc.strftime('%H:%M:%S')} a {end_utc.strftime('%H:%M:%S')}")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Prefer": 'outlook.timezone="America/Sao_Paulo"',
        }
        params = {
            "startDateTime": start_iso,
            "endDateTime": end_iso,
            "$select": "subject,start,end,bodyPreview",
            "$top": 5,
            "$orderby": "start/dateTime",
        }
        try:
            response = requests.get(
                f"{GRAPH_BASE}/me/calendarview",
                headers=headers,
                params=params,
                timeout=10,
            )
            if response.status_code != 200:
                print(f"[CalendarService] ✗ Graph API retornou {response.status_code}: {response.text[:200]}")
                return []
            
            events = response.json().get("value", [])
            
            if events:
                for evt in events:
                    subj = evt.get('subject', '?')
                    s = evt.get('start', {}).get('dateTime', '?')
                    e = evt.get('end', {}).get('dateTime', '?')
                    print(f"[CalendarService] ✓ Evento AGORA: '{subj}' ({s} → {e})")
            else:
                print(f"[CalendarService] ℹ️ Nenhum evento no intervalo atual")
            
            return [
                {
                    "subject": e.get("subject", ""),
                    "start": e.get("start", {}).get("dateTime", ""),
                    "end": e.get("end", {}).get("dateTime", ""),
                    "description": e.get("bodyPreview", ""),
                }
                for e in events
            ]
        except Exception as exc:
            print(f"[CalendarService] ✗ Erro em get_current_events: {exc}")
            return []

    def get_upcoming_events(self, access_token: str, hours: int = 24) -> list:
        """Retorna eventos dos próximos N horas de todos os calendários."""
        
        # Usar timezone de Brasília para calcular a hora atual
        brasilia_tz = pytz.timezone("America/Sao_Paulo")
        now_brasilia = datetime.now(brasilia_tz)
        now_utc = datetime.now(timezone.utc)
        
        # Começar da meia-noite de hoje em Brasília
        start_brasilia = now_brasilia.replace(hour=0, minute=0, second=0, microsecond=0)
        end_brasilia = start_brasilia + timedelta(days=3)  # Buscar 3 dias completos
        
        # Converter para UTC com timezone-aware
        start_utc = start_brasilia.astimezone(timezone.utc)
        end_utc = end_brasilia.astimezone(timezone.utc)
        
        start_iso = start_utc.isoformat()
        end_iso = end_utc.isoformat()
        
        print(f"[CalendarService] ⏰ {now_brasilia.strftime('%d/%m/%Y %H:%M:%S')} (Brasília)")
        print(f"[CalendarService] 📅 Buscando de {start_brasilia.strftime('%d/%m')} a {end_brasilia.strftime('%d/%m')}")
        
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        params = {
            "startDateTime": start_iso,
            "endDateTime": end_iso,
            "$select": "subject,start,end,categories,isReminderOn",
            "$top": 100,
            "$orderby": "start/dateTime",
        }
        
        all_events = []
        
        try:
            # 1. Buscar eventos do calendário padrão
            response = requests.get(
                f"{GRAPH_BASE}/me/calendarview",
                headers=headers,
                params=params,
                timeout=10,
            )
            
            if response.status_code == 200:
                response_json = response.json()
                events = response_json.get("value", [])
                if events:
                    for evt in events:
                        start_str = evt.get('start', {}).get('dateTime', 'N/A')
                        end_str = evt.get('end', {}).get('dateTime', 'N/A')
                        print(f"  - '{evt.get('subject')}' ({start_str} a {end_str})")
                all_events.extend(events)
            
            # 2. Se não encontrou, buscar em todos os calendários
            if not all_events:
                calendars = self._get_calendars(access_token)
                
                for cal in calendars:
                    cal_id = cal.get("id")
                    cal_name = cal.get("name")
                    cal_response = requests.get(
                        f"{GRAPH_BASE}/me/calendars/{cal_id}/calendarview",
                        headers=headers,
                        params=params,
                        timeout=10,
                    )
                    if cal_response.status_code == 200:
                        cal_events_json = cal_response.json()
                        cal_events = cal_events_json.get("value", [])
                        if cal_events:
                            for evt in cal_events:
                                start_str = evt.get('start', {}).get('dateTime', 'N/A')
                                end_str = evt.get('end', {}).get('dateTime', 'N/A')
                                print(f"  - '{evt.get('subject')}' ({start_str} a {end_str})")
                        all_events.extend(cal_events)
            
            # Parsear eventos
            parsed_events = [
                {
                    "subject": e.get("subject", ""),
                    "start": _convert_to_brasilia_time(e.get("start", {}).get("dateTime", "")),
                    "end": _convert_to_brasilia_time(e.get("end", {}).get("dateTime", "")),
                }
                for e in all_events
            ]
            print(f"[CalendarService] ✓ {len(parsed_events)} evento(s) encontrado(s)")
            return parsed_events
            
        except Exception as exc:
            print(f"[CalendarService] ✗ Erro: {str(exc)}")
            return []

    def classify_event(self, subject: str) -> Optional[str]:
        """Classifica o tipo de evento com base no título."""
        subject_lower = subject.lower()
        for keyword in FOCUS_KEYWORDS:
            if keyword in subject_lower:
                return "focus"
        for keyword in MEETING_KEYWORDS:
            if keyword in subject_lower:
                return "meeting"
        for keyword in RELAX_KEYWORDS:
            if keyword in subject_lower:
                return "relax"
        return None

    def classify_event_detailed(self, subject: str) -> dict:
        """
        Classifica o evento e retorna avaliação completa para o agente de iluminação.

        Returns:
            {
                "event_type": str | None,
                "preset": str,
                "label": str,
                "reason": str,
            }
        """
        PRESET_INFO = {
            "focus":   {"preset": "deep_focus", "label": "Foco Profundo", "reason": "Evento de foco/concentração detectado → luz fria e estimulante (6500K)"},
            "meeting": {"preset": "meeting",    "label": "Reunião",       "reason": "Evento de reunião detectado → luz neutra e acolhedora (4000K)"},
            "relax":   {"preset": "relax",      "label": "Relaxamento",   "reason": "Evento de pausa/relaxamento detectado → luz âmbar suave (2700K)"},
        }

        event_type = self.classify_event(subject)

        if event_type and event_type in PRESET_INFO:
            info = PRESET_INFO[event_type]
            return {
                "event_type": event_type,
                "preset": info["preset"],
                "label": info["label"],
                "reason": info["reason"],
            }

        return {
            "event_type": None,
            "preset": "circadian",
            "label": "Fase Circadiana",
            "reason": f"Evento '{subject}' sem palavras-chave reconhecidas → usando fase circadiana do horário",
        }

    def classify_event_with_ai(self, subject: str, description: str = "") -> dict:
        """
        Classifica o evento usando IA (Gemini) com fallback para keywords.

        Returns:
            {
                "event_type": str | None,
                "preset": str,
                "label": str,
                "cct": int | None,
                "reason": str,
                "model": "gemini" | "fallback",
            }
        """
        ai_service = get_ai_classification_service()
        return ai_service.classify_event(subject, description)
