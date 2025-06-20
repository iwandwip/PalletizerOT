#ifndef COMMAND_PROCESSOR_H
#define COMMAND_PROCESSOR_H

#include "Arduino.h"
#include "limits.h"
#include "MotorController.h"

class CommandProcessor {
public:
  CommandProcessor(MotorController& motorController);
  void begin();
  void loop();
  void processCommand(const String& command);

private:
  MotorController& motorController;
  String inputBuffer;
  void parseMove(const String& cmd);
  void parseVelocity(const String& cmd);
  void sendStatus();
  void sendError(const String& message);
  long parseAxisValue(const String& cmd, char axis);
  int parseParameter(const String& cmd, char param);
  void handleMove(const String& cmd);
  void handleGroupMove(const String& cmd);
  void handleHome();
  void handleZero();
  void handleEmergencyStop();
  void handleStatusRequest();
  void handleVelocity(const String& cmd);
  void handleHybridCommand(const String& cmd);
};

#endif