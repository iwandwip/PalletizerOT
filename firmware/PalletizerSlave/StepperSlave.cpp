#include "StepperSlave.h"

StepperSlave::StepperSlave(
  char id, int rxPin, int txPin, int clkPin, int cwPin, int enPin, int sensorPin,
  int brakePin, bool invertBrakeLogic, int indicatorPin, bool invertEnableLogic,
  unsigned long brakeReleaseDelayMs, unsigned long brakeEngageDelayMs)
  : slaveId(id),
    masterCommSerial(rxPin, txPin),
    stepper(AccelStepper::DRIVER, clkPin, cwPin),
    enPin(enPin),
    sensorPin(sensorPin),
    brakePin(brakePin),
    indicatorPin(indicatorPin),
    invertBrakeLogic(invertBrakeLogic),
    invertEnableLogic(invertEnableLogic),
    bufferIndex(0) {

  brakeReleaseDelay = brakeReleaseDelayMs;
  brakeEngageDelay = brakeEngageDelayMs;
  acceleration = maxSpeed * SPEED_RATIO;
  clearBuffer();
}

void StepperSlave::begin() {
  Serial.begin(9600);
  masterCommSerial.begin(9600);

  if (enPin != NOT_CONNECTED) {
    pinMode(enPin, OUTPUT);
    setEnable(false);
    isEnableActive = false;
  }

  pinMode(sensorPin, INPUT_PULLUP);

  if (brakePin != NOT_CONNECTED) {
    pinMode(brakePin, OUTPUT);
    setBrake(true);
    isBrakeEngaged = true;
  }

  if (indicatorPin != NOT_CONNECTED) {
    pinMode(indicatorPin, OUTPUT);
    setIndicator(false);
  }

  stepper.setAcceleration(acceleration);
  stepper.setMaxSpeed(maxSpeed);
  stepper.setCurrentPosition(0);

  DEBUG_PRINT("SLAVE ");
  DEBUG_PRINT(slaveId);
  DEBUG_PRINTLN(" READY");
}

void StepperSlave::update() {
  checkSerial();

  if (motorState != MOTOR_PAUSED) {
    handleMotion();
  }
}

void StepperSlave::checkSerial() {
  while (masterCommSerial.available() > 0) {
    char c = masterCommSerial.read();

    if (c == '\n' || c == '\r') {
      if (bufferIndex > 0) {
        dataBuffer[bufferIndex] = '\0';
        processCompleteData(dataBuffer);
        clearBuffer();
      }
    } else if (c >= 32 && c <= 126) {
      addToBuffer(c);
    }
  }
}

void StepperSlave::processCompleteData(const char* data) {
  if (isPacketFormat(data)) {
    processPacketData(data);
  } else {
    processCommand(data);
  }
}

bool StepperSlave::isPacketFormat(const char* data) {
  return (data[0] == '#' && strchr(data, '*') != NULL && strrchr(data, '#') != data);
}

bool StepperSlave::processPacketData(const char* packet) {
  if (!validatePacketCRC(packet)) {
    return false;
  }

  char myCommand[MAX_COMMAND_SIZE];
  if (extractMyCommand(packet, myCommand)) {
    processCommand(myCommand);
    return true;
  }

  return false;
}

bool StepperSlave::validatePacketCRC(const char* packet) {
  char* firstHash = strchr(packet, '#');
  char* asterisk = strchr(packet, '*');
  char* lastHash = strrchr(packet, '#');

  if (!firstHash || !asterisk || !lastHash || firstHash >= asterisk || asterisk >= lastHash) {
    return false;
  }

  int contentLen = asterisk - firstHash - 1;
  if (contentLen <= 0) return false;

  uint8_t expectedCRC = calculateCRC8(firstHash + 1, contentLen);

  char crcStr[3];
  int crcLen = lastHash - asterisk - 1;
  if (crcLen > 2 || crcLen <= 0) return false;

  strncpy(crcStr, asterisk + 1, crcLen);
  crcStr[crcLen] = '\0';

  uint8_t receivedCRC = strtol(crcStr, NULL, 16);

  return (expectedCRC == receivedCRC);
}

uint8_t StepperSlave::calculateCRC8(const char* data, int len) {
  uint8_t crc = 0;
  for (int i = 0; i < len; i++) {
    crc ^= data[i];
    for (int j = 0; j < 8; j++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07;
      } else {
        crc <<= 1;
      }
    }
  }
  return crc;
}

bool StepperSlave::extractMyCommand(const char* packet, char* output) {
  char* firstHash = strchr(packet, '#');
  char* asterisk = strchr(packet, '*');

  if (!firstHash || !asterisk || firstHash >= asterisk) {
    return false;
  }

  char* content = firstHash + 1;
  int contentLen = asterisk - content;

  char slavePrefix[3];
  slavePrefix[0] = slaveId;
  slavePrefix[1] = ';';
  slavePrefix[2] = '\0';

  char* pos = content;
  char* endPos = content + contentLen;

  while (pos < endPos) {
    char* comma = strchr(pos, ',');
    char* cmdEnd = (comma && comma < endPos) ? comma : endPos;

    int cmdLen = cmdEnd - pos;

    if (cmdLen < MAX_COMMAND_SIZE - 1 && cmdLen > 2) {
      if (strncmp(pos, slavePrefix, 2) == 0) {
        strncpy(output, pos, cmdLen);
        output[cmdLen] = '\0';
        return true;
      }
    }

    pos = comma ? comma + 1 : endPos;
  }

  return false;
}

void StepperSlave::processCommand(const char* data) {
  char* firstSep = strchr(data, ';');
  if (!firstSep) return;

  char slaveIdStr = data[0];
  if (slaveIdStr != slaveId && strncmp(data, "all", 3) != 0) return;

  char* secondSep = strchr(firstSep + 1, ';');
  int cmdCode = atoi(firstSep + 1);

  switch (cmdCode) {
    case CMD_ZERO:
      handleZeroCommand();
      break;
    case CMD_SETSPEED:
      if (secondSep) {
        handleSetSpeedCommand(secondSep + 1);
      }
      break;
    case CMD_RUN:
      if (secondSep) {
        handleMoveCommand(secondSep + 1);
      }
      break;
  }
}

void StepperSlave::sendFeedback(const char* message) {
  Serial.print(slaveId);
  Serial.print(';');
  Serial.println(message);
}

void StepperSlave::handleZeroCommand() {
  motorState = MOTOR_IDLE;
  queuedMotionsCount = 0;
  currentMotionIndex = 0;
  setIndicator(false);

  performHoming();
  sendFeedback("ZERO DONE");
}

void StepperSlave::handleMoveCommand(const char* params) {
  parsePositionSequence(params);
  hasReportedCompletion = false;

  if (queuedMotionsCount > 0) {
    setIndicator(true);
    motorState = MOTOR_IDLE;
    currentMotionIndex = 0;
    executeCurrentMotion();
  }
}

void StepperSlave::handleSetSpeedCommand(const char* params) {
  float newSpeed = atof(params);
  if (newSpeed > 0) {
    maxSpeed = newSpeed;
    stepper.setMaxSpeed(maxSpeed);
    acceleration = maxSpeed * SPEED_RATIO;
    stepper.setAcceleration(acceleration);

    Serial.print(slaveId);
    Serial.print(";SPEED SET TO ");
    Serial.println(newSpeed, 0);
  } else {
    sendFeedback("INVALID SPEED VALUE");
  }
}

void StepperSlave::parsePositionSequence(const char* params) {
  queuedMotionsCount = 0;
  currentMotionIndex = 0;

  char paramsCopy[64];
  strncpy(paramsCopy, params, 63);
  paramsCopy[63] = '\0';

  char* token = strtok(paramsCopy, ";");
  while (token && queuedMotionsCount < MAX_MOTIONS) {
    motionQueue[queuedMotionsCount].speed = maxSpeed;
    motionQueue[queuedMotionsCount].completed = false;

    if (token[0] == 'd') {
      motionQueue[queuedMotionsCount].delayMs = atol(token + 1);
      motionQueue[queuedMotionsCount].position = 0;
      motionQueue[queuedMotionsCount].isDelayOnly = true;
    } else {
      motionQueue[queuedMotionsCount].position = atol(token);
      motionQueue[queuedMotionsCount].delayMs = 0;
      motionQueue[queuedMotionsCount].isDelayOnly = false;
    }

    queuedMotionsCount++;
    token = strtok(NULL, ";");
  }
}

void StepperSlave::handleMotion() {
  if (queuedMotionsCount == 0 || currentMotionIndex >= queuedMotionsCount) return;

  if (motorState == MOTOR_DELAYING) {
    if (millis() - delayStartTime >= motionQueue[currentMotionIndex].delayMs) {
      motorState = MOTOR_IDLE;
      motionQueue[currentMotionIndex].completed = true;

      currentMotionIndex++;
      if (currentMotionIndex < queuedMotionsCount) {
        executeCurrentMotion();
      } else {
        setIndicator(false);
        sendFeedback("SEQUENCE COMPLETED");
        hasReportedCompletion = true;
        motorState = MOTOR_IDLE;
      }
    }
  }
}

void StepperSlave::executeCurrentMotion() {
  if (currentMotionIndex >= queuedMotionsCount) {
    setIndicator(false);
    sendFeedback("SEQUENCE COMPLETED");
    hasReportedCompletion = true;
    motorState = MOTOR_IDLE;
    return;
  }

  setIndicator(true);

  if (motionQueue[currentMotionIndex].isDelayOnly) {
    motorState = MOTOR_DELAYING;
    delayStartTime = millis();
    sendFeedback("DELAYING");
    return;
  }

  motorState = MOTOR_MOVING;
  activateMotor();

  long targetPosition = motionQueue[currentMotionIndex].position;
  stepper.setMaxSpeed(motionQueue[currentMotionIndex].speed);

  Serial.print(slaveId);
  Serial.print(";MOVING TO ");
  Serial.println(targetPosition);

  stepper.moveTo(targetPosition);
  stepper.runToPosition();

  sendFeedback("POSITION REACHED");
  deactivateMotor();

  motionQueue[currentMotionIndex].completed = true;
  motorState = MOTOR_IDLE;

  currentMotionIndex++;
  if (currentMotionIndex < queuedMotionsCount) {
    executeCurrentMotion();
  } else {
    setIndicator(false);
    sendFeedback("SEQUENCE COMPLETED");
    hasReportedCompletion = true;
  }
}

void StepperSlave::performHoming() {
  setIndicator(true);

  float originalSpeed = stepper.maxSpeed();
  float originalAccel = stepper.acceleration();

  stepper.setMaxSpeed(HOMING_SPEED);
  stepper.setAcceleration(HOMING_ACCEL);

  activateMotor();

  long distance = 0;
  int count = 20000;

  if (digitalRead(sensorPin) == HIGH) {
    stepper.move(count);
    while (digitalRead(sensorPin) == HIGH && stepper.distanceToGo() != 0) {
      stepper.run();
    }

    if (stepper.distanceToGo() != 0) {
      stepper.stop();
      stepper.setCurrentPosition(stepper.currentPosition());
      stepper.move(-count);
      while (digitalRead(sensorPin) == LOW && stepper.distanceToGo() != 0) {
        stepper.run();
      }
    }
  } else {
    stepper.move(-count);
    while (digitalRead(sensorPin) == LOW && stepper.distanceToGo() != 0) {
      stepper.run();
    }
  }

  stepper.stop();
  distance = stepper.distanceToGo();
  stepper.runToPosition();

  stepper.move(-distance);
  stepper.runToPosition();
  stepper.setCurrentPosition(0);

  stepper.setMaxSpeed(originalSpeed);
  stepper.setAcceleration(originalAccel);

  deactivateMotor();
  setIndicator(false);
}

void StepperSlave::setBrake(bool engaged) {
  if (brakePin != NOT_CONNECTED) {
    bool brakeState = engaged;
    if (invertBrakeLogic) {
      brakeState = !brakeState;
    }
    digitalWrite(brakePin, brakeState ? HIGH : LOW);
    isBrakeEngaged = engaged;
  }
}

void StepperSlave::setEnable(bool active) {
  if (enPin != NOT_CONNECTED) {
    bool enableState = active;
    if (invertEnableLogic) {
      enableState = !enableState;
    }
    digitalWrite(enPin, enableState ? LOW : HIGH);
    isEnableActive = active;
  }
}

void StepperSlave::activateMotor() {
  setBrake(false);
  setEnable(true);
  if (brakeReleaseDelay > 0) {
    delay(brakeReleaseDelay);
  }
}

void StepperSlave::deactivateMotor() {
  if (brakeEngageDelay > 0) {
    delay(brakeEngageDelay);
  }
  setBrake(true);
  setEnable(false);
}

void StepperSlave::setIndicator(bool active) {
  if (indicatorPin != NOT_CONNECTED) {
    digitalWrite(indicatorPin, active ? LOW : HIGH);
  }
}

void StepperSlave::addToBuffer(char c) {
  if (bufferIndex < MAX_BUFFER_SIZE - 1) {
    dataBuffer[bufferIndex++] = c;
  }
}

void StepperSlave::clearBuffer() {
  bufferIndex = 0;
  memset(dataBuffer, 0, sizeof(dataBuffer));
}