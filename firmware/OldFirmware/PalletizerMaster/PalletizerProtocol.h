#ifndef PALLETIZER_PROTOCOL_H
#define PALLETIZER_PROTOCOL_H

#include "Arduino.h"
#include "DebugConfig.h"

#define ENABLE_MODULE_NODEF_SERIAL_ENHANCED
#define ENABLE_MODULE_NODEF_DIGITAL_OUTPUT

#include "Kinematrix.h"

class PalletizerProtocol {
public:
  enum Command {
    CMD_NONE = 0,
    CMD_RUN = 1,
    CMD_ZERO = 2,
    CMD_SETSPEED = 6,
    CMD_SET = 7,
    CMD_WAIT = 8,
    CMD_GROUP = 9,
    CMD_DETECT = 10
  };

  typedef void (*DataCallback)(const String& data);

  PalletizerProtocol(int rxPin, int txPin);
  void begin();
  void update();
  void sendToSlave(const String& data);
  void sendCommandToAllSlaves(Command cmd);
  void sendGroupCommands(const String& groupCommands);
  void sendCoordinateData(const String& data, Command currentCommand);
  void sendSpeedCommand(const String& speedData);
  void setDataCallback(DataCallback callback);
  bool isDataAvailable();
  String getLastReceivedData();

private:
  int rxPin, txPin;
  HardwareSerial& slaveCommSerial = Serial2;
  DigitalOut rxIndicatorLed;
  EnhancedSerial slaveSerial;
  String slavePartialBuffer;
  String lastReceivedData;
  DataCallback slaveDataCallback;
  bool dataReceived;

  void checkSlaveData();
  void onSlaveData(const String& data);
  void parseCoordinateData(const String& data, Command currentCommand);
  void parseAndSendGroupCommands(const String& groupCommands);
  void parseSpeedParameters(const String& speedData);
  void formatSlaveCommand(const String& slaveId, Command cmd, const String& params = "");
  bool isValidSlaveId(const String& slaveId);
  String formatParameters(const String& params);
};

#endif