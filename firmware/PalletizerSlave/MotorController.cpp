#include "MotorController.h"

const MotorController::MotorPins MotorController::motorPins[AXIS_COUNT] = {
  { 2, 3 },
  { 4, 5 },
  { 6, 7 },
  { 8, 9 },
  { 10, 11 }
};

const float MotorController::DEFAULT_SPEED = 2000.0;
const float MotorController::DEFAULT_ACCEL = 1000.0;

MotorController::MotorController()
  : moving(false) {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i] = new AccelStepper(AccelStepper::DRIVER, motorPins[i].stepPin, motorPins[i].dirPin);
  }
}

void MotorController::begin() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->setMaxSpeed(DEFAULT_SPEED);
    motors[i]->setAcceleration(DEFAULT_ACCEL);
    motors[i]->setCurrentPosition(0);
  }
  Serial.println("Motors initialized");
}

void MotorController::run() {
  bool anyMoving = false;
  for (int i = 0; i < AXIS_COUNT; i++) {
    if (motors[i]->run()) {
      anyMoving = true;
    }
  }
  bool wasMoving = moving;
  moving = anyMoving;
  if (wasMoving && !moving) {
    Serial.println("D");
  }
}

void MotorController::moveTo(char axis, long position) {
  int index = getAxisIndex(axis);
  if (index >= 0) {
    motors[index]->moveTo(position);
  }
}

void MotorController::moveToAll(long x, long y, long z, long t, long g) {
  motors[0]->moveTo(x);
  motors[1]->moveTo(y);
  motors[2]->moveTo(z);
  motors[3]->moveTo(t);
  motors[4]->moveTo(g);
}

void MotorController::setSpeed(char axis, float speed) {
  int index = getAxisIndex(axis);
  if (index >= 0) {
    motors[index]->setMaxSpeed(speed);
  }
}

void MotorController::setSpeedAll(float speed) {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->setMaxSpeed(speed);
  }
}

void MotorController::homeAll() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->moveTo(0);
  }
}

void MotorController::zeroAll() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->setCurrentPosition(0);
  }
}

void MotorController::emergencyStop() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->stop();
    motors[i]->setCurrentPosition(motors[i]->currentPosition());
  }
}

String MotorController::getPositionString() const {
  String pos = "P";
  for (int i = 0; i < AXIS_COUNT; i++) {
    pos += " " + String(axisNames[i]) + String(motors[i]->currentPosition());
  }
  return pos;
}

long MotorController::getPosition(char axis) const {
  int index = getAxisIndex(axis);
  if (index >= 0) {
    return motors[index]->currentPosition();
  }
  return 0;
}

int MotorController::getAxisIndex(char axis) const {
  for (int i = 0; i < AXIS_COUNT; i++) {
    if (axisNames[i] == axis) {
      return i;
    }
  }
  return -1;
}