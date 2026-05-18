"""
Serviço de OAuth 2.0 — Authorization Code Flow (Microsoft Graph API)
=====================================================================
Responsável por:
  1. Gerar a URL de autorização para o usuário consentir o acesso.
  2. Trocar o código de autorização (code) pelos tokens de acesso.
  3. Renovar o access_token via refresh_token quando necessário.
"""

import os
import requests
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from src.core.entities.user import User
from src.core.repositories.user_repository import UserRepository

CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID")
CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET")
TENANT_ID = os.getenv("OUTLOOK_TENANT_ID", "common")  # "common" para multi-tenant
REDIRECT_URI = "http://localhost:5173/auth/outlook/callback"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0"
SCOPES = "openid profile User.Read Calendars.Read offline_access"


class OutlookOAuthService:

    def get_auth_url(self, code_challenge: str = None) -> str:
        """Gera a URL de autorização que redireciona o usuário ao Microsoft."""
        from urllib.parse import urlencode
        params = {
            "client_id": CLIENT_ID,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "response_mode": "query",
            "scope": SCOPES,
        }
        if code_challenge:
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"  # SHA256
        return f"{AUTHORITY}/authorize?{urlencode(params)}"

    def exchange_code(self, code: str, db: Session, user_id: str, code_verifier: str = None) -> None:
        """Troca o código de autorização pelos tokens e persiste no banco."""
        print(f"[exchange_code] Iniciando troca de código")
        print(f"[exchange_code] Code: {code[:20]}...")
        print(f"[exchange_code] Code Verifier: {code_verifier[:20] if code_verifier else 'NONE'}...")
        
        data = {
            "client_id": CLIENT_ID,
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        # Se usar PKCE, NÃO enviar client_secret (Azure rejeita em public clients)
        if code_verifier:
            data["code_verifier"] = code_verifier
            print(f"[exchange_code] PKCE habilitado: code_verifier adicionado, client_secret REMOVIDO")
        else:
            # Só usar client_secret se NÃO estiver usando PKCE
            data["client_secret"] = CLIENT_SECRET
            data["scope"] = SCOPES
            print(f"[exchange_code] Fluxo confidencial: client_secret adicionado")
        
        print(f"[exchange_code] Enviando requisição ao Microsoft: {AUTHORITY}/token")
        resp = requests.post(
            f"{AUTHORITY}/token",
            data=data,
            headers={"Origin": "http://localhost:5173"},  # Necessário para SPAs
            timeout=15,
        )
        print(f"[exchange_code] Resposta Microsoft: {resp.status_code}")
        if resp.status_code != 200:
            print(f"[exchange_code] Erro na resposta: {resp.text}")
        
        resp.raise_for_status()
        tokens = resp.json()
        print(f"[exchange_code] ✓ Tokens recebidos: access_token={tokens['access_token'][:20]}...")

        expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
        UserRepository(db).save_outlook_tokens(
            user_id=user_id,
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            expiry=expiry,
        )
        print(f"[exchange_code] ✓ Tokens salvos no banco")

    def get_valid_access_token(self, user: User, db: Session) -> Optional[str]:
        """
        Retorna um access_token válido para o usuário.
        Renova automaticamente usando o refresh_token se estiver próximo do vencimento.
        """
        if not user.outlook_token:
            return None

        now = datetime.utcnow()
        if (
            user.outlook_token_expiry is not None
            and user.outlook_token_expiry <= now + timedelta(minutes=5)
        ):
            return self._refresh(user, db)

        return user.outlook_token

    def _refresh(self, user: User, db: Session) -> Optional[str]:
        """Usa o refresh_token para obter um novo par de tokens."""
        if not user.outlook_refresh_token:
            return None
        try:
            resp = requests.post(
                f"{AUTHORITY}/token",
                data={
                    "client_id": CLIENT_ID,
                    "refresh_token": user.outlook_refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Origin": "http://localhost:5173"},  # Necessário para SPAs
                timeout=15,
            )
            resp.raise_for_status()
            tokens = resp.json()

            expiry = datetime.utcnow() + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )
            UserRepository(db).save_outlook_tokens(
                user_id=user.id,
                access_token=tokens["access_token"],
                refresh_token=tokens.get("refresh_token", user.outlook_refresh_token),
                expiry=expiry,
            )
            return tokens["access_token"]
        except Exception:
            return None
