#ifndef WEBSOCKET_CLIENT_H
#define WEBSOCKET_CLIENT_H

#include "Arduino.h"
#include "WiFi.h"
#include "WebSocketsClient.h"
#include "ArduinoJson.h"

class WebSocketClient {
public:
  WebSocketClient(const char* ssid, const char* password, const char* serverIP, int port);

  void begin();
  void loop();
  bool isConnected() const {
    return connected;
  }

  bool sendMessage(const String& message);
  void setMessageCallback(void (*callback)(const String&));

private:
  const char* wifiSSID;
  const char* wifiPassword;
  const char* serverIP;
  int serverPort;

  WebSocketsClient webSocket;
  bool connected;
  void (*messageCallback)(const String&);

  void connectWiFi();
  void handleWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);

  static WebSocketClient* instance;
  static void webSocketEventWrapper(WStype_t type, uint8_t* payload, size_t length);
};

#endif