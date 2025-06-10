#define ENABLE_MODULE_SERIAL_ENHANCED
#define ENABLE_MODULE_DIGITAL_OUTPUT

#include "Kinematrix.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "DebugConfig.h"
#include "LittleFS.h"
#include "ESPmDNS.h"
#include "esp_task_wdt.h"
#include "PalletizerMaster.h"
#include "PalletizerServer.h"

#define DEVELOPMENT_MODE 0

#define RX_PIN 16
#define TX_PIN 17

#if DEVELOPMENT_MODE == 1
#define WIFI_MODE PalletizerServer::MODE_STA
#define WIFI_SSID "silenceAndSleep"
#define WIFI_PASSWORD "11111111"
#else
#define WIFI_MODE PalletizerServer::MODE_AP
#define WIFI_SSID "Palletizer"
#define WIFI_PASSWORD ""
#endif

PalletizerMaster master(RX_PIN, TX_PIN);
PalletizerServer server(&master, WIFI_MODE, WIFI_SSID, WIFI_PASSWORD);

TaskHandle_t serverTaskHandle = NULL;
TaskHandle_t masterTaskHandle = NULL;

void serverTask(void* pvParameters) {
  server.begin();
  DEBUG_SERIAL_PRINTLN("SERVER: Task started on Core 0");

  while (true) {
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(10));

    static unsigned long lastMaintenance = 0;
    if (millis() - lastMaintenance > 3000) {
      lastMaintenance = millis();

      if (WIFI_MODE == PalletizerServer::MODE_STA && WiFi.status() != WL_CONNECTED) {
        DEBUG_SERIAL_PRINTLN("WIFI: Connection lost, attempting reconnect...");
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      }
    }
  }
}

void masterTask(void* pvParameters) {
  DEBUG_SERIAL_PRINTLN("MASTER: Task started on Core 1");

  while (true) {
    master.update();
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void onSlaveData(const String& data) {
  DEBUG_SERIAL_PRINTLN("SLAVE_DATA: " + data);
}

void setup() {
  Serial.begin(115200);
  DEBUG_SERIAL_PRINTLN("\nPalletizer Batch Processing System Starting...");
  DEBUG_SERIAL_PRINTF("Debug Configuration: SERIAL_DEBUG=%d, WEB_DEBUG=%d\n", SERIAL_DEBUG, WEB_DEBUG);

  esp_task_wdt_init(10, true);

  if (!LittleFS.begin(true)) {
    DEBUG_SERIAL_PRINTLN("Error mounting LittleFS! System will continue without file storage.");
  } else {
    DEBUG_SERIAL_PRINTLN("LittleFS mounted successfully");
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
    DEBUG_SERIAL_PRINTLN("FATAL: Failed to create server task!");
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
    DEBUG_SERIAL_PRINTLN("FATAL: Failed to create master task!");
    ESP.restart();
  }

  esp_task_wdt_add(serverTaskHandle);
  esp_task_wdt_add(masterTaskHandle);

  DEBUG_SERIAL_PRINTLN("System initialization complete");
  DEBUG_SERIAL_PRINTF("Free heap: %d bytes\n", ESP.getFreeHeap());
  DEBUG_SERIAL_PRINTLN("Ready for batch processing commands upload");
}

void loop() {
  static unsigned long lastHealthCheck = 0;

#if MEMORY_DEBUG == 1
  if (millis() - lastHealthCheck > 5000) {
    lastHealthCheck = millis();

    if (serverTaskHandle != NULL && eTaskGetState(serverTaskHandle) == eSuspended) {
      DEBUG_SERIAL_PRINTLN("WARNING: Server task suspended!");
      ESP.restart();
    }

    if (masterTaskHandle != NULL && eTaskGetState(masterTaskHandle) == eSuspended) {
      DEBUG_SERIAL_PRINTLN("WARNING: Master task suspended!");
      ESP.restart();
    }

    size_t freeHeap = ESP.getFreeHeap();
    DEBUG_SERIAL_PRINTF("Memory: Free=%d bytes\n", freeHeap);

    if (freeHeap < 50000) {
      DEBUG_SERIAL_PRINTLN("CRITICAL: Memory below 50KB - EMERGENCY RESTART!");
      delay(1000);
      ESP.restart();
    }
  }
#endif

  esp_task_wdt_reset();
  vTaskDelay(pdMS_TO_TICKS(100));
}