#ifndef MOTOR_CONTROLLER_H
#define MOTOR_CONTROLLER_H

#include "Arduino.h"
#include "AccelStepper.h"

class MotorController {
public:
  static const int AXIS_COUNT = 5;

  enum MotorAxis {
    AXIS_X = 0,
    AXIS_Y = 1,
    AXIS_Z = 2,
    AXIS_T = 3,
    AXIS_G = 4
  };

  enum MotionState {
    MOTION_IDLE,
    MOTION_MOVING,
    MOTION_ERROR
  };

  struct Position {
    long X;
    long Y;
    long Z;
    long T;
    long G;
  };

  MotorController();

  void begin();
  void run();
  void loop();
  void processCommand(const String& command);

  // Public methods needed by CommandParser
  void moveTo(MotorAxis axis, long position);
  void setMaxSpeed(MotorAxis axis, float speed);
  Position getCurrentPosition() const;
  bool isMoving() const;
  void homeAll();
  void emergencyStop();
  void zeroAll();

private:
  AccelStepper* motors[AXIS_COUNT];
  char motorNames[AXIS_COUNT];
  String inputBuffer;
  bool isMovingFlag;
  unsigned long lastStatusTime;
  Position currentPosition;
  MotionState motionState;

  void initializeMotors();
  void parseMove(const String& cmd);
  void parseGroupMove(const String& cmd);
  void parseVelocity(const String& cmd);
  void parseAcceleration(const String& cmd);
  void sendStatus();

  bool anyMotorMoving();
  long parseAxisValue(const String& cmd, char axis);
  int parseParameter(const String& cmd, char param);
  void updatePosition();
  void updateMotionState();
};

#endif