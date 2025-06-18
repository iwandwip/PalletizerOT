/*
 * PalletizerMaster - ESP32 WebSocket to Serial Bridge
 * NEW ARCHITECTURE: Laptop Server → ESP32 Master → Arduino Mega Slave
 * 
 * Object-Oriented Implementation following old firmware patterns:
 * - Singleton Pattern for system coordination
 * - Observer Pattern for component communication
 * - Command Pattern for message handling
 */

#include "PalletizerBridge.h"

// Network Configuration - UPDATE THESE VALUES
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP = "192.168.1.100"; // Your laptop IP
const int SERVER_PORT = 3001;

// Serial Configuration for Arduino Mega communication
const int RX2_PIN = 16;
const int TX2_PIN = 17;
const unsigned long SERIAL_BAUD = 115200;

// Global system instance
PalletizerBridge* palletizerBridge = nullptr;

// Callback functions
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
    // Initialize serial for debugging
    Serial.begin(115200);
    delay(1000);
    
    Serial.println();
    Serial.println("=================================");
    Serial.println("PalletizerMaster Starting...");
    Serial.println("NEW OOP Architecture");
    Serial.println("=================================");
    
    // Get singleton instance
    palletizerBridge = PalletizerBridge::getInstance();
    
    if (palletizerBridge) {
        // Register callbacks
        palletizerBridge->setStateChangeCallback(onStateChange);
        palletizerBridge->setErrorCallback(onError);
        
        // Initialize system
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
    
    // Small delay to prevent watchdog issues
    delay(1);
}

// Optional: Handle system events
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