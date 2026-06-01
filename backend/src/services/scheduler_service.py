"""
Agendador de tarefas (scheduler) para o agente automático de iluminação.

Roda a cada 5 minutos e aplica iluminação automática para todos os usuários
que têm auto_light_mode ativado.
"""

import logging
import sys
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from src.core.entities.user import User
from src.core.settings.database import SessionLocal
from src.services.calendar_service import CalendarService
from src.services.light_service import LightService
from src.services.outlook_oauth_service import OutlookOAuthService

# Garantir que logs apareçam mesmo com threading
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Adicionar handler para stderr se não tiver
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[AutoLightScheduler] %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class AutoLightScheduler:
    """Scheduler que aplica iluminação automática a cada 5 minutos."""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.is_running = False

    def start(self):
        """Inicia o scheduler."""
        if self.is_running:
            logger.warning("⚠️ Scheduler já está rodando")
            return

        try:
            print("\n" + "="*60)
            print("[AutoLightScheduler] 🚀 INICIANDO SCHEDULER...")
            print("="*60 + "\n")
            logger.info("🚀 Iniciando scheduler de iluminação automática")
            
            # Agendador: rodaria a cada 1 minuto para detectar mudanças rápido
            self.scheduler.add_job(
                self.check_and_apply_lights,
                "interval",
                minutes=1,
                id="auto_light_agent",
                name="Auto Light Agent - Check Every 1 Minute",
                replace_existing=True,
            )
            
            logger.info("✓ Job adicionado ao scheduler")
            
            self.scheduler.start()
            self.is_running = True
            
            print("\n" + "="*60)
            print("[AutoLightScheduler] ✓ SCHEDULER RODANDO!")
            print("[AutoLightScheduler] ⏱️ Verificará calendário a cada 1 MINUTO")
            print("="*60 + "\n")
            logger.info("✓ Scheduler iniciado com sucesso - verifica a cada 1 MINUTO")
            
        except Exception as e:
            print("\n" + "="*60)
            print("[AutoLightScheduler] ✗ ERRO AO INICIAR SCHEDULER!")
            print(f"[AutoLightScheduler] {str(e)}")
            print("="*60 + "\n")
            logger.error(f"✗ Erro ao iniciar scheduler: {e}", exc_info=True)
            raise

    def stop(self):
        """Para o scheduler."""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("[AutoLightScheduler] ⚠️ Scheduler parado")

    def check_and_apply_lights(self):
        """
        Verifica todos os usuários com auto_light_mode ativado e aplica
        iluminação automaticamente baseada no evento do Outlook.
        """
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"\n[AutoLightScheduler] 🔄 Verificando em {timestamp}")
        logger.debug(f"🔄 Verificando agente automático em {timestamp}")

        db = SessionLocal()
        try:
            # Buscar todos os usuários
            all_users = db.query(User).all()

            if not all_users:
                print("[AutoLightScheduler] ℹ️ Nenhum usuário no sistema")
                logger.debug("ℹ️ Nenhum usuário no sistema")
                return

            users_auto = 0       # Quantos estão em modo automático
            users_processed = 0  # Quantos tiveram evento e luz aplicada
            users_no_event = 0   # Quantos estão em auto mas sem evento agora
            
            for user in all_users:
                try:
                    # Verificar se está em modo automático (sessão isolada)
                    check_db = SessionLocal()
                    try:
                        user_check = check_db.query(User).filter(User.id == user.id).first()
                        is_auto = user_check and user_check.auto_light_mode
                    finally:
                        check_db.close()
                    
                    if not is_auto:
                        logger.debug(f"⏸️ {user.email} em modo manual, pulando...")
                        continue
                    
                    users_auto += 1
                    result = self._apply_light_for_user(user, db)
                    if result:
                        users_processed += 1
                    else:
                        users_no_event += 1
                        
                except Exception as e:
                    print(f"[AutoLightScheduler] ✗ Erro ao processar {user.email}: {e}")
                    logger.error(f"✗ Erro ao processar usuário {user.id}: {e}", exc_info=True)

            # Log com informações precisas
            if users_auto == 0:
                print("[AutoLightScheduler] ℹ️ Nenhum usuário em modo automático")
                logger.debug("ℹ️ Nenhum usuário em modo automático")
            elif users_processed > 0:
                print(f"[AutoLightScheduler] ✓ {users_processed}/{users_auto} usuário(s) com evento processado(s)")
                logger.info(f"✓ {users_processed}/{users_auto} usuário(s) com evento processado(s)")
            else:
                print(f"[AutoLightScheduler] ⏳ {users_auto} usuário(s) em modo auto, mas sem evento agora")
                logger.debug(f"⏳ {users_auto} usuário(s) em modo auto, mas sem evento agora")

        except Exception as e:
            print(f"[AutoLightScheduler] ✗ Erro geral: {e}")
            logger.error(f"✗ Erro geral no scheduler: {e}", exc_info=True)
        finally:
            db.close()

    def _apply_light_for_user(self, user: User, db: Session) -> bool:
        """
        Aplica iluminação automática para um usuário específico.
        Retorna True se processado (evento encontrado e luz aplicada), False caso contrário.
        Nota: auto_light_mode já foi verificado no caller.
        """
        try:
            # Verificar se Outlook está conectado
            outlook_service = OutlookOAuthService()
            token = outlook_service.get_valid_access_token(user, db)

            if not token:
                logger.warning(f"⚠️ {user.email} sem Outlook conectado")
                return False

            # Buscar evento que está acontecendo AGORA (não eventos futuros)
            cal_service = CalendarService()
            events = cal_service.get_current_events(token)

            if not events:
                # Sem evento agora - manter configuração anterior
                logger.debug(f"⏳ {user.email} → Sem evento agora")
                return False

            # Há um evento acontecendo agora!
            current_event = events[0]
            
            # Classificar com IA
            classification = cal_service.classify_event_with_ai(
                current_event["subject"],
                current_event.get("description", "")
            )

            # Aplicar luz com tag "scheduler_ai" (prioridade máxima)
            light_service = LightService(db)
            command = light_service.apply_scheduler_ai(user.id, classification["event_type"])

            event_title = current_event["subject"]
            msg = f"✓ {user.email} → {classification['label']} ({event_title})"
            print(f"[AutoLightScheduler] {msg}")
            logger.info(msg)
            return True
            
        except Exception as e:
            print(f"[AutoLightScheduler] ✗ Erro ao processar {user.email}: {str(e)}")
            logger.error(f"✗ Erro ao processar {user.email}: {e}", exc_info=True)
            return False


# Instância global do scheduler
scheduler = AutoLightScheduler()


def get_scheduler() -> AutoLightScheduler:
    """Factory para obter a instância do scheduler."""
    return scheduler
