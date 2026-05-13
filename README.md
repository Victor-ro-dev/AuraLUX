# AuraLUX — Smart Luminary

> Luminária inteligente que ajusta temperatura de cor e brilho com base no seu **cronotipo** (matutino/vespertino) e nos compromissos do **Outlook**, promovendo saúde circadiana e produtividade.

---

## Arquitetura

```
┌─────────────────────┐     HTTP      ┌─────────────────────┐
│   Frontend (React)  │ ────────────► │  Backend (FastAPI)   │
│   localhost:5173    │ ◄──────────── │   localhost:8000     │
└─────────────────────┘               └────────┬────────────┘
                                               │ MQTT publish
                                               ▼
                                    ┌──────────────────────┐
                                    │  Broker (Mosquitto)   │
                                    │    localhost:1883     │
                                    └──────────┬───────────┘
                                               │ MQTT subscribe
                                               ▼
                                    ┌──────────────────────┐
                                    │     ESP32 / ESP8266   │
                                    │  Fita LED NeoPixel    │
                                    └──────────────────────┘
```

## Fluxo de Dados

1. **Python** (backend) lê o calendário Outlook e o perfil do usuário
2. **Python** publica `{"r":255,"g":100,"b":0,"brightness":80}` no Mosquitto
3. **Mosquitto** entrega a mensagem ao ESP32
4. **ESP32** converte o comando para os pinos de saída da fita LED

---

## Estrutura do Projeto

```
AuraLUX/
├── backend/
│   ├── requirements.txt
│   ├── run.py                    # Inicia o servidor FastAPI
│   ├── .env.example              # Copie para .env e preencha
│   ├── mqtt_service/             # Serviço MQTT separado (escuta status dos dispositivos)
│   │   └── run.py
│   └── src/
│       ├── api/routes/           # auth, users, light, calendar
│       ├── core/entities/        # User, LightCommand (SQLAlchemy)
│       ├── core/schemas/         # Pydantic models
│       ├── services/             # auth, user, light, calendar, mqtt_publisher
│       └── utils/
│           ├── auth/             # JWT handler
│           └── chronobiology/    # color_calculator.py ← lógica circadiana
├── frontend/
│   ├── src/
│   │   ├── pages/               # Login, Register, Form (cronotipo), Dashboard
│   │   ├── hooks/               # useLogin, useRegister, useLight
│   │   ├── services/            # authApi, userApi, lightApi
│   │   └── contexts/            # AuthContext
│   └── package.json
└── firmware/
    └── esp32/
        ├── main.cpp             # Firmware completo (WiFi + MQTT + NeoPixel)
        └── platformio.ini
```

---

## Como Executar

### 1. Broker MQTT (Mosquitto)

```bash
# Instale: https://mosquitto.org/download/
mosquitto -v
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # preencha as variáveis
pip install -r requirements.txt
python run.py               # FastAPI em http://localhost:8000
```

Docs interativas: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # React em http://localhost:5173
```

### 4. Firmware (ESP32)

1. Abra `firmware/esp32/` com **PlatformIO** (VS Code)
2. Edite `main.cpp`: preencha `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_BROKER` e `DEVICE_ID`
3. Conecte o ESP32 via USB e execute **Upload**

---

## Lógica Circadiana (`color_calculator.py`)

| Fase          | Hora (Matutino) | Cor                   | CCT   |
| ------------- | --------------- | --------------------- | ----- |
| Acordar       | 04h–07h         | Âmbar suave           | 2200K |
| Trabalho      | 07h–09h         | Branco neutro         | 5000K |
| Foco Profundo | 09h–12h         | Branco frio / azulado | 6500K |
| Neutro        | 12h–14h         | Branco quente         | 3500K |
| Trabalho      | 14h–17h         | Branco neutro         | 5000K |
| Relaxamento   | 17h–20h         | Âmbar quente          | 2700K |
| Sono          | 20h+            | Âmbar profundo        | 1800K |

> **Vespertinos** recebem as mesmas fases com +2h de offset.

### Integração Outlook

O backend classifica o título do evento e sobrepõe a luz do cronotipo:

| Tipo de evento                | Luz aplicada          |
| ----------------------------- | --------------------- |
| "Foco", "Deep Work", "Estudo" | Foco Profundo (6500K) |
| "Reunião", "Meeting", "Call"  | Reunião (4000K)       |
| "Leitura", "Pausa", "Almoço"  | Relaxamento (2700K)   |

---

## Tópicos MQTT

```
auralux/{device_id}/light/color      → {"r":200,"g":230,"b":255,"brightness":80}
auralux/{device_id}/light/brightness → {"brightness":60}
auralux/{device_id}/light/power      → {"power":true}
auralux/{device_id}/status           → {"status":"online","device":"device001"}
```

---

## Integração Microsoft Outlook

1. Registre um app em: https://portal.azure.com → **App registrations**
2. Permissão necessária: `Calendars.Read`
3. Preencha `OUTLOOK_CLIENT_ID` e `OUTLOOK_CLIENT_SECRET` no `.env`
4. O frontend envia o token OAuth2 no header `X-Outlook-Token` para `POST /api/calendar/sync-light`
