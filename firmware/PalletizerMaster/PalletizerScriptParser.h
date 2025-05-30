#ifndef PALLETIZER_SCRIPT_PARSER_H
#define PALLETIZER_SCRIPT_PARSER_H

#include "Arduino.h"

class PalletizerMaster;

class PalletizerScriptParser {
public:
  struct Function {
    String name;
    String body;
  };

  PalletizerScriptParser(PalletizerMaster* master);
  void parseScript(const String& script);
  void executeStatement(const String& statement);
  bool callFunction(const String& funcName);
  void clearFunctions();
  int getFunctionCount();
  String getFunctionName(int index);
  void setYieldInterval(int interval);
  int getYieldInterval();
  void resetCommandCounter();
  int getCommandCounter();
  void setDebugEnabled(bool enabled);
  int getCommandCountInFunction(const String& funcName);
  void printParsingInfo();
  bool isGroupCommand(const String& statement);
  String extractGroupContent(const String& groupStatement);
  void processGroupCommand(const String& groupContent);
  void queueCommand(const String& command);
  void setParsingMode(bool mode);

private:
  static const int MAX_FUNCTIONS = 20;

  PalletizerMaster* palletizerMaster;
  Function userFunctions[MAX_FUNCTIONS];
  int functionCount;
  int commandCounter;
  bool debugEnabled;
  bool parsingMode;

  void parseFunction(const String& script, int startPos);
  String extractFunctionBody(const String& script, int startPos);
  String extractFunctionName(const String& funcDef);
  void tokenizeStatements(const String& input, String* statements, int& count);
  void tokenizeStatementsWithGroupSupport(const String& input, String* statements, int& count);
  void processSingleStatement(const String& statement);
  int findMatchingBrace(const String& script, int openPos);
  void trimWhitespace(String& str);
  bool isValidFunctionName(const String& name);
  bool functionExists(const String& name);
  void debugLog(const String& level, const String& source, const String& message);
  int countStatementsInBody(const String& body);
};

#endif