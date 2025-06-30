#include "MSLParser.h"

MSLParser::MSLParser() {
  userFunctions = new String[MAX_FUNCTIONS];
  functionBodies = new String[MAX_FUNCTIONS];
  commands = new String[MAX_COMMANDS];
  functionCount = 0;
  commandCount = 0;
  currentIndex = 0;
}

MSLParser::~MSLParser() {
  delete[] userFunctions;
  delete[] functionBodies;
  delete[] commands;
}

void MSLParser::parseScript(const String& script) {
  reset();

  String expandedScript = expandFunctions(script);
  expandedScript = expandCalls(expandedScript);

  int start = 0;
  int end = 0;

  while (end < expandedScript.length() && commandCount < MAX_COMMANDS) {
    end = expandedScript.indexOf(';', start);
    if (end == -1) break;

    String cmd = expandedScript.substring(start, end);
    cmd.trim();

    if (cmd.length() > 0) {
      if (cmd.startsWith("GROUP(")) {
        parseGroupCommand(cmd);
      } else if (cmd == "ZERO") {
        commands[commandCount++] = "ZERO";
      } else if (cmd.startsWith("WAIT")) {
        commands[commandCount++] = cmd;
      } else if (cmd.startsWith("SPEED;")) {
        commands[commandCount++] = cmd;
      } else if (cmd.startsWith("SET(")) {
        commands[commandCount++] = cmd;
      } else {
        MSLCommand mslCmd;
        parseMovementCommand(cmd, mslCmd);
        if (mslCmd.type.length() > 0) {
          commands[commandCount++] = convertToSerial(mslCmd);
        }
      }
    }

    start = end + 1;
  }
}

String MSLParser::expandFunctions(const String& script) {
  String result = script;
  functionCount = 0;

  int pos = 0;
  while (pos < result.length() && functionCount < MAX_FUNCTIONS) {
    int funcStart = result.indexOf("FUNC(", pos);
    if (funcStart == -1) break;

    int nameStart = funcStart + 5;
    int nameEnd = result.indexOf(")", nameStart);
    if (nameEnd == -1) break;

    String funcName = result.substring(nameStart, nameEnd);

    int bodyStart = result.indexOf("{", nameEnd);
    if (bodyStart == -1) break;

    int braceCount = 1;
    int bodyEnd = bodyStart + 1;
    while (bodyEnd < result.length() && braceCount > 0) {
      if (result.charAt(bodyEnd) == '{') braceCount++;
      else if (result.charAt(bodyEnd) == '}') braceCount--;
      bodyEnd++;
    }

    if (braceCount == 0) {
      String funcBody = result.substring(bodyStart + 1, bodyEnd - 1);
      userFunctions[functionCount] = funcName;
      functionBodies[functionCount] = funcBody;
      functionCount++;

      result = result.substring(0, funcStart) + result.substring(bodyEnd);
      pos = funcStart;
    } else {
      break;
    }
  }

  return result;
}

String MSLParser::expandCalls(const String& script) {
  String result = script;

  int pos = 0;
  while (pos < result.length()) {
    int callStart = result.indexOf("CALL(", pos);
    if (callStart == -1) break;

    int nameStart = callStart + 5;
    int nameEnd = result.indexOf(")", nameStart);
    if (nameEnd == -1) break;

    String callName = result.substring(nameStart, nameEnd);

    String replacement = "";
    for (int i = 0; i < functionCount; i++) {
      if (userFunctions[i] == callName) {
        replacement = functionBodies[i];
        break;
      }
    }

    result = result.substring(0, callStart) + replacement + result.substring(nameEnd + 1);
    pos = callStart + replacement.length();
  }

  return result;
}

void MSLParser::parseMovementCommand(const String& cmd, MSLCommand& command) {
  command.type = "";
  command.axis = "";
  command.position = 0;
  command.delay = 0;
  command.isGroup = false;
  command.originalCommand = cmd;

  if (cmd.length() < 3) return;

  char axis = cmd.charAt(0);
  if (axis != 'X' && axis != 'Y' && axis != 'Z' && axis != 'T' && axis != 'G') return;

  command.axis = String(axis);
  command.type = "MOVE";

  int openParen = cmd.indexOf('(');
  int closeParen = cmd.lastIndexOf(')');
  if (openParen == -1 || closeParen == -1) return;

  String params = cmd.substring(openParen + 1, closeParen);

  int pos = 0;
  bool foundPosition = false;

  while (pos < params.length()) {
    int nextComma = params.indexOf(',', pos);
    if (nextComma == -1) nextComma = params.length();

    String param = params.substring(pos, nextComma);
    param.trim();

    if (param.startsWith("d")) {
      command.delay = param.substring(1).toInt();
    } else if (!foundPosition) {
      command.position = param.toInt();
      foundPosition = true;
    }

    pos = nextComma + 1;
  }
}

void MSLParser::parseGroupCommand(const String& cmd) {
  int start = cmd.indexOf('(') + 1;
  int end = cmd.lastIndexOf(')');

  if (start >= end) return;

  String groupContent = cmd.substring(start, end);

  int parenCount = 0;
  int cmdStart = 0;

  for (int i = 0; i <= groupContent.length(); i++) {
    char c = (i < groupContent.length()) ? groupContent.charAt(i) : ',';

    if (c == '(') parenCount++;
    else if (c == ')') parenCount--;
    else if (c == ',' && parenCount == 0) {
      String groupCmd = groupContent.substring(cmdStart, i);
      groupCmd.trim();

      if (groupCmd.length() > 0) {
        MSLCommand mslCmd;
        parseMovementCommand(groupCmd, mslCmd);
        if (mslCmd.type.length() > 0) {
          commands[commandCount++] = convertToSerial(mslCmd);
        }
      }

      cmdStart = i + 1;
    }
  }
}

String MSLParser::convertToSerial(const MSLCommand& cmd) {
  if (cmd.type != "MOVE") return "";

  String axis = cmd.axis;
  axis.toLowerCase();

  return axis + ";1;" + String(cmd.position) + ";";
}

String MSLParser::getNextCommand() {
  if (currentIndex < commandCount) {
    return commands[currentIndex++];
  }
  return "";
}

bool MSLParser::hasMoreCommands() {
  return currentIndex < commandCount;
}

void MSLParser::reset() {
  commandCount = 0;
  currentIndex = 0;
  functionCount = 0;
}