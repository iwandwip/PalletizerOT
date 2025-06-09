#include "PalletizerScriptParser.h"
#include "PalletizerMaster.h"
#include "DebugManager.h"

PalletizerScriptParser::PalletizerScriptParser(PalletizerMaster* master)
  : palletizerMaster(master), functionCount(0), commandCounter(0), debugEnabled(true), parsingMode(false) {
}

void PalletizerScriptParser::parseScript(const String& script) {
  String cleanScript = script;
  trimWhitespace(cleanScript);

  if (cleanScript.length() == 0) return;

  setParsingMode(true);
  resetCommandCounter();

  debugLog("INFO", "PARSER", "════════════════════════════════════════");
  debugLog("INFO", "PARSER", "📥 Received Script (" + String(cleanScript.length()) + " bytes)");

  int funcDefCount = 0;
  int callCount = 0;
  int tempPos = 0;

  while ((tempPos = cleanScript.indexOf("FUNC(", tempPos)) != -1) {
    funcDefCount++;
    tempPos += 5;
  }

  tempPos = 0;
  while ((tempPos = cleanScript.indexOf("CALL(", tempPos)) != -1) {
    callCount++;
    tempPos += 5;
  }

  debugLog("INFO", "PARSER", "Script Type: " + String(funcDefCount > 0 ? "MODERN_SCRIPT" : "INLINE_COMMANDS"));
  debugLog("INFO", "PARSER", "");

  int pos = 0;
  while (pos < cleanScript.length()) {
    int funcPos = cleanScript.indexOf("FUNC(", pos);

    if (funcPos != -1 && (funcPos == 0 || cleanScript.charAt(funcPos - 1) == ' ' || cleanScript.charAt(funcPos - 1) == '\n' || cleanScript.charAt(funcPos - 1) == '\r')) {
      parseFunction(cleanScript, funcPos);

      int openBrace = cleanScript.indexOf('{', funcPos);
      int closeBrace = findMatchingBrace(cleanScript, openBrace);
      pos = closeBrace + 1;
    } else {
      int nextFunc = cleanScript.indexOf("FUNC(", pos);
      String scriptPart;

      if (nextFunc == -1) {
        scriptPart = cleanScript.substring(pos);
        pos = cleanScript.length();
      } else {
        scriptPart = cleanScript.substring(pos, nextFunc);
        pos = nextFunc;
      }

      scriptPart.trim();
      if (scriptPart.length() > 0) {
        String statements[MAX_STATEMENTS];
        int statementCount = 0;
        tokenizeStatementsWithCommandSupport(scriptPart, statements, statementCount);

        for (int i = 0; i < statementCount; i++) {
          statements[i].trim();
          if (statements[i].length() > 0) {
            executeStatement(statements[i]);
          }
        }
      }
    }
  }

  setParsingMode(false);
  printParsingInfo();
}

void PalletizerScriptParser::executeStatement(const String& statement) {
  String cleanStatement = statement;
  trimWhitespace(cleanStatement);

  if (cleanStatement.length() == 0) return;

  commandCounter++;

  if (isGroupCommand(cleanStatement)) {
    processGroupCommand(cleanStatement);
  } else if (cleanStatement.startsWith("CALL(") && cleanStatement.endsWith(")")) {
    String funcName = cleanStatement.substring(5, cleanStatement.length() - 1);
    trimWhitespace(funcName);
    callFunction(funcName);
  } else {
    processSingleStatement(cleanStatement);
  }
}

bool PalletizerScriptParser::callFunction(const String& funcName) {
  String trimmedName = funcName;
  trimWhitespace(trimmedName);

  for (int i = 0; i < functionCount; i++) {
    if (userFunctions[i].name.equals(trimmedName)) {
      int cmdCount = getCommandCountInFunction(trimmedName);
      debugLog("INFO", "EXECUTOR", "🔄 Executing: CALL(" + trimmedName + ")");
      debugLog("INFO", "EXECUTOR", "└─ Entering function " + trimmedName + " (" + String(cmdCount) + " commands)");

      String statements[MAX_STATEMENTS];
      int statementCount = 0;
      tokenizeStatementsWithCommandSupport(userFunctions[i].body, statements, statementCount);

      for (int j = 0; j < statementCount; j++) {
        statements[j].trim();
        if (statements[j].length() > 0 && !statements[j].startsWith("CALL(")) {
          debugLog("INFO", "FUNCTION", "  [" + String(j + 1) + "/" + String(statementCount) + "] " + statements[j]);
          if (parsingMode) {
            queueCommand(statements[j]);
          } else {
            executeStatement(statements[j]);
          }
        }
      }

      debugLog("INFO", "EXECUTOR", "✅ Function " + trimmedName + " completed");
      return true;
    }
  }

  debugLog("ERROR", "EXECUTOR", "❌ Function not found: " + funcName);
  return false;
}

void PalletizerScriptParser::clearFunctions() {
  functionCount = 0;
  for (int i = 0; i < MAX_FUNCTIONS; i++) {
    userFunctions[i].name = "";
    userFunctions[i].body = "";
  }
}

int PalletizerScriptParser::getFunctionCount() {
  return functionCount;
}

String PalletizerScriptParser::getFunctionName(int index) {
  if (index >= 0 && index < functionCount) {
    return userFunctions[index].name;
  }
  return "";
}

void PalletizerScriptParser::setYieldInterval(int interval) {
}

int PalletizerScriptParser::getYieldInterval() {
  return 0;
}

void PalletizerScriptParser::resetCommandCounter() {
  commandCounter = 0;
}

int PalletizerScriptParser::getCommandCounter() {
  return commandCounter;
}

void PalletizerScriptParser::setDebugEnabled(bool enabled) {
  debugEnabled = enabled;
}

int PalletizerScriptParser::getCommandCountInFunction(const String& funcName) {
  for (int i = 0; i < functionCount; i++) {
    if (userFunctions[i].name.equals(funcName)) {
      return countStatementsInBody(userFunctions[i].body);
    }
  }
  return 0;
}

void PalletizerScriptParser::printParsingInfo() {
  debugLog("INFO", "PARSER", "📋 PARSING RESULTS:");

  if (functionCount > 0) {
    debugLog("INFO", "PARSER", "├─ Functions Found: " + String(functionCount));
    for (int i = 0; i < functionCount; i++) {
      int cmdCount = countStatementsInBody(userFunctions[i].body);
      String prefix = (i == functionCount - 1) ? "│  └─ " : "│  ├─ ";
      debugLog("INFO", "PARSER", prefix + userFunctions[i].name + " (" + String(cmdCount) + " commands)");
    }
  }

  debugLog("INFO", "PARSER", "└─ Total Commands: " + String(commandCounter));
  debugLog("INFO", "PARSER", "════════════════════════════════════════");
}

bool PalletizerScriptParser::isGroupCommand(const String& statement) {
  return statement.startsWith("GROUP(") && statement.endsWith(")");
}

String PalletizerScriptParser::extractGroupContent(const String& groupStatement) {
  if (!isGroupCommand(groupStatement)) {
    return "";
  }

  int startPos = groupStatement.indexOf('(');
  int endPos = groupStatement.lastIndexOf(')');

  if (startPos == -1 || endPos == -1 || startPos >= endPos) {
    return "";
  }

  String content = groupStatement.substring(startPos + 1, endPos);
  trimWhitespace(content);
  return content;
}

void PalletizerScriptParser::processGroupCommand(const String& groupStatement) {
  String groupContent = extractGroupContent(groupStatement);

  if (groupContent.length() == 0) {
    debugLog("ERROR", "GROUP", "❌ Empty GROUP command");
    return;
  }

  debugLog("INFO", "GROUP", "🔄 Processing GROUP command");
  debugLog("INFO", "GROUP", "└─ Content: " + groupContent);

  String groupCommand = "GROUP(" + groupContent + ")";
  if (parsingMode) {
    queueCommand(groupCommand);
  } else {
    palletizerMaster->processCommand(groupCommand);
  }
}

void PalletizerScriptParser::queueCommand(const String& command) {
  palletizerMaster->addCommandToQueue(command);
}

void PalletizerScriptParser::setParsingMode(bool mode) {
  parsingMode = mode;
}

void PalletizerScriptParser::parseFunction(const String& script, int startPos) {
  if (functionCount >= MAX_FUNCTIONS) return;

  String funcName = extractFunctionName(script.substring(startPos));
  if (!isValidFunctionName(funcName) || functionExists(funcName)) return;

  String funcBody = extractFunctionBody(script, startPos);
  if (funcBody.length() == 0) return;

  userFunctions[functionCount].name = funcName;
  userFunctions[functionCount].body = funcBody;
  functionCount++;
}

String PalletizerScriptParser::extractFunctionBody(const String& script, int startPos) {
  int openBrace = script.indexOf('{', startPos);
  if (openBrace == -1) return "";

  int closeBrace = findMatchingBrace(script, openBrace);
  if (closeBrace == -1) return "";

  String body = script.substring(openBrace + 1, closeBrace);
  trimWhitespace(body);
  return body;
}

String PalletizerScriptParser::extractFunctionName(const String& funcDef) {
  int startParen = funcDef.indexOf('(');
  int endParen = funcDef.indexOf(')', startParen);

  if (startParen == -1 || endParen == -1) return "";

  String name = funcDef.substring(startParen + 1, endParen);
  trimWhitespace(name);
  return name;
}

void PalletizerScriptParser::tokenizeStatements(const String& input, String* statements, int& count) {
  count = 0;
  String current = "";

  for (int i = 0; i < input.length() && count < MAX_STATEMENTS; i++) {
    char c = input.charAt(i);

    if (c == ';') {
      current.trim();
      if (current.length() > 0) {
        statements[count] = current;
        count++;
      }
      current = "";
    } else {
      current += c;
    }
  }

  current.trim();
  if (current.length() > 0 && count < MAX_STATEMENTS) {
    statements[count] = current;
    count++;
  }
}

void PalletizerScriptParser::tokenizeStatementsWithGroupSupport(const String& input, String* statements, int& count) {
  count = 0;
  String current = "";
  int parenDepth = 0;
  bool inGroup = false;

  for (int i = 0; i < input.length() && count < MAX_STATEMENTS; i++) {
    char c = input.charAt(i);

    if (input.substring(i).startsWith("GROUP(") && !inGroup) {
      inGroup = true;
      parenDepth = 0;
    }

    if (c == '(' && inGroup) {
      parenDepth++;
    } else if (c == ')' && inGroup) {
      parenDepth--;
      if (parenDepth == 0) {
        inGroup = false;
      }
    }

    if (c == ';' && !inGroup) {
      current.trim();
      if (current.length() > 0) {
        statements[count] = current;
        count++;
      }
      current = "";
    } else {
      current += c;
    }
  }

  current.trim();
  if (current.length() > 0 && count < MAX_STATEMENTS) {
    statements[count] = current;
    count++;
  }
}

void PalletizerScriptParser::tokenizeStatementsWithCommandSupport(const String& input, String* statements, int& count) {
  count = 0;
  int pos = 0;

  while (pos < input.length() && count < MAX_STATEMENTS - 1) {
    while (pos < input.length() && (input.charAt(pos) == ' ' || input.charAt(pos) == '\t' || input.charAt(pos) == '\n' || input.charAt(pos) == '\r')) {
      pos++;
    }

    if (pos >= input.length()) break;

    String command = "";

    if (input.substring(pos).startsWith("GROUP(")) {
      pos += 6;
      int parenCount = 1;
      command = "GROUP(";

      while (pos < input.length() && parenCount > 0) {
        char c = input.charAt(pos);
        command += c;

        if (c == '(') {
          parenCount++;
        } else if (c == ')') {
          parenCount--;
        }
        pos++;
      }

      if (parenCount == 0) {
        statements[count] = command;
        count++;
      }
    } else {
      while (pos < input.length() && input.charAt(pos) != ';') {
        command += input.charAt(pos);
        pos++;
      }

      command.trim();
      if (command.length() > 0) {
        statements[count] = command;
        count++;
      }
    }

    while (pos < input.length() && input.charAt(pos) == ';') {
      pos++;
    }
  }
}

void PalletizerScriptParser::processSingleStatement(const String& statement) {
  String cleanStatement = statement;
  trimWhitespace(cleanStatement);

  if (cleanStatement.length() == 0) return;

  if (parsingMode) {
    queueCommand(cleanStatement);
    return;
  }

  if (cleanStatement.startsWith("SET(") || cleanStatement == "WAIT") {
    debugLog("INFO", "SYNC", "🔄 " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  } else if (cleanStatement == "DETECT") {
    debugLog("INFO", "DETECT", "🎯 " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  } else if (cleanStatement == "ZERO" || cleanStatement == "IDLE" || cleanStatement == "PLAY" || cleanStatement == "PAUSE" || cleanStatement == "STOP") {
    debugLog("INFO", "SYSTEM", "⚙️ " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  } else if (cleanStatement.startsWith("SPEED;")) {
    debugLog("INFO", "SPEED", "⚡ " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  } else if (cleanStatement.indexOf('(') != -1 && (cleanStatement.startsWith("X(") || cleanStatement.startsWith("Y(") || cleanStatement.startsWith("Z(") || cleanStatement.startsWith("T(") || cleanStatement.startsWith("G("))) {
    debugLog("INFO", "MOTION", "🎯 " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  } else if (cleanStatement.indexOf(',') != -1) {
    debugLog("INFO", "MULTI", "🎯 " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  } else if (cleanStatement.startsWith("GRIPPER;") || cleanStatement.startsWith("TOOL;")) {
    debugLog("INFO", "TOOL", "🔧 " + cleanStatement);
    palletizerMaster->processCommand(cleanStatement);
  }
}

int PalletizerScriptParser::findMatchingBrace(const String& script, int openPos) {
  if (openPos == -1 || openPos >= script.length()) return -1;

  int braceCount = 1;
  for (int i = openPos + 1; i < script.length(); i++) {
    if (script.charAt(i) == '{') {
      braceCount++;
    } else if (script.charAt(i) == '}') {
      braceCount--;
      if (braceCount == 0) {
        return i;
      }
    }
  }
  return -1;
}

void PalletizerScriptParser::trimWhitespace(String& str) {
  str.trim();

  while (str.length() > 0 && (str.charAt(0) == ' ' || str.charAt(0) == '\t' || str.charAt(0) == '\n' || str.charAt(0) == '\r')) {
    str = str.substring(1);
  }

  while (str.length() > 0 && (str.charAt(str.length() - 1) == ' ' || str.charAt(str.length() - 1) == '\t' || str.charAt(str.length() - 1) == '\n' || str.charAt(str.length() - 1) == '\r')) {
    str = str.substring(0, str.length() - 1);
  }
}

bool PalletizerScriptParser::isValidFunctionName(const String& name) {
  if (name.length() == 0) return false;

  for (int i = 0; i < name.length(); i++) {
    char c = name.charAt(i);
    if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_')) {
      return false;
    }
  }
  return true;
}

bool PalletizerScriptParser::functionExists(const String& name) {
  for (int i = 0; i < functionCount; i++) {
    if (userFunctions[i].name.equals(name)) {
      return true;
    }
  }
  return false;
}

void PalletizerScriptParser::debugLog(const String& level, const String& source, const String& message) {
#if WEB_DEBUG == 1 || SERIAL_DEBUG == 1
  if (debugEnabled) {
    DEBUG_MGR.println(source, message);
  }
#endif
}

int PalletizerScriptParser::countStatementsInBody(const String& body) {
  String statements[MAX_STATEMENTS];
  int count = 0;
  tokenizeStatementsWithCommandSupport(body, statements, count);
  return count;
}

bool PalletizerScriptParser::isNumeric(const String& str) {
  if (str.length() == 0) return false;

  for (int i = 0; i < str.length(); i++) {
    char c = str.charAt(i);
    if (!(c >= '0' && c <= '9')) {
      return false;
    }
  }
  return true;
}

bool PalletizerScriptParser::isCompleteSpeedCommand(const String& command) {
  if (!command.startsWith("SPEED;")) return false;

  int semicolonCount = 0;
  for (int i = 0; i < command.length(); i++) {
    if (command.charAt(i) == ';') {
      semicolonCount++;
    }
  }

  if (semicolonCount == 2) {
    String afterFirst = command.substring(6);
    int nextSemicolon = afterFirst.indexOf(';');
    if (nextSemicolon != -1) {
      String param = afterFirst.substring(0, nextSemicolon);
      param.trim();
      return isNumeric(param);
    }
  } else if (semicolonCount == 3) {
    String afterFirst = command.substring(6);
    int nextSemicolon = afterFirst.indexOf(';');
    if (nextSemicolon != -1) {
      String param = afterFirst.substring(0, nextSemicolon);
      param.trim();
      return !isNumeric(param) && param.length() == 1;
    }
  }

  return false;
}