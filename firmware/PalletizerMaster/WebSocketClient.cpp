#include "WebSocketClient.h"

WebSocketClient* WebSocketClient::instance = nullptr;

WebSocketClient::WebSocketClient(const char* ssid, const char* password, const char* serverIP, int port)
    : wifiSSID(ssid), wifiPassword(password), serverIP(serverIP), serverPort(port), 
      connected(false), messageCallback(nullptr) {
    instance = this;
}

void WebSocketClient::begin() {
    connectWiFi();
    webSocket.begin(serverIP, serverPort, "/ws");
    webSocket.onEvent(webSocketEventWrapper);
    webSocket.setReconnectInterval(5000);
}

void WebSocketClient::loop() {
    webSocket.loop();
}

bool WebSocketClient::sendMessage(const String& message) {
    if (!connected) return false;
    webSocket.sendTXT(message);
    return true;
}

void WebSocketClient::setMessageCallback(void (*callback)(const String&)) {
    messageCallback = callback;
}

void WebSocketClient::connectWiFi() {
    WiFi.begin(wifiSSID, wifiPassword);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
}

void WebSocketClient::handleWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("WebSocket disconnected");
            connected = false;
            break;
            
        case WStype_CONNECTED:
            Serial.println("WebSocket connected");
            connected = true;
            break;
            
        case WStype_TEXT:
            if (messageCallback) {
                messageCallback(String((char*)payload));
            }
            break;
    }
}

void WebSocketClient::webSocketEventWrapper(WStype_t type, uint8_t* payload, size_t length) {
    if (instance) {
        instance->handleWebSocketEvent(type, payload, length);
    }
}