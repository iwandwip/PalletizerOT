#ifndef COMMAND_PARSER_H
#define COMMAND_PARSER_H

#include "Arduino.h"
#include "MotorController.h"

class CommandParser {
public:
  enum CommandType {
    CMD_UNKNOWN,
    CMD_MOVE,
    CMD_GROUP_MOVE,
    CMD_SET_SPEED,
    CMD_SET_ACCEL,
    CMD_STATUS,
    CMD_HOME,
    CMD_ZERO,
    CMD_EMERGENCY_STOP
  };

  struct ParsedCommand {
    CommandType type;
    bool hasAxis[MotorController::AXIS_COUNT];
    long axisValues[MotorController::AXIS_COUNT];
    int speed;
    int acceleration;
    bool isValid;
    String errorMessage;
  };

  CommandParser(MotorController* motorController);
  ~CommandParser();

  bool processCommand(const String& command);
  ParsedCommand parseCommand(const String& command);
  bool executeCommand(const ParsedCommand& cmd);

  String generateResponse(bool success, const String& message = "");
  String generateStatusResponse();
  String generatePositionResponse();
  String generateErrorResponse(const String& error);

  void setResponseCallback(void (*callback)(const String& response));
  void setErrorCallback(void (*callback)(const String& error));

private:
  MotorController* motorController;

  String inputBuffer;

  void (*responseCallback)(const String& response);
  void (*errorCallback)(const String& error);

  CommandType identifyCommandType(const String& command);
  ParsedCommand parseMoveCommand(const String& command);
  ParsedCommand parseGroupMoveCommand(const String& command);
  ParsedCommand parseSpeedCommand(const String& command);
  ParsedCommand parseAccelCommand(const String& command);
  ParsedCommand parseSystemCommand(const String& command);

  bool extractAxisValues(const String& command, ParsedCommand& cmd);
  bool extractSpeed(const String& command, ParsedCommand& cmd);
  bool extractAcceleration(const String& command, ParsedCommand& cmd);
  long extractAxisValue(const String& command, char axis);
  int extractParameter(const String& command, char parameter);

  bool executeMoveCommand(const ParsedCommand& cmd);
  bool executeGroupMoveCommand(const ParsedCommand& cmd);
  bool executeSpeedCommand(const ParsedCommand& cmd);
  bool executeAccelCommand(const ParsedCommand& cmd);
  bool executeSystemCommand(const ParsedCommand& cmd);

  bool validateCommand(const ParsedCommand& cmd);
  bool validateAxisValues(const ParsedCommand& cmd);
  bool validateSpeed(int speed);
  bool validateAcceleration(int acceleration);

  void notifyResponse(const String& response);
  void notifyError(const String& error);
  char getAxisChar(MotorController::MotorAxis axis);
  MotorController::MotorAxis getAxisFromChar(char axisChar);
  String trimCommand(const String& command);

  static const long MIN_POSITION = -1000000;
  static const long MAX_POSITION = 1000000;
  static const int MIN_SPEED = 1;
  static const int MAX_SPEED = 5000;
  static const int MIN_ACCELERATION = 1;
  static const int MAX_ACCELERATION = 10000;
};

#endif