#include "MotorController.h"
#include <limits.h>

#define DEFAULT_SPEED 2000
#define DEFAULT_ACCEL 1000
#define STATUS_INTERVAL 100

MotorController::MotorController()
  : isMovingFlag(false), lastStatusTime(0), motionState(MOTION_IDLE) {
  motorNames[0] = 'X';
  motorNames[1] = 'Y';
  motorNames[2] = 'Z';
  motorNames[3] = 'T';
  motorNames[4] = 'G';

  currentPosition.X = 0;
  currentPosition.Y = 0;
  currentPosition.Z = 0;
  currentPosition.T = 0;
  currentPosition.G = 0;
}

void MotorController::begin() {
  Serial.begin(115200);
  initializeMotors();
  Serial.println("SLAVE_READY");
}

void MotorController::loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
    }
  }

  run();

  bool moving = anyMotorMoving();
  if (isMovingFlag != moving) {
    isMovingFlag = moving;
    if (!isMovingFlag) {
      Serial.println("D");
    }
  }

  if (isMovingFlag && millis() - lastStatusTime > STATUS_INTERVAL) {
    sendStatus();
    lastStatusTime = millis();
  }
}

void MotorController::processCommand(const String& command) {
  String cmd = command;
  cmd.trim();
  if (cmd.length() == 0) return;

  char cmdType = cmd[0];

  switch (cmdType) {
    case 'M': parseMove(cmd); break;
    case 'G': parseGroupMove(cmd); break;
    case 'S': sendStatus(); break;
    case 'H': homeAll(); break;
    case 'E': emergencyStop(); break;
    case 'Z': zeroAll(); break;
    case 'V': parseVelocity(cmd); break;
    case 'A': parseAcceleration(cmd); break;
    default: Serial.println("E Unknown command");
  }
}

void MotorController::run() {
  bool moving = anyMotorMoving();
  updatePosition();
  updateMotionState();
}

// Public methods implementation
void MotorController::moveTo(MotorAxis axis, long position) {
  if (axis >= 0 && axis < AXIS_COUNT) {
    motors[axis]->moveTo(position);
  }
}

void MotorController::setMaxSpeed(MotorAxis axis, float speed) {
  if (axis >= 0 && axis < AXIS_COUNT) {
    motors[axis]->setMaxSpeed(speed);
  }
}

MotorController::Position MotorController::getCurrentPosition() const {
  return currentPosition;
}

bool MotorController::isMoving() const {
  return isMovingFlag;
}

void MotorController::initializeMotors() {
  motors[0] = new AccelStepper(AccelStepper::DRIVER, 2, 3);
  motors[1] = new AccelStepper(AccelStepper::DRIVER, 4, 5);
  motors[2] = new AccelStepper(AccelStepper::DRIVER, 6, 7);
  motors[3] = new AccelStepper(AccelStepper::DRIVER, 8, 9);
  motors[4] = new AccelStepper(AccelStepper::DRIVER, 10, 11);

  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->setMaxSpeed(DEFAULT_SPEED);
    motors[i]->setAcceleration(DEFAULT_ACCEL);
    motors[i]->setCurrentPosition(0);
  }
}

void MotorController::parseMove(const String& cmd) {
  int speed = parseParameter(cmd, 'S');
  int accel = parseParameter(cmd, 'A');
  if (speed == 0) speed = DEFAULT_SPEED;
  if (accel == 0) accel = DEFAULT_ACCEL;

  for (int i = 0; i < AXIS_COUNT; i++) {
    long pos = parseAxisValue(cmd, motorNames[i]);
    if (pos != LONG_MIN) {
      motors[i]->setMaxSpeed(speed);
      motors[i]->setAcceleration(accel);
      motors[i]->moveTo(pos);
    }
  }
  Serial.println("B");
}

void MotorController::parseGroupMove(const String& cmd) {
  parseMove(cmd);
}

void MotorController::parseVelocity(const String& cmd) {
  for (int i = 0; i < AXIS_COUNT; i++) {
    long speed = parseAxisValue(cmd, motorNames[i]);
    if (speed != LONG_MIN) {
      motors[i]->setMaxSpeed(speed);
    }
  }
  Serial.println("OK");
}

void MotorController::parseAcceleration(const String& cmd) {
  for (int i = 0; i < AXIS_COUNT; i++) {
    long accel = parseAxisValue(cmd, motorNames[i]);
    if (accel != LONG_MIN) {
      motors[i]->setAcceleration(accel);
    }
  }
  Serial.println("OK");
}

void MotorController::sendStatus() {
  Serial.print("P");
  for (int i = 0; i < AXIS_COUNT; i++) {
    Serial.print(" ");
    Serial.print(motorNames[i]);
    Serial.print(motors[i]->currentPosition());
  }
  Serial.println();
}

void MotorController::homeAll() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->moveTo(0);
  }
  Serial.println("B");
}

void MotorController::emergencyStop() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->stop();
    motors[i]->setCurrentPosition(motors[i]->currentPosition());
  }
  Serial.println("E STOPPED");
}

void MotorController::zeroAll() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    motors[i]->setCurrentPosition(0);
  }
  Serial.println("OK");
}

bool MotorController::anyMotorMoving() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    if (motors[i]->run()) return true;
  }
  return false;
}

long MotorController::parseAxisValue(const String& cmd, char axis) {
  int pos = cmd.indexOf(axis);
  if (pos == -1) return LONG_MIN;

  int nextSpace = cmd.indexOf(' ', pos);
  if (nextSpace == -1) nextSpace = cmd.length();

  return cmd.substring(pos + 1, nextSpace).toInt();
}

int MotorController::parseParameter(const String& cmd, char param) {
  int pos = cmd.indexOf(param);
  if (pos == -1) return 0;

  int nextSpace = cmd.indexOf(' ', pos);
  if (nextSpace == -1) nextSpace = cmd.length();

  return cmd.substring(pos + 1, nextSpace).toInt();
}

void MotorController::updatePosition() {
  currentPosition.X = motors[AXIS_X]->currentPosition();
  currentPosition.Y = motors[AXIS_Y]->currentPosition();
  currentPosition.Z = motors[AXIS_Z]->currentPosition();
  currentPosition.T = motors[AXIS_T]->currentPosition();
  currentPosition.G = motors[AXIS_G]->currentPosition();
}

void MotorController::updateMotionState() {
  bool moving = anyMotorMoving();
  if (moving) {
    motionState = MOTION_MOVING;
  } else {
    motionState = MOTION_IDLE;
  }
  isMovingFlag = moving;
}