#ifndef MOTOR_CONTROLLER_H
#define MOTOR_CONTROLLER_H

#include "AccelStepper.h"
#include "limits.h"

class MotorController {
public:
  static const int AXIS_COUNT = 5;
  MotorController();
  void begin();
  void run();
  void moveTo(char axis, long position);
  void moveToAll(long x, long y, long z, long t, long g);
  void setSpeed(char axis, float speed);
  void setSpeedAll(float speed);
  void homeAll();
  void zeroAll();
  void emergencyStop();
  bool isMoving() const {
    return moving;
  }
  String getPositionString() const;
  long getPosition(char axis) const;

private:
  AccelStepper* motors[AXIS_COUNT];
  char axisNames[AXIS_COUNT] = { 'X', 'Y', 'Z', 'T', 'G' };
  bool moving;
  int getAxisIndex(char axis) const;
  void updateMovingStatus();
  struct MotorPins {
    int stepPin;
    int dirPin;
  };
  static const MotorPins motorPins[AXIS_COUNT];
  static const float DEFAULT_SPEED;
  static const float DEFAULT_ACCEL;
};

#endif