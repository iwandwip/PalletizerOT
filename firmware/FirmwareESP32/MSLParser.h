#ifndef MSL_PARSER_H
#define MSL_PARSER_H

#include <String.h>
#include <ArduinoJson.h>

struct MSLCommand {
  String type;
  String axis;
  int position;
  int delay;
  bool isGroup;
  String originalCommand;
};

class MSLParser {
private:
  String* userFunctions;
  String* functionBodies;
  int functionCount;
  const int MAX_FUNCTIONS = 10;

  String expandFunctions(const String& script);
  String parseFunction(const String& script, int startPos);
  String expandCalls(const String& script);
  void parseMovementCommand(const String& cmd, MSLCommand& command);
  void parseGroupCommand(const String& cmd);
  String convertToSerial(const MSLCommand& cmd);

public:
  MSLParser();
  ~MSLParser();

  void parseScript(const String& script);
  String getNextCommand();
  bool hasMoreCommands();
  void reset();

private:
  String* commands;
  int commandCount;
  int currentIndex;
  const int MAX_COMMANDS = 100;
};

#endif