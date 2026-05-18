from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.settings.database import get_db
from src.core.entities.user import User
from src.core.repositories.user_repository import UserRepository
from src.services.outlook_oauth_service import OutlookOAuthService
from src.services.dependencies.auth_dependencies import get_current_user

router = APIRouter()


class CodeBody(BaseModel):
    code: str
    code_verifier: str


@router.get("/url")
def get_auth_url(
    current_user: User = Depends(get_current_user),
    code_challenge: str = Query(None),
):
    """Retorna a URL de autorização Microsoft para o usuário conectar o Outlook."""
    print(f"[DEBUG /url] code_challenge recebido: {code_challenge}")
    url = OutlookOAuthService().get_auth_url(code_challenge=code_challenge)
    print(f"[DEBUG] URL gerada para {current_user.email}: {url}")
    return {"url": url}


@router.post("/callback")
def outlook_callback(
    body: CodeBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recebe o código de autorização retornado pela Microsoft,
    realiza a troca pelos tokens (com PKCE) e persiste no banco de dados.
    """
    print(f"[Outlook Callback] User: {current_user.email}")
    print(f"[Outlook Callback] Code: {body.code[:20] if body.code else 'NONE'}...")
    print(f"[Outlook Callback] Code Verifier: {body.code_verifier[:20] if body.code_verifier else 'NONE'}...")
    
    if not body.code:
        raise HTTPException(status_code=400, detail="Code é obrigatório")
    if not body.code_verifier:
        raise HTTPException(status_code=400, detail="Code Verifier é obrigatório para PKCE")
    
    try:
        OutlookOAuthService().exchange_code(body.code, db, current_user.id, code_verifier=body.code_verifier)
        print(f"[Outlook Callback] ✓ Tokens salvos para {current_user.email}")
        return {"connected": True}
    except Exception as exc:
        print(f"[Outlook Callback] ✗ Erro: {str(exc)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/status")
def outlook_status(current_user: User = Depends(get_current_user)):
    """Informa se o usuário já tem o Outlook conectado."""
    return {"connected": current_user.outlook_token is not None}


@router.delete("/disconnect")
def disconnect_outlook(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove os tokens do Outlook vinculados ao usuário."""
    UserRepository(db).clear_outlook_tokens(current_user.id)
    return {"connected": False}
