#ifndef PALLETIZER_SERVER_H
#define PALLETIZER_SERVER_H

#include "Arduino.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "WiFi.h"
#include "AsyncTCP.h"
#include "ESPAsyncWebServer.h"
#include "LittleFS.h"
#include "ESPmDNS.h"
#include "DebugConfig.h"

class PalletizerMaster;

class PalletizerServer {
public:
  enum WiFiMode {
    MODE_AP,
    MODE_STA
  };

  PalletizerServer(PalletizerMaster* master, WiFiMode mode = MODE_AP, const char* ssid = "PalletizerAP", const char* password = "");
  void begin();
  void update();

private:
  PalletizerMaster* palletizerMaster;
  AsyncWebServer server;
  WiFiMode wifiMode;
  const char* ssid;
  const char* password;

  void setupRoutes();
  void handleCommand(AsyncWebServerRequest* request);
  void handleUploadCommands(AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total);
  void handleGetExecutionStatus(AsyncWebServerRequest* request);
  void handleGetUploadStatus(AsyncWebServerRequest* request);
  void handleClearCommands(AsyncWebServerRequest* request);
  void handlePing(AsyncWebServerRequest* request);
  void safeFileWrite(const String& path, const String& content);
  String getStatusString(PalletizerMaster::SystemState state);
};

#endif