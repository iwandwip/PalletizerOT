#ifndef PALLETIZER_BRIDGE_H
#define PALLETIZER_BRIDGE_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "WebSocketClient.h"
#include "SerialBridge.h"
#include "CommandQueue.h"

class PalletizerBridge {
public:
    static PalletizerBridge* getInstance();
    
    void begin();
    void loop();
    bool isConnected() const;

private:
    static PalletizerBridge* instance;
    PalletizerBridge();
    
    WebSocketClient* webSocket;
    SerialBridge* serial;
    CommandQueue* queue;
    
    bool connected;
    unsigned long lastHeartbeat;
    
    void initializeComponents();
    void processCommands();
    void sendHeartbeat();
    
    // Static callbacks
    static void onWebSocketMessage(const String& message);
    static void onSerialData(const String& data);
    
    // Message handlers
    void handleServerCommand(const String& message);
    void handleArduinoResponse(const String& response);
    void convertAndQueueCommand(const String& cmdType, JsonObject data);
    void sendStatusToServer(const String& status, int queueSize = 0);
    void sendPositionToServer(const String& position);
    void sendErrorToServer(const String& error);
};

#endif