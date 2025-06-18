#include "CommandParser.h"

CommandParser::CommandParser(MotorController* motorController)
  : motorController(motorController), responseCallback(nullptr), errorCallback(nullptr) {
}

CommandParser::~CommandParser() {
}

bool CommandParser::processCommand(const String& command) {
  ParsedCommand cmd = parseCommand(command);

  if (!cmd.isValid) {
    notifyError(cmd.errorMessage);
    return false;
  }

  return executeCommand(cmd);
}

CommandParser::ParsedCommand CommandParser::parseCommand(const String& command) {
  ParsedCommand cmd;
  cmd.isValid = false;
  cmd.type = CMD_UNKNOWN;
  cmd.speed = -1;
  cmd.acceleration = -1;

  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    cmd.hasAxis[i] = false;
    cmd.axisValues[i] = 0;
  }

  String trimmedCommand = trimCommand(command);
  if (trimmedCommand.length() == 0) {
    cmd.errorMessage = "Empty command";
    return cmd;
  }

  cmd.type = identifyCommandType(trimmedCommand);

  switch (cmd.type) {
    case CMD_MOVE:
      return parseMoveCommand(trimmedCommand);
    case CMD_GROUP_MOVE:
      return parseGroupMoveCommand(trimmedCommand);
    case CMD_SET_SPEED:
      return parseSpeedCommand(trimmedCommand);
    case CMD_SET_ACCEL:
      return parseAccelCommand(trimmedCommand);
    case CMD_STATUS:
    case CMD_HOME:
    case CMD_ZERO:
    case CMD_EMERGENCY_STOP:
      return parseSystemCommand(trimmedCommand);
    default:
      cmd.errorMessage = "Unknown command: " + trimmedCommand;
      return cmd;
  }
}

CommandParser::CommandType CommandParser::identifyCommandType(const String& command) {
  char firstChar = command.charAt(0);

  switch (firstChar) {
    case 'M': return CMD_MOVE;
    case 'G': return CMD_GROUP_MOVE;
    case 'V': return CMD_SET_SPEED;
    case 'A': return CMD_SET_ACCEL;
    case 'S': return CMD_STATUS;
    case 'H': return CMD_HOME;
    case 'Z': return CMD_ZERO;
    case 'E': return CMD_EMERGENCY_STOP;
    default: return CMD_UNKNOWN;
  }
}

CommandParser::ParsedCommand CommandParser::parseMoveCommand(const String& command) {
  ParsedCommand cmd;
  cmd.type = CMD_MOVE;
  cmd.isValid = true;

  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    cmd.hasAxis[i] = false;
    cmd.axisValues[i] = 0;
  }

  if (!extractAxisValues(command, cmd)) {
    cmd.isValid = false;
    cmd.errorMessage = "Invalid axis values";
    return cmd;
  }

  extractSpeed(command, cmd);
  extractAcceleration(command, cmd);

  return validateCommand(cmd) ? cmd : ParsedCommand{ CMD_UNKNOWN, { false }, { 0 }, -1, -1, false, "Validation failed" };
}

CommandParser::ParsedCommand CommandParser::parseGroupMoveCommand(const String& command) {
  ParsedCommand cmd;
  cmd.type = CMD_GROUP_MOVE;
  cmd.isValid = true;

  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    cmd.hasAxis[i] = false;
    cmd.axisValues[i] = 0;
  }

  if (!extractAxisValues(command, cmd)) {
    cmd.isValid = false;
    cmd.errorMessage = "Invalid axis values";
    return cmd;
  }

  extractSpeed(command, cmd);
  extractAcceleration(command, cmd);

  return validateCommand(cmd) ? cmd : ParsedCommand{ CMD_UNKNOWN, { false }, { 0 }, -1, -1, false, "Validation failed" };
}

CommandParser::ParsedCommand CommandParser::parseSystemCommand(const String& command) {
  ParsedCommand cmd;
  cmd.type = identifyCommandType(command);
  cmd.isValid = true;
  cmd.speed = -1;
  cmd.acceleration = -1;

  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    cmd.hasAxis[i] = false;
    cmd.axisValues[i] = 0;
  }

  return cmd;
}

bool CommandParser::extractAxisValues(const String& command, ParsedCommand& cmd) {
  const char* axes = "XYZTG";

  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    long value = extractAxisValue(command, axes[i]);
    if (value != LONG_MIN) {
      cmd.hasAxis[i] = true;
      cmd.axisValues[i] = value;
    }
  }

  bool hasAnyAxis = false;
  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    if (cmd.hasAxis[i]) {
      hasAnyAxis = true;
      break;
    }
  }

  return hasAnyAxis;
}

long CommandParser::extractAxisValue(const String& command, char axis) {
  int axisIndex = command.indexOf(axis);
  if (axisIndex == -1) return LONG_MIN;

  int startIndex = axisIndex + 1;
  int endIndex = startIndex;

  if (endIndex < command.length() && command.charAt(endIndex) == '-') {
    endIndex++;
  }

  while (endIndex < command.length() && isDigit(command.charAt(endIndex))) {
    endIndex++;
  }

  if (endIndex == startIndex || (endIndex == startIndex + 1 && command.charAt(startIndex) == '-')) {
    return LONG_MIN;
  }

  return command.substring(startIndex, endIndex).toInt();
}

bool CommandParser::executeCommand(const ParsedCommand& cmd) {
  switch (cmd.type) {
    case CMD_MOVE:
      return executeMoveCommand(cmd);
    case CMD_GROUP_MOVE:
      return executeGroupMoveCommand(cmd);
    case CMD_SET_SPEED:
      return executeSpeedCommand(cmd);
    case CMD_SET_ACCEL:
      return executeAccelCommand(cmd);
    case CMD_STATUS:
    case CMD_HOME:
    case CMD_ZERO:
    case CMD_EMERGENCY_STOP:
      return executeSystemCommand(cmd);
    default:
      notifyError("Cannot execute unknown command");
      return false;
  }
}

bool CommandParser::executeMoveCommand(const ParsedCommand& cmd) {
  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    if (cmd.hasAxis[i]) {
      motorController->moveTo((MotorController::MotorAxis)i, cmd.axisValues[i]);
    }
  }

  if (cmd.speed > 0) {
    for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
      if (cmd.hasAxis[i]) {
        motorController->setMaxSpeed((MotorController::MotorAxis)i, cmd.speed);
      }
    }
  }

  notifyResponse("B");
  return true;
}

bool CommandParser::executeGroupMoveCommand(const ParsedCommand& cmd) {
  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    if (cmd.hasAxis[i]) {
      motorController->moveTo((MotorController::MotorAxis)i, cmd.axisValues[i]);
    }
  }

  if (cmd.speed > 0) {
    for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
      if (cmd.hasAxis[i]) {
        motorController->setMaxSpeed((MotorController::MotorAxis)i, cmd.speed);
      }
    }
  }

  notifyResponse("B");
  return true;
}

bool CommandParser::executeSystemCommand(const ParsedCommand& cmd) {
  switch (cmd.type) {
    case CMD_STATUS:
      notifyResponse(generateStatusResponse());
      return true;
    case CMD_HOME:
      motorController->homeAll();
      notifyResponse("B");
      return true;
    case CMD_ZERO:
      motorController->zeroAll();
      notifyResponse("D");
      return true;
    case CMD_EMERGENCY_STOP:
      motorController->emergencyStop();
      notifyResponse("E Emergency stop activated");
      return true;
    default:
      return false;
  }
}

String CommandParser::generateStatusResponse() {
  MotorController::Position pos = motorController->getCurrentPosition();
  return "P X" + String(pos.X) + " Y" + String(pos.Y) + " Z" + String(pos.Z) + " T" + String(pos.T) + " G" + String(pos.G);
}

String CommandParser::generatePositionResponse() {
  return generateStatusResponse();
}

String CommandParser::generateErrorResponse(const String& error) {
  return "E " + error;
}

bool CommandParser::validateCommand(const ParsedCommand& cmd) {
  return validateAxisValues(cmd);
}

bool CommandParser::validateAxisValues(const ParsedCommand& cmd) {
  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    if (cmd.hasAxis[i]) {
      if (cmd.axisValues[i] < MIN_POSITION || cmd.axisValues[i] > MAX_POSITION) {
        return false;
      }
    }
  }
  return true;
}

void CommandParser::notifyResponse(const String& response) {
  if (responseCallback) {
    responseCallback(response);
  }
}

void CommandParser::notifyError(const String& error) {
  if (errorCallback) {
    errorCallback(error);
  }
}

void CommandParser::setResponseCallback(void (*callback)(const String& response)) {
  responseCallback = callback;
}

void CommandParser::setErrorCallback(void (*callback)(const String& error)) {
  errorCallback = callback;
}

String CommandParser::trimCommand(const String& command) {
  String trimmed = command;
  trimmed.trim();
  return trimmed;
}

CommandParser::ParsedCommand CommandParser::parseSpeedCommand(const String& command) {
  ParsedCommand cmd;
  cmd.type = CMD_SET_SPEED;
  cmd.isValid = true;
  return cmd;
}

CommandParser::ParsedCommand CommandParser::parseAccelCommand(const String& command) {
  ParsedCommand cmd;
  cmd.type = CMD_SET_ACCEL;
  cmd.isValid = true;
  return cmd;
}

bool CommandParser::executeSpeedCommand(const ParsedCommand& cmd) {
  notifyResponse("D");
  return true;
}

bool CommandParser::executeAccelCommand(const ParsedCommand& cmd) {
  notifyResponse("D");
  return true;
}

bool CommandParser::extractSpeed(const String& command, ParsedCommand& cmd) {
  int speed = extractParameter(command, 'S');
  if (speed > 0) {
    cmd.speed = speed;
    return true;
  }
  return false;
}

bool CommandParser::extractAcceleration(const String& command, ParsedCommand& cmd) {
  int accel = extractParameter(command, 'A');
  if (accel > 0) {
    cmd.acceleration = accel;
    return true;
  }
  return false;
}

int CommandParser::extractParameter(const String& command, char parameter) {
  int paramIndex = command.indexOf(parameter);
  if (paramIndex == -1) return -1;

  int startIndex = paramIndex + 1;
  int endIndex = startIndex;

  while (endIndex < command.length() && isDigit(command.charAt(endIndex))) {
    endIndex++;
  }

  if (endIndex == startIndex) return -1;

  return command.substring(startIndex, endIndex).toInt();
}

char CommandParser::getAxisChar(MotorController::MotorAxis axis) {
  const char* axes = "XYZTG";
  return axes[(int)axis];
}

MotorController::MotorAxis CommandParser::getAxisFromChar(char axisChar) {
  switch (axisChar) {
    case 'X': return MotorController::AXIS_X;
    case 'Y': return MotorController::AXIS_Y;
    case 'Z': return MotorController::AXIS_Z;
    case 'T': return MotorController::AXIS_T;
    case 'G': return MotorController::AXIS_G;
    default: return MotorController::AXIS_X;
  }
}

String CommandParser::generateResponse(bool success, const String& message) {
  if (success) {
    return message.length() > 0 ? message : "D";
  } else {
    return "E " + message;
  }
}

bool CommandParser::validateSpeed(int speed) {
  return speed >= MIN_SPEED && speed <= MAX_SPEED;
}

bool CommandParser::validateAcceleration(int acceleration) {
  return acceleration >= MIN_ACCELERATION && acceleration <= MAX_ACCELERATION;
}