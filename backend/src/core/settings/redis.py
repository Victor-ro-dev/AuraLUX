from redis import Redis
from src.core.config import settings

# Função para criar conexão com Redis
def get_redis_client() -> Redis:
    """
    Cria e retorna uma instância do cliente Redis.
    
    Returns:
        Redis: Cliente Redis conectado
    """
    return Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
        db=settings.REDIS_DB,
        decode_responses=True,
    )

# Instância global do cliente Redis (lazy initialization)
_redis_client = None

def init_redis() -> Redis:
    """Inicializa a conexão com Redis"""
    global _redis_client
    _redis_client = get_redis_client()
    return _redis_client

def get_redis() -> Redis:
    """Retorna a instância global do cliente Redis"""
    global _redis_client
    if _redis_client is None:
        _redis_client = init_redis()
    return _redis_client
