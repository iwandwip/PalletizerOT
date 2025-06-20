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
  
  // Handle new hybrid format: "axis;direction;position;speed;"
  if (cmd.indexOf(';') != -1) {
    handleHybridCommand(cmd);
    return;
  }
  
  // Legacy command handling
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
  while (motorController.isMoving()) {
    motorController.run();
    delay(1);
  }
  Serial.println("OK");
}

void CommandProcessor::handleGroupMove(const String& cmd) {
  parseMove(cmd);
  while (motorController.isMoving()) {
    motorController.run();
    delay(1);
  }
  Serial.println("OK");
}

void CommandProcessor::handleHome() {
  motorController.homeAll();
  while (motorController.isMoving()) {
    motorController.run();
    delay(1);
  }
  Serial.println("OK");
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

void CommandProcessor::handleHybridCommand(const String& cmd) {
  // Parse format: "axis;direction;position;speed;"
  // Example: "x;1;100;1500;" or "g;0;1;" (gripper open)
  
  int firstSemi = cmd.indexOf(';');
  int secondSemi = cmd.indexOf(';', firstSemi + 1);
  int thirdSemi = cmd.indexOf(';', secondSemi + 1);
  
  if (firstSemi == -1 || secondSemi == -1 || thirdSemi == -1) {
    sendError("Invalid hybrid command format");
    return;
  }
  
  String axis = cmd.substring(0, firstSemi);
  int direction = cmd.substring(firstSemi + 1, secondSemi).toInt();
  int position = cmd.substring(secondSemi + 1, thirdSemi).toInt();
  
  // Optional speed parameter
  int speed = 1500; // default
  int fourthSemi = cmd.indexOf(';', thirdSemi + 1);
  if (fourthSemi != -1 && thirdSemi + 1 < fourthSemi) {
    speed = cmd.substring(thirdSemi + 1, fourthSemi).toInt();
  }
  
  // Handle special commands
  if (axis == "home") {
    handleHome();
    return;
  } else if (axis == "zero") {
    handleZero();
    return;
  } else if (axis == "wait") {
    delay(position); // position = duration in ms
    Serial.println("DONE");
    return;
  }
  
  // Convert axis to uppercase
  char axisChar = axis.charAt(0);
  if (axisChar >= 'a' && axisChar <= 'z') {
    axisChar = axisChar - 'a' + 'A';
  }
  
  // Handle gripper commands
  if (axisChar == 'G') {
    if (direction == 0) {
      // Gripper open
      motorController.gripperOpen();
    } else {
      // Gripper close
      motorController.gripperClose();
    }
    Serial.println("DONE");
    return;
  }
  
  // Handle movement commands
  if (axisChar == 'X' || axisChar == 'Y' || axisChar == 'Z' || axisChar == 'T') {
    // Set speed if specified
    if (speed != 1500) {
      motorController.setSpeed(axisChar, speed);
    }
    
    // Calculate final position based on direction
    long finalPosition = direction == 1 ? position : -position;
    
    // Execute movement
    motorController.moveTo(axisChar, finalPosition);
    
    // Wait for movement to complete (simplified)
    delay(100); // Small delay to start movement
    while (motorController.isMoving(axisChar)) {
      delay(10);
    }
    
    Serial.println("DONE");
  } else {
    sendError("Unknown axis: " + String(axisChar));
  }
}

int CommandProcessor::parseParameter(const String& cmd, char param) {
  int pos = cmd.indexOf(param);
  if (pos == -1) return 0;
  int nextSpace = cmd.indexOf(' ', pos);
  if (nextSpace == -1) nextSpace = cmd.length();
  return cmd.substring(pos + 1, nextSpace).toInt();
}