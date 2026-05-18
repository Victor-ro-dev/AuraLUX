import json
from application.configs.mqtt_configs import mqtt_broker_config


class MqttCallbacks:
    """
    Callbacks MQTT do serviço AuraLUX.
    Este serviço escuta os tópicos de STATUS dos dispositivos ESP32
    e pode registrar atualizações no banco de dados.
    """

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("✅ AuraLUX MQTT Service conectado ao broker!")
            # Escuta status de todos os dispositivos
            topic = f"{mqtt_broker_config['TOPIC_BASE']}/+/status"
            client.subscribe(topic)
            print(f"📡 Subscrito em: {topic}")
        else:
            print(f"❌ Falha na conexão com o broker (rc={rc})")

    def on_subscribe(client, userdata, mid, granted_qos):
        print(f"✅ Subscrição confirmada | QoS: {granted_qos}")

    def on_message(client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            print(f"📨 Status recebido de [{msg.topic}]: {data}")
        except Exception as e:
            print(f"⚠️ Erro ao processar mensagem: {e}")

    def on_disconnect(client, userdata, rc):
        print(f"⚠️ Desconectado do broker MQTT (rc={rc})")
