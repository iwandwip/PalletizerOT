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

  enum PacketMode {
    PACKET_MODE_LEGACY = 0,
    PACKET_MODE_BATCH = 1
  };

  struct CommandItem {
    String slaveId;
    Command cmd;
    String params;
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
  void setPacketMode(PacketMode mode);
  PacketMode getPacketMode();

private:
  static const int MAX_BATCH_COMMANDS = 10;
  static const int MAX_PACKET_SIZE = 256;

  int rxPin, txPin;
  HardwareSerial& slaveCommSerial = Serial2;
  DigitalOut rxIndicatorLed;
  EnhancedSerial slaveSerial;
  String slavePartialBuffer;
  String lastReceivedData;
  DataCallback slaveDataCallback;
  bool dataReceived;
  PacketMode currentPacketMode;

  CommandItem commandBuffer[MAX_BATCH_COMMANDS];
  int bufferedCommandCount;
  unsigned long lastCommandTime;
  static const unsigned long BATCH_TIMEOUT_MS = 50;

  void checkSlaveData();
  void onSlaveData(const String& data);
  void parseCoordinateData(const String& data, Command currentCommand);
  void parseAndSendGroupCommands(const String& groupCommands);
  void parseSpeedParameters(const String& speedData);
  void formatSlaveCommand(const String& slaveId, Command cmd, const String& params = "");
  bool isValidSlaveId(const String& slaveId);
  String formatParameters(const String& params);

  void addCommandToBuffer(const String& slaveId, Command cmd, const String& params = "");
  void flushCommandBuffer();
  void immediateFlush();
  void sendBatchedCommands();
  void sendLegacyCommand(const String& slaveId, Command cmd, const String& params = "");
  String buildPacket(const CommandItem* commands, int count);
  uint8_t calculateCRC8(const String& data);
  bool shouldFlushBuffer();
  void clearBuffer();
  void forceBufferClear();
};

#endif