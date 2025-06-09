#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include "Arduino.h"
#include "WiFi.h"
#include "WebServer.h"

#define SYNC_SET_PIN 25
#define SYNC_WAIT_PIN 27
#define DETECT_PIN 26

class HttpServer {
public:
  typedef void (*CommandCallback)(const String& command);

  HttpServer();
  void begin();
  void handleClient();
  void setCommandCallback(CommandCallback callback);
  void setLastSlaveResponse(const String& response);
  void incrementConnectionCount();

private:
  WebServer server;
  CommandCallback commandCallback;
  String lastSlaveResponse;
  String currentState;
  unsigned long lastResponseTime;
  unsigned long connectionCount;
  unsigned long requestCount;
  unsigned long lastErrorTime;
  int consecutiveErrors;

  void handleExecute();
  void handleStatus();
  void handlePing();
  void handleSyncStatus();
  void handleResetErrors();
  void handleNotFound();
  void sendCORSHeaders();
  void updateStateFromCommand(const String& command);
  String createStatusJSON();
  String createSyncStatusJSON();
  String createPingJSON();
  String createErrorJSON(const String& error);
  String createSuccessJSON(const String& message);
};

#endif