"""
Serviço de classificação de eventos via Google Gemini AI.

Arquitetura minimalista:
- Recebe: subject e description do evento
- Retorna: classificação JSON estruturada (category, preset, reason)
- Fallback: keywords simples se Gemini falhar
"""

import os
import json
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class AIClassificationService:
    """Classifica eventos do Outlook usando Gemini ou fallback com keywords."""

    # Fallback keywords para quando Gemini não estiver disponível
    FOCUS_KEYWORDS = ["foco", "focus", "deep work", "concentração", "estudo", "sprint", "code", "dev", "programação", "projeto", "trabalho", "tarefa", "task", "feature", "bug", "debug", "design", "desenvolvimento", "entregar", "finalizar"]
    MEETING_KEYWORDS = ["reunião", "meeting", "call", "sync", "standup", "apresentação", "apresentação", "1:1", "review", "retrospectiva", "planning"]
    RELAX_KEYWORDS = ["leitura", "reading", "pausa", "relaxamento", "almoço", "break", "lunch", "coffee", "meditation", "meditação", "yoga"]

    PRESET_INFO = {
        "focus": {"preset": "deep_focus", "label": "Foco Profundo", "cct": 6500},
        "meeting": {"preset": "meeting", "label": "Reunião", "cct": 4000},
        "relax": {"preset": "relax", "label": "Relaxamento", "cct": 2700},
    }

    def __init__(self):
        """Inicializa o serviço com Gemini."""
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.use_gemini = bool(self.api_key)
        
        if self.use_gemini:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("[AIClassificationService] ✓ Gemini configurado com sucesso")
            except Exception as e:
                logger.warning(f"[AIClassificationService] ⚠ Falha ao configurar Gemini: {e} → usando fallback")
                self.use_gemini = False

    def classify_event(self, subject: str, description: str = "") -> Dict:
        """
        Classifica um evento e retorna a avaliação completa.

        Args:
            subject: Título do evento (obrigatório)
            description: Descrição do evento (opcional, melhora a precisão)

        Returns:
            {
                "event_type": "focus" | "meeting" | "relax" | None,
                "preset": str,
                "label": str,
                "cct": int,
                "reason": str,
                "model": "gemini" | "fallback",
            }
        """
        if not subject:
            return self._default_response(None, "Sem título de evento")

        # Tentar Gemini primeiro
        if self.use_gemini:
            result = self._classify_with_gemini(subject, description)
            if result:
                result["model"] = "gemini"
                return result

        # Fallback: keywords simples
        result = self._classify_with_keywords(subject)
        result["model"] = "fallback"
        return result

    def _classify_with_gemini(self, subject: str, description: str) -> Optional[Dict]:
        """Chama Gemini para classificar o evento."""
        try:
            prompt = f"""
Você é um agente de classificação de eventos de calendário para controle inteligente de iluminação.

Analise este evento e classifique em UMA destas categorias: 'focus', 'meeting', 'relax'.

Título: {subject}
Descrição: {description if description else '(vazia)'}

**IMPORTANTE: O tipo de evento tem PRIORIDADE sobre a hora do dia.**

Responda em JSON com este formato EXATO:
{{
    "event_type": "focus" | "meeting" | "relax",
    "reasoning": "uma linha explicando por quê"
}}

Regras de classificação (em ordem de prioridade):
1. Se contém palavras de TRABALHO/PROJETO: 'focus' (código, desenvolvimento, projeto, sprint, tarefa técnica, debug, features, design)
2. Se contém palavras de REUNIÃO: 'meeting' (reunião, call, sync, standup, apresentação, 1:1)
3. Se contém palavras de PAUSA/DESCANSO: 'relax' (pausa, relaxamento, leitura, almoço, break, meditação)

⚠️ NUNCA classifique baseado na hora do dia - sempre use o CONTEÚDO do evento.

Exemplos:
- "Finalizar projeto" à noite → 'focus' (é trabalho, não hora de dormir!)
- "Reunião de Sprint" de manhã → 'meeting'
- "Pausa para almoço" ao meio-dia → 'relax'

Responda APENAS o JSON, sem markdown ou explicações extras.
"""
            response = self.client.generate_content(prompt, generation_config={"temperature": 0.3})
            response_text = response.text.strip()

            # Parse JSON
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1].replace("json", "").strip()

            data = json.loads(response_text)
            event_type = data.get("event_type")
            reasoning = data.get("reasoning", "")

            if event_type and event_type in self.PRESET_INFO:
                info = self.PRESET_INFO[event_type]
                return {
                    "event_type": event_type,
                    "preset": info["preset"],
                    "label": info["label"],
                    "cct": info["cct"],
                    "reason": reasoning or f"Classificado como {info['label']} via Gemini",
                }

        except json.JSONDecodeError:
            logger.warning("[AIClassificationService] Erro ao fazer parse da resposta Gemini")
        except Exception as e:
            logger.warning(f"[AIClassificationService] Erro ao chamar Gemini: {e}")

        return None

    def _classify_with_keywords(self, subject: str) -> Dict:
        """Fallback: classifica com keywords simples."""
        subject_lower = subject.lower()

        for keyword in self.FOCUS_KEYWORDS:
            if keyword in subject_lower:
                info = self.PRESET_INFO["focus"]
                return {
                    "event_type": "focus",
                    "preset": info["preset"],
                    "label": info["label"],
                    "cct": info["cct"],
                    "reason": f"Palavra-chave reconhecida: '{keyword}'",
                }

        for keyword in self.MEETING_KEYWORDS:
            if keyword in subject_lower:
                info = self.PRESET_INFO["meeting"]
                return {
                    "event_type": "meeting",
                    "preset": info["preset"],
                    "label": info["label"],
                    "cct": info["cct"],
                    "reason": f"Palavra-chave reconhecida: '{keyword}'",
                }

        for keyword in self.RELAX_KEYWORDS:
            if keyword in subject_lower:
                info = self.PRESET_INFO["relax"]
                return {
                    "event_type": "relax",
                    "preset": info["preset"],
                    "label": info["label"],
                    "cct": info["cct"],
                    "reason": f"Palavra-chave reconhecida: '{keyword}'",
                }

        return self._default_response(None, "Nenhuma palavra-chave detectada")

    def _default_response(self, event_type: Optional[str], reason: str) -> Dict:
        """Retorna resposta padrão (sem classificação)."""
        return {
            "event_type": event_type,
            "preset": "circadian",
            "label": "Fase Circadiana",
            "cct": None,
            "reason": reason,
        }


# Singleton para reutilizar o cliente Gemini
_ai_service = None


def get_ai_classification_service() -> AIClassificationService:
    """Factory para obter a instância única do serviço."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIClassificationService()
    return _ai_service
