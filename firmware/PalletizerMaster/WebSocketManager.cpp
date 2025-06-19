#include "WebSocketManager.h"

WebSocketManager* WebSocketManager::instance = nullptr;

WebSocketManager::WebSocketManager(const char* serverIP, int serverPort) 
  : serverIP(serverIP), serverPort(serverPort), connected(false), messageCallback(nullptr) {
  instance = this;
}

void WebSocketManager::begin() {
  webSocket.begin(serverIP, serverPort, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("WebSocket initialized");
}

void WebSocketManager::loop() {
  webSocket.loop();
}

void WebSocketManager::sendMessage(const String& message) {
  if (connected) {
    String msg = message;
    webSocket.sendTXT(msg);
  }
}

void WebSocketManager::setMessageCallback(void (*callback)(const String&)) {
  messageCallback = callback;
}

void WebSocketManager::webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (!instance) return;
  switch(type) {
    case WStype_DISCONNECTED:
      instance->connected = false;
      Serial.println("WebSocket disconnected");
      break;
    case WStype_CONNECTED:
      instance->connected = true;
      Serial.println("WebSocket connected");
      break;
    case WStype_TEXT:
      if (instance->messageCallback) {
        instance->messageCallback(String((char*)payload));
      }
      break;
  }
}