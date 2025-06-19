#ifndef WEBSOCKET_MANAGER_H
#define WEBSOCKET_MANAGER_H

#include "WebSocketsClient.h"
#include "ArduinoJson.h"

class WebSocketManager {
public:
  WebSocketManager(const char* serverIP, int serverPort);
  void begin();
  void loop();
  bool isConnected() const { return connected; }
  void sendMessage(const String& message);
  void setMessageCallback(void (*callback)(const String&));

private:
  WebSocketsClient webSocket;
  const char* serverIP;
  int serverPort;
  bool connected;
  void (*messageCallback)(const String&);
  static void webSocketEvent(WStype_t type, uint8_t* payload, size_t length);
  static WebSocketManager* instance;
};

#endif