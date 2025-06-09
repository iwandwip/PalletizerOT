#include "HttpServer.h"
#include "UartRelay.h"
#include "StatusIndicator.h"
#include "config.h"
#include "WiFi.h"
#include "esp_task_wdt.h"
#include "esp_system.h"
#include "esp_heap_caps.h"

HttpServer httpServer;
UartRelay uartRelay(RX_PIN, TX_PIN);
StatusIndicator statusLed(LED_GREEN_PIN, LED_YELLOW_PIN, LED_RED_PIN);

TaskHandle_t httpTaskHandle = NULL;
TaskHandle_t uartTaskHandle = NULL;
TaskHandle_t systemTaskHandle = NULL;

unsigned long lastMemoryCheck = 0;
unsigned long lastSystemCheck = 0;
unsigned long systemStartTime = 0;
bool criticalError = false;

String createSeparator(int length) {
  String separator = "";
  for (int i = 0; i < length; i++) {
    separator += "=";
  }
  return separator;
}

void httpTask(void* pvParameters) {
  httpServer.begin();

  while (true) {
    if (!criticalError) {
      httpServer.handleClient();
    }
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void uartTask(void* pvParameters) {
  uartRelay.begin();

  while (true) {
    if (!criticalError) {
      uartRelay.update();
    }
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void systemTask(void* pvParameters) {
  while (true) {
    performSystemChecks();
    statusLed.update();
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void performSystemChecks() {
  unsigned long currentTime = millis();

  if (currentTime - lastMemoryCheck > MEMORY_CHECK_INTERVAL) {
    checkMemoryHealth();
    lastMemoryCheck = currentTime;
  }

  if (currentTime - lastSystemCheck > SYSTEM_CHECK_INTERVAL) {
    checkSystemHealth();
    lastSystemCheck = currentTime;
  }

  checkWiFiConnection();
  updateSystemStatus();
}

void checkMemoryHealth() {
  size_t freeHeap = ESP.getFreeHeap();
  size_t largestBlock = heap_caps_get_largest_free_block(MALLOC_CAP_8BIT);

  if (freeHeap < MIN_FREE_HEAP) {
    Serial.println("CRITICAL: Low memory! Free heap: " + String(freeHeap));
    statusLed.incrementErrorCount();

    if (freeHeap < CRITICAL_HEAP_THRESHOLD) {
      criticalError = true;
      statusLed.setState(StatusIndicator::CRITICAL_ERROR);
      Serial.println("FATAL: Memory critically low - System protection mode");
    }
  }

  if (largestBlock < MIN_LARGEST_BLOCK) {
    Serial.println("WARNING: Memory fragmentation detected");
    statusLed.incrementErrorCount();
  }
}

void checkSystemHealth() {
  unsigned long uptime = millis() - systemStartTime;

  if (WiFi.status() != WL_CONNECTED && !criticalError) {
    statusLed.setConnectionLost(true);
  }

  Serial.printf("SYSTEM: Uptime=%lums, FreeHeap=%d, WiFiStatus=%d\n",
                uptime, ESP.getFreeHeap(), WiFi.status());
}

void checkWiFiConnection() {
  static unsigned long lastWiFiCheck = 0;

  if (millis() - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost - attempting reconnect");
      statusLed.setState(StatusIndicator::CONNECTING);

#ifdef USE_STA_MODE
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 10) {
        delay(500);
        attempts++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi reconnected - IP: " + WiFi.localIP().toString());
        statusLed.setState(StatusIndicator::CONNECTED);
        statusLed.setConnectionLost(false);
      }
#endif
    }
    lastWiFiCheck = millis();
  }
}

void updateSystemStatus() {
  if (criticalError) {
    return;
  }

  if (WiFi.status() == WL_CONNECTED && statusLed.getStatusString() != "RUNNING") {
    if (statusLed.getStatusString() == "DISCONNECTED") {
      statusLed.setState(StatusIndicator::READY);
    }
  }
}

void onCommandReceived(const String& command) {
  Serial.println("LAPTOP→ESP32: " + command);
  httpServer.incrementConnectionCount();

  String upperCommand = command;
  upperCommand.toUpperCase();

  if (upperCommand == "PLAY" || upperCommand.startsWith("X(") || upperCommand.startsWith("GROUP(") || upperCommand.startsWith("SPEED;")) {
    statusLed.setSystemRunning(true);
  } else if (upperCommand == "PAUSE") {
    statusLed.setState(StatusIndicator::PAUSED);
  } else if (upperCommand == "STOP" || upperCommand == "IDLE") {
    statusLed.setSystemRunning(false);
  } else if (upperCommand == "WAIT") {
    statusLed.setSyncWaiting(true);
  }

  uartRelay.sendToSlaves(command);
}

void onSlaveResponse(const String& response) {
  Serial.println("SLAVE→ESP32: " + response);
  httpServer.setLastSlaveResponse(response);

  if (response.indexOf("WAIT_COMPLETE") != -1 || response.indexOf("DETECT;TRIGGERED") != -1) {
    statusLed.setSyncWaiting(false);
  }

  if (response.indexOf("ERROR") != -1 || response.indexOf("TIMEOUT") != -1) {
    statusLed.incrementErrorCount();
  }

  if (response.indexOf("SEQUENCE COMPLETED") != -1 || response.indexOf("ZERO DONE") != -1) {
    statusLed.setSystemRunning(false);
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.println("\n" + createSeparator(50));
  Serial.println("ESP32 Palletizer Master v2.0 Starting...");
  Serial.println("Build: " + String(__DATE__) + " " + String(__TIME__));
  Serial.println(createSeparator(50));

  systemStartTime = millis();

  esp_task_wdt_init(WATCHDOG_TIMEOUT_SEC, true);

  statusLed.begin();
  statusLed.setState(StatusIndicator::STARTING);

  Serial.println("Hardware Configuration:");
  Serial.println("- UART: RX=" + String(RX_PIN) + " TX=" + String(TX_PIN));
  Serial.println("- LEDs: Green=" + String(LED_GREEN_PIN) + " Yellow=" + String(LED_YELLOW_PIN) + " Red=" + String(LED_RED_PIN));
  Serial.println("- Sync: SET=" + String(SYNC_SET_PIN) + " WAIT=" + String(SYNC_WAIT_PIN) + " DETECT=" + String(DETECT_PIN));

#ifdef USE_STA_MODE
  Serial.println("Network Mode: Station (STA)");
  Serial.println("Target SSID: " + String(WIFI_SSID));

  WiFi.mode(WIFI_MODE_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  statusLed.setState(StatusIndicator::CONNECTING);

  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    statusLed.update();
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi Connected Successfully");
    Serial.println("  IP Address: " + WiFi.localIP().toString());
    Serial.println("  MAC Address: " + WiFi.macAddress());
    Serial.println("  RSSI: " + String(WiFi.RSSI()) + " dBm");
    statusLed.setState(StatusIndicator::CONNECTED);
  } else {
    Serial.println("✗ WiFi Connection Failed - Falling back to AP mode");
    WiFi.softAP("ESP32_Palletizer_Fallback", "palletizer123");
    Serial.println("Fallback AP - IP: " + WiFi.softAPIP().toString());
    statusLed.setState(StatusIndicator::AP_MODE);
  }
#else
  Serial.println("Network Mode: Access Point (AP)");
  WiFi.mode(WIFI_MODE_AP);
  WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("AP Created - SSID: " + String(WIFI_SSID));
  Serial.println("AP IP Address: " + WiFi.softAPIP().toString());
  statusLed.setState(StatusIndicator::AP_MODE);
#endif

  httpServer.setCommandCallback(onCommandReceived);
  uartRelay.setResponseCallback(onSlaveResponse);

  Serial.println("Creating FreeRTOS tasks...");

  BaseType_t result1 = xTaskCreatePinnedToCore(
    httpTask, "HTTP_Server", HTTP_TASK_STACK_SIZE, NULL, HTTP_TASK_PRIORITY, &httpTaskHandle, HTTP_TASK_CORE);

  BaseType_t result2 = xTaskCreatePinnedToCore(
    uartTask, "UART_Relay", UART_TASK_STACK_SIZE, NULL, UART_TASK_PRIORITY, &uartTaskHandle, UART_TASK_CORE);

  BaseType_t result3 = xTaskCreatePinnedToCore(
    systemTask, "System_Monitor", SYSTEM_TASK_STACK_SIZE, NULL, SYSTEM_TASK_PRIORITY, &systemTaskHandle, SYSTEM_TASK_CORE);

  if (result1 != pdPASS || result2 != pdPASS || result3 != pdPASS) {
    Serial.println("FATAL: Failed to create FreeRTOS tasks!");
    statusLed.setState(StatusIndicator::CRITICAL_ERROR);
    ESP.restart();
  }

  esp_task_wdt_add(httpTaskHandle);
  esp_task_wdt_add(uartTaskHandle);
  esp_task_wdt_add(systemTaskHandle);

  statusLed.setState(StatusIndicator::READY);
  statusLed.resetErrorCount();

  Serial.println(createSeparator(50));
  Serial.println("✓ ESP32 Master initialization complete");
  Serial.printf("✓ Free heap: %d bytes (%d largest block)\n", ESP.getFreeHeap(), heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
  Serial.println("✓ System ready for commands");
  Serial.println(createSeparator(50));
}

void loop() {
  if (criticalError) {
    Serial.println("CRITICAL ERROR STATE - System halted");
    delay(5000);
    ESP.restart();
  }

  esp_task_wdt_reset();
  vTaskDelay(pdMS_TO_TICKS(1000));
}