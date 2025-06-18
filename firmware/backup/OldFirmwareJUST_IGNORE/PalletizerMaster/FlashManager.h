#ifndef FLASH_MANAGER_H
#define FLASH_MANAGER_H

#include "Arduino.h"
#include "FS.h"
#include "LittleFS.h"

class FlashManager {
public:
  FlashManager();
  bool begin();
  bool storeCommands(const String& commands);
  String readCommand(int lineNumber);
  int getTotalLines();
  bool clearCommands();
  bool hasCommands();
  String getStorageInfo();

private:
  const String commandsPath = "/commands.txt";
  const String indexPath = "/cmd_index.txt";

  int totalLines;
  bool initialized;

  bool updateIndex();
  bool readIndex();
  void ensureFileIsClosed(File& file);
};

#endif