#include "HttpServer.h"
#include "UartRelay.h"
#include "StatusIndicator.h"
#include "WiFi.h"
#include "esp_task_wdt.h"

#define DEVELOPMENT_MODE 1

#define RX_PIN 16
#define TX_PIN 17
#define LED_GREEN_PIN 27
#define LED_YELLOW_PIN 14
#define LED_RED_PIN 13

#if DEVELOPMENT_MODE == 1
#define WIFI_MODE_STA
#define WIFI_SSID "silenceAndSleep"
#define WIFI_PASSWORD "11111111"
#else
#define WIFI_MODE_AP
#define WIFI_SSID "Palletizer"
#define WIFI_PASSWORD ""
#endif

HttpServer httpServer;
UartRelay uartRelay(RX_PIN, TX_PIN);
StatusIndicator statusLed(LED_GREEN_PIN, LED_YELLOW_PIN, LED_RED_PIN);

TaskHandle_t httpTaskHandle = NULL;
TaskHandle_t uartTaskHandle = NULL;

void httpTask(void* pvParameters) {
  httpServer.begin();

  while (true) {
    httpServer.handleClient();
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void uartTask(void* pvParameters) {
  uartRelay.begin();

  while (true) {
    uartRelay.update();
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void onCommandReceived(const String& command) {
  Serial.println("LAPTOP→ESP32: " + command);
  uartRelay.sendToSlaves(command);
}

void onSlaveResponse(const String& response) {
  Serial.println("SLAVE→ESP32: " + response);
  httpServer.setLastSlaveResponse(response);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32 Palletizer Master Starting...");

  esp_task_wdt_init(10, true);

  statusLed.begin();
  statusLed.setState(StatusIndicator::STARTING);

#ifdef WIFI_MODE_STA
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("STA Mode - Connected to WiFi. IP address: ");
    Serial.println(WiFi.localIP());
    statusLed.setState(StatusIndicator::CONNECTED);
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi. Falling back to AP mode.");
    WiFi.softAP("ESP32_Palletizer_Fallback", "palletizer123");
    Serial.print("Fallback AP Mode - IP address: ");
    Serial.println(WiFi.softAPIP());
    statusLed.setState(StatusIndicator::AP_MODE);
  }
#else
  WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("AP Mode - IP address: ");
  Serial.println(WiFi.softAPIP());
  statusLed.setState(StatusIndicator::AP_MODE);
#endif

  httpServer.setCommandCallback(onCommandReceived);
  uartRelay.setResponseCallback(onSlaveResponse);

  BaseType_t xReturned;

  xReturned = xTaskCreatePinnedToCore(
    httpTask,
    "HTTP_Task",
    8192,
    NULL,
    2,
    &httpTaskHandle,
    0);

  if (xReturned != pdPASS) {
    Serial.println("FATAL: Failed to create HTTP task!");
    ESP.restart();
  }

  xReturned = xTaskCreatePinnedToCore(
    uartTask,
    "UART_Task",
    4096,
    NULL,
    3,
    &uartTaskHandle,
    1);

  if (xReturned != pdPASS) {
    Serial.println("FATAL: Failed to create UART task!");
    ESP.restart();
  }

  esp_task_wdt_add(httpTaskHandle);
  esp_task_wdt_add(uartTaskHandle);

  statusLed.setState(StatusIndicator::READY);
  Serial.println("ESP32 Master initialization complete");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
}

void loop() {
  static unsigned long lastHeartbeat = 0;
  static unsigned long lastMemoryCheck = 0;

  if (millis() - lastHeartbeat > 1000) {
    lastHeartbeat = millis();
    statusLed.update();

    if (WiFi.status() != WL_CONNECTED) {
      statusLed.setState(StatusIndicator::DISCONNECTED);
    }
  }

  if (millis() - lastMemoryCheck > 10000) {
    lastMemoryCheck = millis();

    size_t freeHeap = ESP.getFreeHeap();
    if (freeHeap < 10000) {
      Serial.println("CRITICAL: Low memory! Restarting...");
      ESP.restart();
    }
  }

  esp_task_wdt_reset();
  vTaskDelay(pdMS_TO_TICKS(100));
}