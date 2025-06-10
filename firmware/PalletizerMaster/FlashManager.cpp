#include "FlashManager.h"

FlashManager::FlashManager()
  : totalLines(0), initialized(false) {
}

bool FlashManager::begin() {
  if (!LittleFS.begin(true)) {
    return false;
  }

  initialized = true;
  readIndex();
  return true;
}

bool FlashManager::storeCommands(const String& commands) {
  if (!initialized) return false;

  if (LittleFS.exists(commandsPath)) {
    LittleFS.remove(commandsPath);
  }

  File file = LittleFS.open(commandsPath, "w");
  if (!file) {
    return false;
  }

  file.print(commands);
  ensureFileIsClosed(file);

  totalLines = 0;
  String line;
  file = LittleFS.open(commandsPath, "r");
  if (file) {
    while (file.available()) {
      line = file.readStringUntil('\n');
      line.trim();
      if (line.length() > 0) {
        totalLines++;
      }
    }
    ensureFileIsClosed(file);
  }

  updateIndex();
  return true;
}

String FlashManager::readCommand(int lineNumber) {
  if (!initialized || lineNumber < 0 || lineNumber >= totalLines) {
    return "";
  }

  File file = LittleFS.open(commandsPath, "r");
  if (!file) {
    return "";
  }

  String command = "";
  int currentLine = 0;

  while (file.available() && currentLine <= lineNumber) {
    String line = file.readStringUntil('\n');
    line.trim();

    if (line.length() > 0) {
      if (currentLine == lineNumber) {
        command = line;
        break;
      }
      currentLine++;
    }
  }

  ensureFileIsClosed(file);
  return command;
}

int FlashManager::getTotalLines() {
  return totalLines;
}

bool FlashManager::clearCommands() {
  if (!initialized) return false;

  if (LittleFS.exists(commandsPath)) {
    LittleFS.remove(commandsPath);
  }

  totalLines = 0;
  updateIndex();
  return true;
}

bool FlashManager::hasCommands() {
  return initialized && totalLines > 0;
}

String FlashManager::getStorageInfo() {
  if (!initialized) return "Not initialized";

  String info = "Commands: " + String(totalLines) + " lines";

  if (LittleFS.exists(commandsPath)) {
    File file = LittleFS.open(commandsPath, "r");
    if (file) {
      size_t size = file.size();
      ensureFileIsClosed(file);
      info += ", Size: " + String(size) + " bytes";
    }
  }

  return info;
}

bool FlashManager::updateIndex() {
  File indexFile = LittleFS.open(indexPath, "w");
  if (!indexFile) {
    return false;
  }

  indexFile.println(String(totalLines));
  ensureFileIsClosed(indexFile);
  return true;
}

bool FlashManager::readIndex() {
  if (!LittleFS.exists(indexPath)) {
    totalLines = 0;
    return true;
  }

  File indexFile = LittleFS.open(indexPath, "r");
  if (!indexFile) {
    totalLines = 0;
    return false;
  }

  String lineStr = indexFile.readStringUntil('\n');
  ensureFileIsClosed(indexFile);

  totalLines = lineStr.toInt();
  return true;
}

void FlashManager::ensureFileIsClosed(File& file) {
  if (file) {
    file.close();
  }
}