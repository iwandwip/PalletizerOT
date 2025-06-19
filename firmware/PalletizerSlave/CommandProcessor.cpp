#include "CommandProcessor.h"

CommandProcessor::CommandProcessor(MotorController& motorController)
  : motorController(motorController) {
}

void CommandProcessor::begin() {
  Serial.begin(115200);
  Serial.println("SLAVE_READY");
}

void CommandProcessor::loop() {
  while (Serial.available()) {
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
}

void CommandProcessor::processCommand(const String& command) {
  String cmd = command;
  cmd.trim();
  if (cmd.length() == 0) return;
  char cmdType = cmd[0];
  switch (cmdType) {
    case 'M':
      handleMove(cmd);
      break;
    case 'G':
      handleGroupMove(cmd);
      break;
    case 'S':
      handleStatusRequest();
      break;
    case 'H':
      handleHome();
      break;
    case 'E':
      handleEmergencyStop();
      break;
    case 'Z':
      handleZero();
      break;
    case 'V':
      handleVelocity(cmd);
      break;
    default:
      sendError("Unknown command: " + String(cmdType));
  }
}

void CommandProcessor::handleMove(const String& cmd) {
  parseMove(cmd);
  Serial.println("B");
}

void CommandProcessor::handleGroupMove(const String& cmd) {
  parseMove(cmd);
  Serial.println("B");
}

void CommandProcessor::handleHome() {
  motorController.homeAll();
  Serial.println("B");
}

void CommandProcessor::handleZero() {
  motorController.zeroAll();
  Serial.println("OK");
}

void CommandProcessor::handleEmergencyStop() {
  motorController.emergencyStop();
  Serial.println("E STOPPED");
}

void CommandProcessor::handleStatusRequest() {
  sendStatus();
}

void CommandProcessor::handleVelocity(const String& cmd) {
  parseVelocity(cmd);
  Serial.println("OK");
}

void CommandProcessor::parseMove(const String& cmd) {
  int speed = parseParameter(cmd, 'S');
  if (speed > 0) {
    motorController.setSpeedAll(speed);
  }
  char axes[] = { 'X', 'Y', 'Z', 'T', 'G' };
  for (int i = 0; i < 5; i++) {
    long pos = parseAxisValue(cmd, axes[i]);
    if (pos != LONG_MIN) {
      motorController.moveTo(axes[i], pos);
    }
  }
}

void CommandProcessor::parseVelocity(const String& cmd) {
  char axes[] = { 'X', 'Y', 'Z', 'T', 'G' };
  for (int i = 0; i < 5; i++) {
    int speed = parseAxisValue(cmd, axes[i]);
    if (speed > 0) {
      motorController.setSpeed(axes[i], speed);
    }
  }
}

void CommandProcessor::sendStatus() {
  Serial.println(motorController.getPositionString());
}

void CommandProcessor::sendError(const String& message) {
  Serial.println("E " + message);
}

long CommandProcessor::parseAxisValue(const String& cmd, char axis) {
  int pos = cmd.indexOf(axis);
  if (pos == -1) return LONG_MIN;
  int nextSpace = cmd.indexOf(' ', pos);
  if (nextSpace == -1) nextSpace = cmd.length();
  return cmd.substring(pos + 1, nextSpace).toInt();
}

int CommandProcessor::parseParameter(const String& cmd, char param) {
  int pos = cmd.indexOf(param);
  if (pos == -1) return 0;
  int nextSpace = cmd.indexOf(' ', pos);
  if (nextSpace == -1) nextSpace = cmd.length();
  return cmd.substring(pos + 1, nextSpace).toInt();
}