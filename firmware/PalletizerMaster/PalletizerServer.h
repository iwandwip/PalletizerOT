#ifndef PALLETIZER_SERVER_H
#define PALLETIZER_SERVER_H

#include "PalletizerMaster.h"
#include "WiFi.h"
#include "AsyncTCP.h"
#include "ESPAsyncWebServer.h"
#include "LittleFS.h"
#include "ESPmDNS.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

class PalletizerServer {
public:
  enum WiFiMode {
    MODE_AP,
    MODE_STA
  };

  struct DebugMessage {
    unsigned long timestamp;
    String level;
    String source;
    String message;
  };

  PalletizerServer(PalletizerMaster* master, WiFiMode mode = MODE_AP, const char* ssid = "PalletizerAP", const char* password = "");
  void begin();
  void update();
  void sendDebugMessage(const String& level, const String& source, const String& message);
  void enableDebugCapture(bool enable);

private:
  static const int DEBUG_BUFFER_SIZE = 1000;

  PalletizerMaster* palletizerMaster;
  AsyncWebServer server;
  AsyncEventSource events;
  AsyncEventSource debugEvents;

  WiFiMode wifiMode;
  const char* ssid;
  const char* password;

  PalletizerMaster::SystemState lastReportedState = PalletizerMaster::STATE_IDLE;
  unsigned long lastStateUpdate = 0;
  const unsigned long STATE_UPDATE_INTERVAL = 100;

  String cachedCommands = "";
  bool commandsCacheValid = false;
  SemaphoreHandle_t cacheMutex;

  TaskHandle_t wifiTaskHandle = NULL;
  TaskHandle_t stateTaskHandle = NULL;

  DebugMessage debugBuffer[DEBUG_BUFFER_SIZE];
  int debugBufferHead = 0;
  int debugBufferTail = 0;
  int debugMessageCount = 0;
  SemaphoreHandle_t debugMutex;
  bool debugCaptureEnabled = true;

  static void wifiMonitorTask(void* pvParameters);
  static void stateMonitorTask(void* pvParameters);

  void setupRoutes();
  void handleUpload(AsyncWebServerRequest* request, String filename, size_t index, uint8_t* data, size_t len, bool final);
  void handleCommand(AsyncWebServerRequest* request);
  void handleWriteCommand(AsyncWebServerRequest* request);
  void handleGetStatus(AsyncWebServerRequest* request);
  void handleGetCommands(AsyncWebServerRequest* request);
  void handleDownloadCommands(AsyncWebServerRequest* request);
  void handleGetTimeoutConfig(AsyncWebServerRequest* request);
  void handleSetTimeoutConfig(AsyncWebServerRequest* request);
  void handleGetTimeoutStats(AsyncWebServerRequest* request);
  void handleClearTimeoutStats(AsyncWebServerRequest* request);
  void handleGetDebugBuffer(AsyncWebServerRequest* request);
  void handleClearDebugBuffer(AsyncWebServerRequest* request);
  void handleToggleDebugCapture(AsyncWebServerRequest* request);

  void sendStatusEvent(const String& status);
  void sendTimeoutEvent(int count, const String& type);
  void sendDebugEvent(const DebugMessage& msg);
  void safeFileWrite(const String& path, const String& content);
  bool ensureFileExists(const String& path);
  String getStatusString(PalletizerMaster::SystemState state);
  void invalidateCache();
  String getCachedCommands();
  void setCachedCommands(const String& commands);

  void addDebugMessage(const String& level, const String& source, const String& message);
  String getDebugBufferJSON(int startIndex = 0);
  String formatDebugMessage(const DebugMessage& msg);
};

#endif