#!/usr/bin/env python3
"""
Script para testar a conexão com Redis e enviar comandos
"""
import os
import sys
from dotenv import load_dotenv
from redis import Redis
import json

# Carrega variáveis de ambiente
load_dotenv()

print("=" * 60)
print("🔍 TESTE DE CONEXÃO REDIS")
print("=" * 60)

# Lê configurações
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_DB = int(os.getenv("REDIS_DB", 0))

print(f"\n📋 Configurações carregadas:")
print(f"   Host: {REDIS_HOST}")
print(f"   Port: {REDIS_PORT}")
print(f"   Password: {'✓ Carregada' if REDIS_PASSWORD else '✗ Não configurada'}")
print(f"   DB: {REDIS_DB}")

# Tenta conectar
try:
    print(f"\n🔌 Conectando ao Redis...")
    redis_client = Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD if REDIS_PASSWORD else None,
        db=REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=5,
    )
    
    # Testa a conexão
    redis_client.ping()
    print("✅ Conectado com sucesso!")
    
    # Testa publicação
    print(f"\n📤 Testando publicação...")
    
    # Comando 1: Light command (RGB + brightness)
    device_id = "esp32_device_001"
    command_data = {
        "r": 255,
        "g": 0,
        "b": 0,
        "brightness": 100
    }
    channel = f"light:command:{device_id}"
    
    result = redis_client.publish(channel, json.dumps(command_data))
    print(f"   Canal: {channel}")
    print(f"   Payload: {command_data}")
    print(f"   Status: {'✅ Publicado' if result > 0 else '⚠️  Nenhum subscriber'}")
    
    # Comando 2: Brightness only
    print(f"\n📤 Testando brightness...")
    brightness_channel = f"light:brightness:{device_id}"
    brightness_data = {"brightness": 50}
    
    result = redis_client.publish(brightness_channel, json.dumps(brightness_data))
    print(f"   Canal: {brightness_channel}")
    print(f"   Payload: {brightness_data}")
    print(f"   Status: {'✅ Publicado' if result > 0 else '⚠️  Nenhum subscriber'}")
    
    # Comando 3: Power control
    print(f"\n📤 Testando power control...")
    power_channel = f"light:power:{device_id}"
    power_data = {"state": True}
    
    result = redis_client.publish(power_channel, json.dumps(power_data))
    print(f"   Canal: {power_channel}")
    print(f"   Payload: {power_data}")
    print(f"   Status: {'✅ Publicado' if result > 0 else '⚠️  Nenhum subscriber'}")
    
    print("\n" + "=" * 60)
    print("✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
    print("=" * 60)
    print("\n💡 Se o ESP32 está conectado, verifique:")
    print("   1. Monitor serial (COM7) para ver as mensagens recebidas")
    print("   2. Se os LEDs mudarem de cor")
    print("\nExecute: pio device monitor -p COM7 -b 115200")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ ERRO: {type(e).__name__}")
    print(f"   Mensagem: {str(e)}")
    print("\n" + "=" * 60)
    print("🔧 Verificar:")
    print("   1. Se Redis Cloud está acessível (firewall, IP whitelisting)")
    print("   2. Credenciais corretas no arquivo .env")
    print("   3. Conexão de internet está ativa")
    print("=" * 60)
    sys.exit(1)
