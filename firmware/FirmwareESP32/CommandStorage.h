#ifndef COMMAND_STORAGE_H
#define COMMAND_STORAGE_H

#include <LittleFS.h>
#include <ArduinoJson.h>

class CommandStorage {
private:
  String currentScriptId;

public:
  CommandStorage();
  bool saveScript(const String& scriptId, JsonArray& commands);
  bool saveScriptText(const String& scriptText);
  bool loadScript(const String& scriptId);
  String getCommand(int index);
  int getCommandCount();
  bool hasScript();
  String getCurrentScriptId();
  void clearScript();
};

#endif