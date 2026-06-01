/**
 * AuraLUX - Firmware ESP32 (Redis Version)
 * ─────────────────────────────────────────────────────────
 * Conecta ao broker Redis e controla uma fita de LED
 * NeoPixel (WS2812B) com base nos comandos recebidos via pub/sub.
 *
 * Canais Redis escutados:
 *   light:command:{DEVICE_ID}      → {"r":255,"g":100,"b":0,"brightness":80}
 *   light:brightness:{DEVICE_ID}   → {"brightness":60}
 *   light:power:{DEVICE_ID}        → {"power":true}
 *
 * Dependências (platformio.ini):
 *   - bblanchon/ArduinoJson
 *   - adafruit/Adafruit NeoPixel
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ─────────────────────────────────────────────
//  Configurações — altere conforme seu ambiente
// ─────────────────────────────────────────────
const char* WIFI_SSID     = "Victor";
const char* WIFI_PASSWORD = "victorm51";

// ─────────────────────────────────────────────
//  Configurações Redis
// ─────────────────────────────────────────────
const char* REDIS_HOST     = "redis-18719.c321.us-east-1-2.ec2.cloud.redislabs.com";
const int   REDIS_PORT     = 18719;
const char* REDIS_PASSWORD = "fE60Sop6gB0YyXL01SlbPREiVOeyDG8C";
const char* DEVICE_ID      = "esp32_device_001";

WiFiClient redisClient;

// ─────────────────────────────────────────────
//  Configuração da Fita de LED (NeoPixel)
// ─────────────────────────────────────────────
#define LED_PIN    32       // GPIO conectado ao DIN da fita
#define LED_COUNT  12      // Quantidade de LEDs
#define LED_TYPE   (NEO_GRB + NEO_KHZ800)

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, LED_TYPE);

// ─────────────────────────────────────────────
//  Canais Redis
// ─────────────────────────────────────────────
char CHANNEL_COMMAND[96];
char CHANNEL_BRIGHTNESS[96];
char CHANNEL_POWER[96];

// ─────────────────────────────────────────────
//  Estado atual da luminária
// ─────────────────────────────────────────────
uint8_t cur_r          = 255;
uint8_t cur_g          = 140;
uint8_t cur_b          = 20;
uint8_t cur_brightness = 60;
bool    cur_power      = true;

unsigned long lastRedisCheck = 0;
const unsigned long REDIS_CHECK_INTERVAL = 100;  // ms

// ─────────────────────────────────────────────
//  Forward declarations (protótipos)
// ─────────────────────────────────────────────
void applyLight();
void processRedisMessage(String payload);
bool connectToRedis();
void checkRedisMessages();
void connectWiFi();
void setColor(int r, int g, int b);

// ─────────────────────────────────────────────
//  Aplica o estado atual na fita de LED
// ─────────────────────────────────────────────
void applyLight() {
    if (!cur_power) {
        strip.clear();
        strip.show();
        Serial.println("💤 LEDs desligados");
        return;
    }
    
    for (int i = 0; i < LED_COUNT; i++) {
        strip.setPixelColor(i, strip.Color(cur_r, cur_g, cur_b));
    }
    strip.setBrightness(cur_brightness);
    strip.show();
    Serial.printf("💡 LED atualizado → RGB(%d, %d, %d) | Brilho: %d\n", cur_r, cur_g, cur_b, cur_brightness);
}

// ─────────────────────────────────────────────
//  Processa mensagens do Redis
// ─────────────────────────────────────────────
void processRedisMessage(String payload) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.printf("⚠️ JSON inválido: %s\n", err.c_str());
        return;
    }

    // Comando de cor completo
    if (doc.containsKey("r") && doc.containsKey("g") && doc.containsKey("b")) {
        cur_r = doc["r"];
        cur_g = doc["g"];
        cur_b = doc["b"];
        if (doc.containsKey("brightness")) {
            cur_brightness = doc["brightness"];
        }
        applyLight();
    }
    // Comando de brilho isolado
    else if (doc.containsKey("brightness")) {
        cur_brightness = doc["brightness"];
        applyLight();
    }
    // Comando de ligar/desligar
    else if (doc.containsKey("power")) {
        cur_power = doc["power"];
        applyLight();
    }
}

// ─────────────────────────────────────────────
//  Conecta ao WiFi
// ─────────────────────────────────────────────
void connectWiFi() {
    Serial.printf("📶 Conectando ao WiFi: %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n✅ WiFi conectado | IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n❌ Falha ao conectar ao WiFi");
    }
}

// ─────────────────────────────────────────────
//  Conecta ao broker Redis
// ─────────────────────────────────────────────
bool connectToRedis() {
    Serial.printf("🔌 Conectando ao Redis: %s:%d\n", REDIS_HOST, REDIS_PORT);
    
    if (!redisClient.connect(REDIS_HOST, REDIS_PORT)) {
        Serial.println("❌ Falha ao conectar ao Redis");
        return false;
    }
    
    Serial.println("✓ Conectado ao Redis");
    delay(100);
    
    // Autenticar com senha
    String authCmd = "AUTH " + String(REDIS_PASSWORD) + "\r\n";
    redisClient.print(authCmd);
    delay(100);
    
    // Ler resposta de autenticação
    while (redisClient.available()) {
        String response = redisClient.readStringUntil('\n');
        Serial.println("Redis: " + response);
    }
    
    // Subscrever aos canais
    String subCmd = "SUBSCRIBE light:command:" + String(DEVICE_ID) + 
                    " light:brightness:" + String(DEVICE_ID) + 
                    " light:power:" + String(DEVICE_ID) + "\r\n";
    redisClient.print(subCmd);
    Serial.println("✓ Inscrito nos canais Redis");
    
    return true;
}

// ─────────────────────────────────────────────
//  Verifica mensagens do Redis
// ─────────────────────────────────────────────
void checkRedisMessages() {
    if (!redisClient.connected()) {
        Serial.println("⚠️ Conexão Redis perdida. Reconectando...");
        connectToRedis();
        return;
    }
    
    // Verificar se há dados disponíveis
    while (redisClient.available()) {
        String line = redisClient.readStringUntil('\n');
        
        // Ignorar linhas de controle RESP
        if (line.startsWith("*") || line.startsWith("$") || line.startsWith(":")) {
            continue;
        }
        
        // Se recebeu uma payload JSON
        if (line.startsWith("{")) {
            Serial.println("📥 Mensagem recebida: " + line);
            processRedisMessage(line);
        }
    }
}

// ─────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║   AuraLUX - ESP32 Firmware (Redis)    ║");
    Serial.println("╚════════════════════════════════════════╝\n");
    
    // Monta os canais Redis com o DEVICE_ID
    snprintf(CHANNEL_COMMAND,     sizeof(CHANNEL_COMMAND),     "light:command:%s",     DEVICE_ID);
    snprintf(CHANNEL_BRIGHTNESS,  sizeof(CHANNEL_BRIGHTNESS),  "light:brightness:%s",  DEVICE_ID);
    snprintf(CHANNEL_POWER,       sizeof(CHANNEL_POWER),       "light:power:%s",       DEVICE_ID);

    // Inicializa a fita de LED
    strip.begin();
    strip.setBrightness(80);
    strip.clear();
    strip.show();
    Serial.println("✓ NeoPixel inicializado");

    // Conecta ao WiFi
    connectWiFi();
    delay(1000);
    
    // Conecta ao Redis
    if (!connectToRedis()) {
        Serial.println("❌ Falha ao conectar ao Redis!");
    }

    // Teste de LED
    Serial.println("\n🎨 Teste de LED:");
    setColor(255, 0, 0);    // Vermelho
    delay(300);
    setColor(0, 255, 0);    // Verde
    delay(300);
    setColor(0, 0, 255);    // Azul
    delay(300);
    setColor(255, 255, 0);  // Amarelo
    delay(300);
    setColor(255, 255, 255);  // Branco
    delay(300);
    
    // Cor padrão
    setColor(255, 140, 20);  // Âmbar quente
    
    Serial.println("\n✅ Setup concluído! Aguardando comandos Redis...\n");
}

// ─────────────────────────────────────────────
//  Função auxiliar para definir cor
// ─────────────────────────────────────────────
void setColor(int r, int g, int b) {
    cur_r = r;
    cur_g = g;
    cur_b = b;
    applyLight();
}

// ─────────────────────────────────────────────
//  Loop principal
// ─────────────────────────────────────────────
void loop() {
    // Verificar mensagens Redis periodicamente
    if (millis() - lastRedisCheck > REDIS_CHECK_INTERVAL) {
        checkRedisMessages();
        lastRedisCheck = millis();
    }
    
    // Reconectar ao Redis se desconectado
    if (!redisClient.connected()) {
        delay(5000);  // Aguardar antes de tentar reconectar
        connectToRedis();
    }
    
    delay(10);  // Pequeno delay para evitar travamento
}
