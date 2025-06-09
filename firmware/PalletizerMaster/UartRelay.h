#ifndef UART_RELAY_H
#define UART_RELAY_H

#include "Arduino.h"

#define SYNC_SET_PIN 25
#define SYNC_WAIT_PIN 27
#define DETECT_PIN 26

class UartRelay {
public:
  typedef void (*ResponseCallback)(const String& response);

  UartRelay(int rxPin, int txPin);
  void begin();
  void update();
  void sendToSlaves(const String& command);
  void setResponseCallback(ResponseCallback callback);

private:
  int rxPin;
  int txPin;
  HardwareSerial& slaveSerial;
  String partialBuffer;
  ResponseCallback responseCallback;
  unsigned long lastHeartbeat;

  bool syncState;
  bool waitingForSync;
  bool detectActive;
  unsigned long lastSyncSignalTime;
  unsigned long syncTimeout;

  void checkSlaveResponses();
  void processSlaveData(const String& data);
  void updateSyncHandling();
  void sendHeartbeat();

  void handleZeroCommand();
  void handleSpeedCommand(const String& command);
  void handleGroupCommand(const String& command);
  void handleSetCommand(const String& command);
  void handleWaitCommand();
  void handleDetectCommand();
  void handleCoordinateCommand(const String& command);
  void sendRawCommand(const String& command);

  void parseGroupCommands(const String& groupCommands);
  void parseCoordinateCommand(const String& command);
  bool isValidSlaveId(const String& slaveId);
  bool isCoordinateCommand(const String& command);
  String formatParameters(const String& params);
};

#endif