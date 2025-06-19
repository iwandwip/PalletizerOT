#include <WiFi.h>
#include "WebSocketManager.h"
#include "SerialBridge.h"

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST = "palletizer.local";
const int SERVER_PORT = 3001;

const int RX2_PIN = 16;
const int TX2_PIN = 17;

WebSocketManager* webSocket;
SerialBridge* serialBridge;

void onWebSocketMessage(const String& message);
void onSerialResponse(const String& response);
void connectWiFi();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== PalletizerMaster Starting ===");
  Serial.println("Simple OOP Architecture");
  connectWiFi();
  webSocket = new WebSocketManager(SERVER_HOST, SERVER_PORT);
  webSocket->setMessageCallback(onWebSocketMessage);
  webSocket->begin();
  serialBridge = new SerialBridge(Serial2, RX2_PIN, TX2_PIN);
  serialBridge->setResponseCallback(onSerialResponse);
  serialBridge->begin(115200);
  Serial.println("Setup complete. System ready!");
}

void loop() {
  webSocket->loop();
  serialBridge->loop();
  delay(1);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.println("IP: " + WiFi.localIP().toString());
}

void onWebSocketMessage(const String& message) {
  String serialCmd = serialBridge->jsonToSerial(message);
  if (serialCmd.length() > 0) {
    serialBridge->sendCommand(serialCmd);
  }
}

void onSerialResponse(const String& response) {
  webSocket->sendMessage(response);
}