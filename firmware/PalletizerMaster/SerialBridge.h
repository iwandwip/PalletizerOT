#ifndef SERIAL_BRIDGE_H
#define SERIAL_BRIDGE_H

#include "Arduino.h"
#include "ArduinoJson.h"

class SerialBridge {
public:
  SerialBridge(HardwareSerial& serial, int rxPin, int txPin);
  void begin(unsigned long baudRate = 115200);
  void loop();
  void sendCommand(const String& command);
  void setResponseCallback(void (*callback)(const String&));
  String jsonToSerial(const String& jsonCmd);
  String serialToJson(const String& serialResp);

private:
  HardwareSerial& serial;
  int rxPin;
  int txPin;
  String inputBuffer;
  void (*responseCallback)(const String&);
  void processResponse(const String& response);
};

#endif