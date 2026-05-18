import paho.mqtt.client as mqtt
import json
from application.configs.mqtt_configs import mqtt_broker_config
from application.main.mqtt_connection.callbacks import MqttCallbacks


class MqttClientConnection:
    """
    Gerencia a conexão MQTT do serviço AuraLUX.
    Baseado no padrão do ThermoCare-UPX3.
    
    Este cliente atua como PUBLISHER de comandos de luz para os dispositivos ESP32.
    Tópicos publicados:
        - auralux/{user_id}/light/color      → {"r": 255, "g": 100, "b": 0, "brightness": 80}
        - auralux/{user_id}/light/brightness → {"brightness": 60}
        - auralux/{user_id}/light/power      → {"power": true}
    """

    def __init__(self, broker_ip: str, broker_port: int, client_name: str, keep_alive: int):
        self.__broker_ip = broker_ip
        self.__broker_port = broker_port
        self.__client_name = client_name
        self.__keep_alive = keep_alive
        self.__mqtt_client = None

    def start_connection(self):
        mqtt_client = mqtt.Client(self.__client_name)

        mqtt_client.on_connect = MqttCallbacks.on_connect
        mqtt_client.on_subscribe = MqttCallbacks.on_subscribe
        mqtt_client.on_message = MqttCallbacks.on_message
        mqtt_client.on_disconnect = MqttCallbacks.on_disconnect

        mqtt_client.connect(
            host=self.__broker_ip,
            port=self.__broker_port,
            keepalive=self.__keep_alive,
        )
        self.__mqtt_client = mqtt_client
        self.__mqtt_client.loop_start()
        print("🌟 AuraLUX MQTT Service iniciado")

    def end_connection(self):
        try:
            self.__mqtt_client.loop_stop()
            self.__mqtt_client.disconnect()
            return True
        except Exception as e:
            print(f"Erro ao encerrar conexão: {e}")

    def publish_light_command(self, user_id: str, payload: dict) -> bool:
        """Publica comando de cor/brilho para o dispositivo do usuário."""
        topic = f"{mqtt_broker_config['TOPIC_BASE']}/{user_id}/light/color"
        result = self.__mqtt_client.publish(topic, json.dumps(payload), qos=1)
        print(f"📡 Publicado em {topic}: {payload}")
        return result.rc == 0

    def publish_brightness(self, user_id: str, brightness: int) -> bool:
        topic = f"{mqtt_broker_config['TOPIC_BASE']}/{user_id}/light/brightness"
        result = self.__mqtt_client.publish(topic, json.dumps({"brightness": brightness}), qos=1)
        print(f"💡 Brilho publicado para {user_id}: {brightness}%")
        return result.rc == 0

    def publish_power(self, user_id: str, state: bool) -> bool:
        topic = f"{mqtt_broker_config['TOPIC_BASE']}/{user_id}/light/power"
        result = self.__mqtt_client.publish(topic, json.dumps({"power": state}), qos=1)
        print(f"⚡ Power publicado para {user_id}: {'ON' if state else 'OFF'}")
        return result.rc == 0
