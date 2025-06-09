#ifndef UART_RELAY_H
#define UART_RELAY_H

#include "Arduino.h"

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

  void checkSlaveResponses();
  void processSlaveData(const String& data);
  void sendHeartbeat();
  void parseGroupCommands(const String& groupCommands);
  void parseCoordinateCommand(const String& command);
  bool isValidSlaveId(const String& slaveId);
  bool isCoordinateCommand(const String& command);
  String formatParameters(const String& params);
};