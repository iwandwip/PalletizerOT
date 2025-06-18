#include "PalletizerBridge.h"

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP = "192.168.1.100";
const int SERVER_PORT = 3001;

const int RX2_PIN = 16;
const int TX2_PIN = 17;
const unsigned long SERIAL_BAUD = 115200;

PalletizerBridge* palletizerBridge = nullptr;

void onStateChange(PalletizerBridge::SystemState state) {
  Serial.print("System state changed to: ");
  switch (state) {
    case PalletizerBridge::DISCONNECTED:
      Serial.println("DISCONNECTED");
      break;
    case PalletizerBridge::CONNECTING:
      Serial.println("CONNECTING");
      break;
    case PalletizerBridge::CONNECTED:
      Serial.println("CONNECTED");
      break;
    case PalletizerBridge::READY:
      Serial.println("READY");
      break;
    case PalletizerBridge::ERROR:
      Serial.println("ERROR");
      break;
  }
}

void onError(const String& error) {
  Serial.println("System error: " + error);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=================================");
  Serial.println("PalletizerMaster Starting...");
  Serial.println("NEW OOP Architecture");
  Serial.println("=================================");

  palletizerBridge = PalletizerBridge::getInstance();

  if (palletizerBridge) {
    palletizerBridge->setStateChangeCallback(onStateChange);
    palletizerBridge->setErrorCallback(onError);

    palletizerBridge->begin();

    Serial.println("PalletizerMaster initialized successfully");
    Serial.println("Waiting for connections...");
  } else {
    Serial.println("FATAL: Failed to initialize PalletizerBridge");
    while (1) {
      delay(1000);
    }
  }
}

void loop() {
  if (palletizerBridge) {
    palletizerBridge->loop();
  }

  delay(1);
}

void onSystemEvent(arduino_event_id_t event) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.println("WiFi connected, IP: " + WiFi.localIP().toString());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.println("WiFi disconnected");
      break;
    default:
      break;
  }
}