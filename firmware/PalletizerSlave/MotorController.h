#ifndef MOTOR_CONTROLLER_H
#define MOTOR_CONTROLLER_H

#include "Arduino.h"
#include "AccelStepper.h"

class MotorController {
public:
  MotorController();

  void begin();
  void loop();
  void processCommand(const String& command);

private:
  AccelStepper* motors[5];
  char motorNames[5];
  String inputBuffer;
  bool isMoving;
  unsigned long lastStatusTime;

  void initializeMotors();
  void parseMove(const String& cmd);
  void parseGroupMove(const String& cmd);
  void parseVelocity(const String& cmd);
  void parseAcceleration(const String& cmd);
  void sendStatus();
  void homeAll();
  void emergencyStop();
  void zeroAll();

  bool anyMotorMoving();
  long parseAxisValue(const String& cmd, char axis);
  int parseParameter(const String& cmd, char param);
};

#endif