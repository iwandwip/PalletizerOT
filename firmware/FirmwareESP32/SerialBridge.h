#ifndef SERIAL_BRIDGE_H
#define SERIAL_BRIDGE_H

#include <Arduino.h>

class SerialBridge {
private:
  HardwareSerial* serial;
  unsigned long responseTimeout;
  String lastResponse;
  bool waitingForResponse;

public:
  SerialBridge(HardwareSerial* serialPort);
  void begin(unsigned long baudRate);
  bool sendCommand(const String& command);
  bool sendCommandAndWait(const String& command, const String& expectedResponse, unsigned long timeout = 5000);
  String getLastResponse();
  bool hasResponse();
  String readResponse();
  void clearBuffer();
  bool isReady();
};

#endif