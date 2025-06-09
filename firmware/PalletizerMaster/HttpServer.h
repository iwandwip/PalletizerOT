#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include "Arduino.h"
#include "WiFi.h"
#include "WebServer.h"

class HttpServer {
public:
  typedef void (*CommandCallback)(const String& command);

  HttpServer();
  void begin();
  void handleClient();
  void setCommandCallback(CommandCallback callback);
  void setLastSlaveResponse(const String& response);

private:
  WebServer server;
  CommandCallback commandCallback;
  String lastSlaveResponse;
  String currentState;
  unsigned long lastResponseTime;

  void handleExecute();
  void handleStatus();
  void handlePing();
  void handleNotFound();
  void sendCORSHeaders();
  String createStatusJSON();
  String createErrorJSON(const String& error);
  String createSuccessJSON(const String& message);
};

#endif