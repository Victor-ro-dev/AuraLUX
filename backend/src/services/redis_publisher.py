import json
from src.core.settings.redis import get_redis


class RedisPublisher:
    """Publicador de mensagens Redis para comunicação com ESP32"""

    def __init__(self):
        self.redis = get_redis()

    def publish_light_command(self, device_id: str, command: dict):
        """
        Publica um comando de luz para o ESP32.

        Args:
            device_id: ID do dispositivo ESP32
            command: Dicionário com {r, g, b, brightness, cct, label, triggered_by}
        """
        channel = f"light:command:{device_id}"
        message = json.dumps(command)
        self.redis.publish(channel, message)

    def publish_brightness(self, device_id: str, brightness: int):
        """
        Publica um comando de brilho para o ESP32.

        Args:
            device_id: ID do dispositivo ESP32
            brightness: Valor de brilho (0-100)
        """
        channel = f"light:brightness:{device_id}"
        message = json.dumps({"brightness": brightness})
        self.redis.publish(channel, message)

    def publish_power(self, device_id: str, state: bool):
        """
        Publica um comando de ligar/desligar para o ESP32.

        Args:
            device_id: ID do dispositivo ESP32
            state: True para ligar, False para desligar
        """
        channel = f"light:power:{device_id}"
        message = json.dumps({"power": state})
        self.redis.publish(channel, message)


# Instância global
redis_publisher_service = RedisPublisher()
