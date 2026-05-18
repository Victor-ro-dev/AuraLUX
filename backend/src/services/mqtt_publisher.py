"""
Serviço MQTT Publisher - AuraLUX
==================================
Publica comandos de luz para os dispositivos ESP32 via broker Mosquitto.

Tópicos publicados:
  auralux/{device_id}/light/color      → {"r":255,"g":100,"b":0,"brightness":80}
  auralux/{device_id}/light/brightness → {"brightness":60}
  auralux/{device_id}/light/power      → {"power":true}
"""

import paho.mqtt.client as mqtt
import json
import os
from dotenv import load_dotenv

load_dotenv()

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_BASE = "auralux"


class MqttPublisherService:
    def __init__(self):
        self.__client = mqtt.Client("auralux_backend_publisher")
        self.__connected = False

    def connect(self):
        try:
            self.__client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            self.__client.loop_start()
            self.__connected = True
            print(f"✅ MQTT Publisher conectado em {MQTT_HOST}:{MQTT_PORT}")
        except Exception as e:
            print(f"⚠️ Falha ao conectar no MQTT: {e}. Comandos não serão enviados.")
            self.__connected = False

    def disconnect(self):
        if self.__connected:
            self.__client.loop_stop()
            self.__client.disconnect()
            self.__connected = False

    def _publish(self, topic: str, payload: dict) -> bool:
        if not self.__connected:
            print(f"⚠️ MQTT desconectado. Pulando publicação em [{topic}]")
            return False
        result = self.__client.publish(topic, json.dumps(payload), qos=1)
        print(f"📡 MQTT → [{topic}] | {payload}")
        return result.rc == 0

    def publish_light_command(self, device_id: str, payload: dict) -> bool:
        topic = f"{TOPIC_BASE}/{device_id}/light/color"
        return self._publish(topic, payload)

    def publish_brightness(self, device_id: str, brightness: int) -> bool:
        topic = f"{TOPIC_BASE}/{device_id}/light/brightness"
        return self._publish(topic, {"brightness": brightness})

    def publish_power(self, device_id: str, state: bool) -> bool:
        topic = f"{TOPIC_BASE}/{device_id}/light/power"
        return self._publish(topic, {"power": state})


# Instância singleton usada pelos serviços
mqtt_publisher_service = MqttPublisherService()
