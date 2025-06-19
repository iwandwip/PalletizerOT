#include "CommandStorage.h"

CommandStorage::CommandStorage() {
  currentScriptId = "";
}

bool CommandStorage::saveScript(const String& scriptId, JsonArray& commands) {
  String filename = "/script_" + scriptId + ".json";
  
  File file = LittleFS.open(filename, "w");
  if (!file) {
    Serial.println("Failed to open script file for writing");
    return false;
  }
  
  DynamicJsonDocument doc(8192);
  doc["scriptId"] = scriptId;
  doc["commandCount"] = commands.size();
  doc["commands"] = commands;
  
  if (serializeJson(doc, file) == 0) {
    Serial.println("Failed to write script to file");
    file.close();
    return false;
  }
  
  file.close();
  currentScriptId = scriptId;
  
  Serial.println("Script saved: " + filename);
  Serial.println("Commands: " + String(commands.size()));
  
  return true;
}

bool CommandStorage::loadScript(const String& scriptId) {
  String filename = "/script_" + scriptId + ".json";
  
  File file = LittleFS.open(filename, "r");
  if (!file) {
    Serial.println("Failed to open script file for reading");
    return false;
  }
  
  currentScriptId = scriptId;
  file.close();
  
  Serial.println("Script loaded: " + filename);
  return true;
}

String CommandStorage::getCommand(int index) {
  if (currentScriptId == "") {
    return "";
  }
  
  String filename = "/script_" + currentScriptId + ".json";
  File file = LittleFS.open(filename, "r");
  if (!file) {
    return "";
  }
  
  DynamicJsonDocument doc(8192);
  deserializeJson(doc, file);
  file.close();
  
  JsonArray commands = doc["commands"];
  if (index >= 0 && index < commands.size()) {
    return commands[index].as<String>();
  }
  
  return "";
}

int CommandStorage::getCommandCount() {
  if (currentScriptId == "") {
    return 0;
  }
  
  String filename = "/script_" + currentScriptId + ".json";
  File file = LittleFS.open(filename, "r");
  if (!file) {
    return 0;
  }
  
  DynamicJsonDocument doc(512);
  deserializeJson(doc, file);
  file.close();
  
  return doc["commandCount"].as<int>();
}

bool CommandStorage::hasScript() {
  return currentScriptId != "";
}

String CommandStorage::getCurrentScriptId() {
  return currentScriptId;
}

void CommandStorage::clearScript() {
  currentScriptId = "";
}