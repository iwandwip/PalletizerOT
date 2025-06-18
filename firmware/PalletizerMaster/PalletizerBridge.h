#ifndef PALLETIZER_BRIDGE_H
#define PALLETIZER_BRIDGE_H

#include "Arduino.h"
#include "ArduinoJson.h"
#include "WebSocketClient.h"
#include "SerialBridge.h"
#include "CommandQueue.h"
#include "StatusManager.h"

extern const char* WIFI_SSID;
extern const char* WIFI_PASSWORD;
extern const char* SERVER_IP;
extern const int SERVER_PORT;

class PalletizerBridge {
public:
  enum SystemState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    READY,
    ERROR
  };

  static PalletizerBridge* getInstance();

  void begin();
  void loop();
  void end();

  SystemState getState() const {
    return currentState;
  }
  bool isConnected() const {
    return currentState == CONNECTED || currentState == READY;
  }

  void setStateChangeCallback(void (*callback)(SystemState state));
  void setErrorCallback(void (*callback)(const String& error));

private:
  static PalletizerBridge* instance;
  PalletizerBridge();
  ~PalletizerBridge();

  WebSocketClient* webSocket;
  SerialBridge* serial;
  CommandQueue* queue;
  StatusManager* statusManager;

  SystemState currentState;
  unsigned long lastHeartbeat;

  void (*stateChangeCallback)(SystemState state);
  void (*errorCallback)(const String& error);

  void initializeComponents();
  void cleanupComponents();
  void processCommands();
  void sendHeartbeat();
  void setState(SystemState newState);
  void notifyStateChange(SystemState state);
  void notifyError(const String& error);

  static void onWebSocketMessage(const String& message);
  static void onWebSocketConnect();
  static void onWebSocketDisconnect();
  static void onSerialData(const String& data);

  void handleServerCommand(const String& message);
  void handleArduinoResponse(const String& response);
  void convertAndQueueCommand(const String& cmdType, JsonObject data);
  void sendStatusToServer(const String& status, int queueSize = 0);
  void sendPositionToServer(const String& position);
  void sendErrorToServer(const String& error);

  static const unsigned long HEARTBEAT_INTERVAL = 30000;
};

#endif