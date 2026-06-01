import os
from redis import Redis

# Configuração do Redis via variáveis de ambiente
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Função para criar conexão com Redis
def get_redis_client() -> Redis:
    """
    Cria e retorna uma instância do cliente Redis.
    
    Returns:
        Redis: Cliente Redis conectado
    """
    return Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD if REDIS_PASSWORD else None,
        db=REDIS_DB,
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
