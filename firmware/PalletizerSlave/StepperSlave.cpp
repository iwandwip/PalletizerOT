#include "StepperSlave.h"

StepperSlave* StepperSlave::instance = nullptr;

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
    dataBuffer(""),
    packetInProgress(false) {

  instance = this;

  brakeReleaseDelay = brakeReleaseDelayMs;
  brakeEngageDelay = brakeEngageDelayMs;

  acceleration = maxSpeed * SPEED_RATIO;
}

void StepperSlave::begin() {
  Serial.begin(9600);
  masterCommSerial.begin(9600);
#if TESTING_MODE
  masterSerial.begin(&Serial);
#else
  masterSerial.begin(&masterCommSerial);
#endif
  debugSerial.begin(&Serial);
  masterSerial.setDataCallback(onMasterDataWrapper);

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

  clearBuffer();
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Sistem diinisialisasi dengan packet support");
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Ready for communication on pins RX:" + String(8) + " TX:" + String(9));
}

void StepperSlave::update() {
  masterSerial.checkCallback();

  static unsigned long lastDirectCheck = 0;
  if (millis() - lastDirectCheck > 10) {
    lastDirectCheck = millis();
    checkDirectSerial();
  }

  if (motorState != MOTOR_PAUSED) {
    handleMotion();
  }
}

void StepperSlave::checkDirectSerial() {
  if (masterCommSerial.available() > 0) {
    String rawData = "";
    while (masterCommSerial.available() > 0) {
      char c = masterCommSerial.read();
      if (c == '\n' || c == '\r') {
        if (rawData.length() > 0) {
          DEBUG_PRINTLN("DIRECT_RX: " + rawData);
          processIncomingData(rawData);
          rawData = "";
        }
      } else if (c >= 32 && c <= 126) {
        rawData += c;
      }
    }

    if (rawData.length() > 0) {
      DEBUG_PRINTLN("PARTIAL_RX: " + rawData);
      addToBuffer(rawData);
    }
  }
}

void StepperSlave::onMasterDataWrapper(const String& data) {
  if (instance) {
    instance->onMasterData(data);
  }
}

void StepperSlave::onMasterData(const String& data) {
  DEBUG_PRINTLN("CALLBACK_RX: " + data);
  processIncomingData(data);
}

void StepperSlave::processIncomingData(const String& data) {
  addToBuffer(data);

  DataFormat format = detectDataFormat(dataBuffer);

  if (format == FORMAT_PACKET) {
    if (isPacketComplete()) {
      String packet = getCompletePacket();
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Processing packet: " + packet);
      if (processPacketData(packet)) {
        DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Packet processed successfully");
      } else {
        DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Packet processing failed");
      }
      clearBuffer();
    }
  } else if (format == FORMAT_LEGACY) {
    String command = dataBuffer;
    command.trim();
    if (command.length() > 0) {
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Processing legacy: " + command);
      processCommand(command);
    }
    clearBuffer();
  }
}

StepperSlave::DataFormat StepperSlave::detectDataFormat(const String& data) {
  if (data.indexOf('#') != -1) {
    return FORMAT_PACKET;
  }
  return FORMAT_LEGACY;
}

bool StepperSlave::processPacketData(const String& packet) {
  if (!validatePacketCRC(packet)) {
    return false;
  }

  int startPos = packet.indexOf('#') + 1;
  int endPos = packet.lastIndexOf('*');

  if (startPos <= 0 || endPos <= startPos) {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Invalid packet format");
    return false;
  }

  String packetContent = packet.substring(startPos, endPos);
  String relevantCommands = extractRelevantCommands(packetContent);

  if (relevantCommands.length() > 0) {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Relevant commands: " + relevantCommands);
    processExtractedCommands(relevantCommands);
    return true;
  }

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": No relevant commands found in packet");
  return false;
}

bool StepperSlave::validatePacketCRC(const String& packet) {
  int startPos = packet.indexOf('#') + 1;
  int asteriskPos = packet.lastIndexOf('*');
  int endPos = packet.lastIndexOf('#');

  if (startPos <= 0 || asteriskPos <= startPos || endPos <= asteriskPos) {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Invalid packet structure");
    return false;
  }

  String content = packet.substring(startPos, asteriskPos);
  String crcHex = packet.substring(asteriskPos + 1, endPos);
  crcHex.toUpperCase();

  uint8_t expectedCRC = calculateCRC8(content);
  uint8_t receivedCRC = 0;

  if (crcHex.length() == 1) {
    receivedCRC = strtol(crcHex.c_str(), NULL, 16);
  } else if (crcHex.length() == 2) {
    receivedCRC = strtol(crcHex.c_str(), NULL, 16);
  } else {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Invalid CRC format: " + crcHex);
    return false;
  }

  char expectedHex[3];
  sprintf(expectedHex, "%02X", expectedCRC);

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": CRC Check - Content: '" + content + "'");
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Expected CRC: " + String(expectedCRC) + " (0x" + String(expectedHex) + ")");
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Received CRC: " + String(receivedCRC) + " (0x" + crcHex + ")");

  bool valid = (expectedCRC == receivedCRC);
  if (!valid) {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": CRC validation failed");
  } else {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": CRC validation passed");
  }

  return valid;
}

uint8_t StepperSlave::calculateCRC8(const String& data) {
  uint8_t crc = 0;
  for (int i = 0; i < data.length(); i++) {
    crc ^= data.charAt(i);
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

String StepperSlave::extractRelevantCommands(const String& packetContent) {
  String result = "";
  String slaveIdStr = String(slaveId);

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Extracting from: " + packetContent);

  int pos = 0;
  while (pos < packetContent.length()) {
    int commaPos = packetContent.indexOf(',', pos);
    String command = (commaPos == -1) ? packetContent.substring(pos) : packetContent.substring(pos, commaPos);

    command.trim();
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Checking command: '" + command + "'");

    if (command.startsWith(slaveIdStr + ";") || command.startsWith("all;")) {
      if (result.length() > 0) {
        result += ",";
      }
      result += command;
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Command matches - added to result");
    }

    pos = (commaPos == -1) ? packetContent.length() : commaPos + 1;
  }

  return result;
}

void StepperSlave::processExtractedCommands(const String& commands) {
  int pos = 0;
  while (pos < commands.length()) {
    int commaPos = commands.indexOf(',', pos);
    String singleCommand = (commaPos == -1) ? commands.substring(pos) : commands.substring(pos, commaPos);

    singleCommand.trim();

    if (singleCommand.length() > 0) {
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Executing: " + singleCommand);
      processCommand(singleCommand);
    }

    pos = (commaPos == -1) ? commands.length() : commaPos + 1;
  }
}

void StepperSlave::addToBuffer(const String& data) {
  if (dataBuffer.length() + data.length() < MAX_BUFFER_SIZE) {
    dataBuffer += data;
  } else {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Buffer overflow, clearing");
    clearBuffer();
    dataBuffer = data;
  }
}

void StepperSlave::clearBuffer() {
  dataBuffer = "";
  packetInProgress = false;
}

bool StepperSlave::isPacketComplete() {
  if (dataBuffer.indexOf('#') == -1) return false;

  int firstHash = dataBuffer.indexOf('#');
  int lastHash = dataBuffer.lastIndexOf('#');

  return (firstHash != lastHash && lastHash > firstHash);
}

String StepperSlave::getCompletePacket() {
  int firstHash = dataBuffer.indexOf('#');
  int lastHash = dataBuffer.lastIndexOf('#');

  if (firstHash != -1 && lastHash > firstHash) {
    return dataBuffer.substring(firstHash, lastHash + 1);
  }

  return "";
}

void StepperSlave::processCommand(const String& data) {
  int firstSeparator = data.indexOf(';');
  if (firstSeparator == -1) return;

  String slaveIdStr = data.substring(0, firstSeparator);
  slaveIdStr.toLowerCase();

  if (slaveIdStr != String(slaveId) && slaveIdStr != "all") return;

  int secondSeparator = data.indexOf(';', firstSeparator + 1);
  int cmdCode = (secondSeparator == -1)
                  ? data.substring(firstSeparator + 1).toInt()
                  : data.substring(firstSeparator + 1, secondSeparator).toInt();

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Processing command " + String(cmdCode));

  switch (cmdCode) {
    case CMD_ZERO:
      handleZeroCommand();
      break;
    case CMD_SETSPEED:
      if (secondSeparator != -1) {
        handleSetSpeedCommand(data.substring(secondSeparator + 1));
      }
      break;
    case CMD_RUN:
      if (secondSeparator != -1) {
        handleMoveCommand(data.substring(secondSeparator + 1));
      }
      break;
    default:
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Unknown command " + String(cmdCode));
      break;
  }
}

void StepperSlave::sendFeedback(const String& message) {
  String feedback = String(slaveId) + ";" + message;
  masterSerial.println(feedback);
  DEBUG_PRINTLN("SLAVE→MASTER: " + feedback);
}

void StepperSlave::reportPosition() {
  String positionUpdate = "POS:" + String(stepper.currentPosition()) + " TARGET:" + String(stepper.targetPosition());
  sendFeedback(positionUpdate);
}

void StepperSlave::handleZeroCommand() {
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Executing ZERO (Homing)");

  motorState = MOTOR_IDLE;
  queuedMotionsCount = 0;
  currentMotionIndex = 0;
  setIndicator(false);

  performHoming();

  sendFeedback("ZERO DONE");
}

void StepperSlave::handleMoveCommand(const String& params) {
  parsePositionSequence(params);
  hasReportedCompletion = false;

  if (queuedMotionsCount > 0) {
    setIndicator(true);
    motorState = MOTOR_IDLE;
    currentMotionIndex = 0;
    executeCurrentMotion();
  }
}

void StepperSlave::handleSetSpeedCommand(const String& params) {
  float newSpeed = params.toFloat();
  if (newSpeed > 0) {
    DEBUG_PRINT("SLAVE ");
    DEBUG_PRINT(slaveId);
    DEBUG_PRINT(": Setting speed to ");
    DEBUG_PRINTLN(newSpeed);

    maxSpeed = newSpeed;
    stepper.setMaxSpeed(maxSpeed);

    acceleration = maxSpeed * SPEED_RATIO;
    stepper.setAcceleration(acceleration);

    sendFeedback("SPEED SET TO " + String(maxSpeed));
  } else {
    DEBUG_PRINT("SLAVE ");
    DEBUG_PRINT(slaveId);
    DEBUG_PRINTLN(": Invalid speed value");
    sendFeedback("INVALID SPEED VALUE");
  }
}

void StepperSlave::parsePositionSequence(const String& params) {
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Parsing position sequence: " + params);

  int semicolonPos = -1;
  int startPos = 0;
  queuedMotionsCount = 0;
  currentMotionIndex = 0;

  do {
    semicolonPos = params.indexOf(';', startPos);
    String param = (semicolonPos == -1) ? params.substring(startPos) : params.substring(startPos, semicolonPos);
    param.trim();

    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Parsing parameter: " + param);

    if (queuedMotionsCount < MAX_MOTIONS) {
      motionQueue[queuedMotionsCount].speed = maxSpeed;
      motionQueue[queuedMotionsCount].completed = false;

      if (param.startsWith("d")) {
        unsigned long delayValue = param.substring(1).toInt();
        motionQueue[queuedMotionsCount].delayMs = delayValue;
        motionQueue[queuedMotionsCount].position = 0;
        motionQueue[queuedMotionsCount].isDelayOnly = true;

        DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Queueing delay " + String(queuedMotionsCount) + " - Delay: " + String(delayValue) + "ms");
      } else {
        long position = param.toInt();
        motionQueue[queuedMotionsCount].position = position;
        motionQueue[queuedMotionsCount].delayMs = 0;
        motionQueue[queuedMotionsCount].isDelayOnly = false;

        DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Queueing position " + String(queuedMotionsCount) + " - Pos: " + String(position));
      }

      queuedMotionsCount++;
    }

    startPos = semicolonPos + 1;
  } while (semicolonPos != -1 && startPos < params.length() && queuedMotionsCount < MAX_MOTIONS);

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Total queued motions: " + String(queuedMotionsCount));
}

void StepperSlave::handleMotion() {
  if (queuedMotionsCount == 0 || currentMotionIndex >= queuedMotionsCount) return;

  if (motorState == MOTOR_DELAYING) {
    if (millis() - delayStartTime >= motionQueue[currentMotionIndex].delayMs) {
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Delay completed");
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

  sendFeedback("MOVING TO " + String(targetPosition));
  reportPosition();

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Moving to position: " + String(targetPosition));
  stepper.moveTo(targetPosition);
  stepper.runToPosition();

  reportPosition();
  sendFeedback("POSITION REACHED");
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Position reached");

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
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Starting homing sequence");
  setIndicator(true);

  float originalSpeed = stepper.maxSpeed();
  float originalAccel = stepper.acceleration();

  stepper.setMaxSpeed(HOMING_SPEED);
  stepper.setAcceleration(HOMING_ACCEL);

  activateMotor();

  long distance = 0;
  int count = 20000;

  if (digitalRead(sensorPin) == HIGH) {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Already in sensor area, moving out first");
    stepper.move(count);
    while (digitalRead(sensorPin) == HIGH && stepper.distanceToGo() != 0) {
      stepper.run();
    }

    if (stepper.distanceToGo() != 0) {
      stepper.stop();
      stepper.setCurrentPosition(stepper.currentPosition());
      DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Moving back to sensor");
      stepper.move(-count);
      while (digitalRead(sensorPin) == LOW && stepper.distanceToGo() != 0) {
        stepper.run();
      }
    }
  } else {
    DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Outside sensor area, moving to sensor");
    stepper.move(-count);
    while (digitalRead(sensorPin) == LOW && stepper.distanceToGo() != 0) {
      stepper.run();
    }
  }

  stepper.stop();
  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Sensor detected");

  distance = stepper.distanceToGo();
  stepper.runToPosition();

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Correcting overshot by " + String(distance) + " steps");
  stepper.move(-distance);
  stepper.runToPosition();

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Setting home position (0)");
  stepper.setCurrentPosition(0);

  stepper.setMaxSpeed(originalSpeed);
  stepper.setAcceleration(originalAccel);

  deactivateMotor();

  setIndicator(false);

  DEBUG_PRINTLN("SLAVE " + String(slaveId) + ": Homing completed");
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