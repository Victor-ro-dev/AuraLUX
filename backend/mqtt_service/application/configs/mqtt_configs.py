# ──────────────────────────────────────────────────────────
#  Configuração do Broker MQTT - AuraLUX
#  Padrão de tópicos: auralux/{user_id}/light/{tipo}
# ──────────────────────────────────────────────────────────

mqtt_broker_config = {
    'HOST': 'localhost',
    'PORT': 1883,
    'CLIENT_NAME': 'auralux_mqtt_service',
    'KEEP_ALIVE': 60,
    'TOPIC_BASE': 'auralux',
}
