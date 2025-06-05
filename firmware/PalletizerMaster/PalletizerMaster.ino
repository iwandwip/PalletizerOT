#define ENABLE_MODULE_SERIAL_ENHANCED
#define ENABLE_MODULE_DIGITAL_OUTPUT

#include "PalletizerMaster.h"
#include "PalletizerServer.h"
#include "DebugManager.h"
#include "LittleFS.h"
#include "ESPmDNS.h"
#include "esp_task_wdt.h"

#define RX_PIN 16
#define TX_PIN 17
#define INDICATOR_PIN 26

// #define WIFI_MODE PalletizerServer::MODE_STA
// #define WIFI_SSID "silenceAndSleep"
// #define WIFI_PASSWORD "11111111"

#define WIFI_MODE PalletizerServer::MODE_AP
#define WIFI_SSID "Palletizer"
#define WIFI_PASSWORD ""

PalletizerMaster master(RX_PIN, TX_PIN, INDICATOR_PIN);
PalletizerServer server(&master, WIFI_MODE, WIFI_SSID, WIFI_PASSWORD);

TaskHandle_t serverTaskHandle = NULL;
TaskHandle_t masterTaskHandle = NULL;

void serverTask(void* pvParameters) {
  server.begin();
  DEBUG_MGR.begin(&Serial, &server);
  DEBUG_MGR.setEnabled(true);
  DEBUG_MGR.info("SYSTEM", "Server task started on Core 0");

  while (true) {
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(10));

    static unsigned long lastMaintenance = 0;
    if (millis() - lastMaintenance > 3000) {
      lastMaintenance = millis();

      if (WIFI_MODE == PalletizerServer::MODE_STA && WiFi.status() != WL_CONNECTED) {
        DEBUG_MGR.warning("WIFI", "Connection lost, attempting reconnect...");
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      }
    }
  }
}

void masterTask(void* pvParameters) {
  DEBUG_MGR.info("SYSTEM", "Master task started on Core 1");

  while (true) {
    master.update();
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void onSlaveData(const String& data) {
  DEBUG_MGR.info("SLAVE_DATA", data);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nPalletizer System Starting...");

  esp_task_wdt_init(10, true);

  if (!LittleFS.begin(true)) {
    Serial.println("Error mounting LittleFS! System will continue without file storage.");
  } else {
    Serial.println("LittleFS mounted successfully");
  }

  master.setSlaveDataCallback(onSlaveData);
  master.begin();

  BaseType_t xReturned;

  xReturned = xTaskCreatePinnedToCore(
    serverTask,
    "Server_Task",
    16384,
    NULL,
    3,
    &serverTaskHandle,
    0);

  if (xReturned != pdPASS) {
    Serial.println("FATAL: Failed to create server task!");
    ESP.restart();
  }

  vTaskDelay(pdMS_TO_TICKS(1000));

  xReturned = xTaskCreatePinnedToCore(
    masterTask,
    "Master_Task",
    8192,
    NULL,
    2,
    &masterTaskHandle,
    1);

  if (xReturned != pdPASS) {
    Serial.println("FATAL: Failed to create master task!");
    ESP.restart();
  }

  esp_task_wdt_add(serverTaskHandle);
  esp_task_wdt_add(masterTaskHandle);

  Serial.println("System initialization complete");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
}

void loop() {
  static unsigned long lastHealthCheck = 0;

  if (millis() - lastHealthCheck > 5000) {
    lastHealthCheck = millis();

    if (serverTaskHandle != NULL && eTaskGetState(serverTaskHandle) == eSuspended) {
      Serial.println("WARNING: Server task suspended!");
      ESP.restart();
    }

    if (masterTaskHandle != NULL && eTaskGetState(masterTaskHandle) == eSuspended) {
      Serial.println("WARNING: Master task suspended!");
      ESP.restart();
    }

    // Serial.printf("Free heap: %d bytes, Largest block: %d bytes\n", ESP.getFreeHeap(), ESP.getMaxAllocHeap());

    UBaseType_t serverStackWatermark = uxTaskGetStackHighWaterMark(serverTaskHandle);
    UBaseType_t masterStackWatermark = uxTaskGetStackHighWaterMark(masterTaskHandle);

    if (serverStackWatermark < 1000) {
      Serial.printf("WARNING: Server task low stack: %d bytes\n", serverStackWatermark);
    }

    if (masterStackWatermark < 1000) {
      Serial.printf("WARNING: Master task low stack: %d bytes\n", masterStackWatermark);
    }

    if (ESP.getFreeHeap() < 20000) {
      Serial.println("CRITICAL: Low memory! Restarting...");
      ESP.restart();
    }

    esp_task_wdt_reset();
  }

  vTaskDelay(pdMS_TO_TICKS(100));
}