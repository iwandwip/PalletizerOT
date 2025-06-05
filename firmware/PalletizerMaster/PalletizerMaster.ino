#define ENABLE_MODULE_SERIAL_ENHANCED
#define ENABLE_MODULE_DIGITAL_OUTPUT

#include "DebugConfig.h"
#include "PalletizerMaster.h"
#include "PalletizerServer.h"
#include "DebugManager.h"
#include "LittleFS.h"
#include "ESPmDNS.h"
#include "esp_task_wdt.h"

#define RX_PIN 16
#define TX_PIN 17
#define INDICATOR_PIN 26

#define WIFI_MODE PalletizerServer::MODE_AP
#define WIFI_SSID "Palletizer"
#define WIFI_PASSWORD ""

PalletizerMaster master(RX_PIN, TX_PIN, INDICATOR_PIN);
PalletizerServer server(&master, WIFI_MODE, WIFI_SSID, WIFI_PASSWORD);

TaskHandle_t serverTaskHandle = NULL;
TaskHandle_t masterTaskHandle = NULL;

void serverTask(void* pvParameters) {
  server.begin();

#if WEB_DEBUG == 1 || SERIAL_DEBUG == 1
  DEBUG_MGR.begin(&Serial, &server);
  DEBUG_MGR.setEnabled(true);
  DEBUG_MGR.info("SYSTEM", "Server task started on Core 0");
#endif

  while (true) {
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(10));

    static unsigned long lastMaintenance = 0;
    if (millis() - lastMaintenance > 3000) {
      lastMaintenance = millis();

      if (WIFI_MODE == PalletizerServer::MODE_STA && WiFi.status() != WL_CONNECTED) {
#if WEB_DEBUG == 1 || SERIAL_DEBUG == 1
        DEBUG_MGR.warning("WIFI", "Connection lost, attempting reconnect...");
#endif
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      }
    }
  }
}

void masterTask(void* pvParameters) {
#if WEB_DEBUG == 1 || SERIAL_DEBUG == 1
  DEBUG_MGR.info("SYSTEM", "Master task started on Core 1");
#endif

  while (true) {
    master.update();
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void onSlaveData(const String& data) {
#if WEB_DEBUG == 1 || SERIAL_DEBUG == 1
  DEBUG_MGR.info("SLAVE_DATA", data);
#endif
}

void setup() {
  Serial.begin(115200);
  DEBUG_SERIAL_PRINTLN("\nPalletizer System Starting...");
  DEBUG_SERIAL_PRINTF("Debug Configuration: WEB_DEBUG=%d, SERIAL_DEBUG=%d\n", WEB_DEBUG, SERIAL_DEBUG);
  DEBUG_SERIAL_PRINTF("Memory Settings: DEBUG_BUFFER_SIZE=%d, MAX_FUNCTIONS=%d, MAX_STATEMENTS=%d\n",
                      DEBUG_BUFFER_SIZE, MAX_FUNCTIONS, MAX_STATEMENTS);

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
    20480,
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
    12288,
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
}

void loop() {
  static unsigned long lastHealthCheck = 0;
  static unsigned long lastMemoryCheck = 0;

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

    UBaseType_t serverStackWatermark = uxTaskGetStackHighWaterMark(serverTaskHandle);
    UBaseType_t masterStackWatermark = uxTaskGetStackHighWaterMark(masterTaskHandle);

    if (serverStackWatermark < 2000) {
      DEBUG_SERIAL_PRINTF("WARNING: Server stack low: %d bytes\n", serverStackWatermark);
    }

    if (masterStackWatermark < 1500) {
      DEBUG_SERIAL_PRINTF("WARNING: Master stack low: %d bytes\n", masterStackWatermark);
    }

    if (millis() - lastMemoryCheck > 10000) {
      lastMemoryCheck = millis();

      size_t freeHeap = ESP.getFreeHeap();
      size_t largestBlock = ESP.getMaxAllocHeap();
      float fragmentation = 100.0 * (1.0 - (float)largestBlock / freeHeap);

      DEBUG_SERIAL_PRINTF("Memory: Free=%d, Largest=%d, Frag=%.1f%%\n",
                          freeHeap, largestBlock, fragmentation);

      if (freeHeap < 20000) {
        DEBUG_SERIAL_PRINTLN("CRITICAL: Memory below 20KB - EMERGENCY RESTART!");
        delay(1000);
        ESP.restart();
      }

      if (freeHeap < 30000) {
        DEBUG_SERIAL_PRINTLN("WARNING: Memory below 30KB - System unstable!");
      }

      if (fragmentation > 60.0) {
        DEBUG_SERIAL_PRINTLN("CRITICAL: High fragmentation - EMERGENCY RESTART!");
        delay(1000);
        ESP.restart();
      }

      if (fragmentation > 40.0) {
        DEBUG_SERIAL_PRINTLN("WARNING: High fragmentation detected!");
      }
    }

    if (ESP.getFreeHeap() < 20000) {
      DEBUG_SERIAL_PRINTLN("CRITICAL: Low memory! Restarting...");
      ESP.restart();
    }
  }
#endif

  esp_task_wdt_reset();
  vTaskDelay(pdMS_TO_TICKS(100));
}