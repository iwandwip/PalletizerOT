#include "QueueManager.h"

QueueManager::QueueManager() {
}

bool QueueManager::begin() {
  if (!initFileSystem()) {
    return false;
  }
  loadTimeoutConfig();
  return true;
}

void QueueManager::addToQueue(const String& command) {
  static unsigned long lastAddTime = 0;
  static String lastAddCommand = "";

  unsigned long currentTime = millis();
  if (currentTime - lastAddTime < 50 && command == lastAddCommand) {
    return;
  }

  lastAddTime = currentTime;
  lastAddCommand = command;

  if (appendToQueueFile(command)) {
    queueSize++;
    writeQueueIndex();
    executionInfo.totalCommands++;
  }
}

String QueueManager::getFromQueue() {
  if (isQueueEmpty()) {
    return "";
  }

  String command = readQueueCommandAt(queueHead);
  queueHead++;
  queueSize--;
  writeQueueIndex();

  return command;
}

bool QueueManager::isQueueEmpty() {
  return queueSize == 0;
}

bool QueueManager::isQueueFull() {
  return queueSize >= MAX_QUEUE_SIZE;
}

void QueueManager::clearQueue() {
  if (LittleFS.exists(queueFilePath)) {
    File testFile = LittleFS.open(queueFilePath, "r");
    if (testFile) {
      ensureFileIsClosed(testFile);
      delay(10);
    }

    bool removed = LittleFS.remove(queueFilePath);
    if (!removed) {
    }
  }

  File queueFile = LittleFS.open(queueFilePath, "w");
  if (queueFile) {
    ensureFileIsClosed(queueFile);
  }

  queueHead = 0;
  queueSize = 0;
  writeQueueIndex();

  executionInfo.totalCommands = 0;
  executionInfo.currentCommand = 0;
}

int QueueManager::getQueueSize() {
  return queueSize;
}

int QueueManager::getQueueCount() {
  File queueFile = LittleFS.open(queueFilePath, "r");
  if (!queueFile) {
    return 0;
  }

  int count = 0;
  while (queueFile.available()) {
    queueFile.readStringUntil('\n');
    count++;
  }

  ensureFileIsClosed(queueFile);
  return count;
}

void QueueManager::loadCommandsFromFile() {
  if (!LittleFS.exists(queueFilePath)) {
    return;
  }

  File file = LittleFS.open(queueFilePath, "r");
  if (!file) {
    return;
  }

  String allCommands = file.readString();
  ensureFileIsClosed(file);

  clearQueue();

  if (allCommands.length() > 0) {
    if (isScriptCommand(allCommands)) {
      addToQueue(allCommands);
    } else {
      processCommandsBatch(allCommands);
    }
  }
}

void QueueManager::processCommandsBatch(const String& commands) {
  int startPos = 0;
  int nextPos = commands.indexOf("NEXT", startPos);

  while (startPos < commands.length()) {
    if (nextPos == -1) {
      String command = commands.substring(startPos);
      command.trim();
      if (command.length() > 0) {
        addToQueue(command);
      }
      break;
    } else {
      String command = commands.substring(startPos, nextPos);
      command.trim();
      if (command.length() > 0) {
        addToQueue(command);
      }
      startPos = nextPos + 4;
      nextPos = commands.indexOf("NEXT", startPos);
    }
  }
}

bool QueueManager::shouldClearQueue(const String& data) {
  bool isCoordinateCmd = data.indexOf('(') != -1;
  return isCoordinateCmd && QUEUE_OPERATION_MODE == QUEUE_MODE_OVERWRITE;
}

void QueueManager::setTimeoutConfig(const TimeoutConfig& config) {
  timeoutConfig = config;
  if (config.saveToFile) {
    saveTimeoutConfig();
  }
}

QueueManager::TimeoutConfig QueueManager::getTimeoutConfig() {
  return timeoutConfig;
}

bool QueueManager::saveTimeoutConfig() {
  File configFile = LittleFS.open(timeoutConfigPath, "w");
  if (!configFile) {
    return false;
  }

  String jsonConfig = "{";
  jsonConfig += "\"maxWaitTime\":" + String(timeoutConfig.maxWaitTime) + ",";
  jsonConfig += "\"strategy\":" + String(timeoutConfig.strategy) + ",";
  jsonConfig += "\"maxTimeoutWarning\":" + String(timeoutConfig.maxTimeoutWarning) + ",";
  jsonConfig += "\"autoRetryCount\":" + String(timeoutConfig.autoRetryCount) + ",";
  jsonConfig += "\"saveToFile\":" + String(timeoutConfig.saveToFile ? "true" : "false");
  jsonConfig += "}";

  configFile.print(jsonConfig);
  ensureFileIsClosed(configFile);
  return true;
}

bool QueueManager::loadTimeoutConfig() {
  if (!LittleFS.exists(timeoutConfigPath)) {
    return false;
  }

  File configFile = LittleFS.open(timeoutConfigPath, "r");
  if (!configFile) {
    return false;
  }

  String jsonConfig = configFile.readString();
  ensureFileIsClosed(configFile);

  int maxWaitTimePos = jsonConfig.indexOf("\"maxWaitTime\":");
  int strategyPos = jsonConfig.indexOf("\"strategy\":");
  int maxTimeoutWarningPos = jsonConfig.indexOf("\"maxTimeoutWarning\":");
  int autoRetryCountPos = jsonConfig.indexOf("\"autoRetryCount\":");
  int saveToFilePos = jsonConfig.indexOf("\"saveToFile\":");

  if (maxWaitTimePos != -1) {
    int valueStart = jsonConfig.indexOf(":", maxWaitTimePos) + 1;
    int valueEnd = jsonConfig.indexOf(",", valueStart);
    if (valueEnd == -1) valueEnd = jsonConfig.indexOf("}", valueStart);
    timeoutConfig.maxWaitTime = jsonConfig.substring(valueStart, valueEnd).toInt();
  }

  if (strategyPos != -1) {
    int valueStart = jsonConfig.indexOf(":", strategyPos) + 1;
    int valueEnd = jsonConfig.indexOf(",", valueStart);
    if (valueEnd == -1) valueEnd = jsonConfig.indexOf("}", valueStart);
    timeoutConfig.strategy = (WaitTimeoutStrategy)jsonConfig.substring(valueStart, valueEnd).toInt();
  }

  if (maxTimeoutWarningPos != -1) {
    int valueStart = jsonConfig.indexOf(":", maxTimeoutWarningPos) + 1;
    int valueEnd = jsonConfig.indexOf(",", valueStart);
    if (valueEnd == -1) valueEnd = jsonConfig.indexOf("}", valueStart);
    timeoutConfig.maxTimeoutWarning = jsonConfig.substring(valueStart, valueEnd).toInt();
  }

  if (autoRetryCountPos != -1) {
    int valueStart = jsonConfig.indexOf(":", autoRetryCountPos) + 1;
    int valueEnd = jsonConfig.indexOf(",", valueStart);
    if (valueEnd == -1) valueEnd = jsonConfig.indexOf("}", valueStart);
    timeoutConfig.autoRetryCount = jsonConfig.substring(valueStart, valueEnd).toInt();
  }

  if (saveToFilePos != -1) {
    int valueStart = jsonConfig.indexOf(":", saveToFilePos) + 1;
    int valueEnd = jsonConfig.indexOf("}", valueStart);
    String value = jsonConfig.substring(valueStart, valueEnd);
    value.trim();
    timeoutConfig.saveToFile = (value == "true");
  }

  return true;
}

QueueManager::ExecutionInfo& QueueManager::getExecutionInfo() {
  return executionInfo;
}

void QueueManager::updateExecutionInfo(bool start) {
  if (start) {
    executionInfo.isExecuting = true;
    executionInfo.executionStartTime = millis();
    executionInfo.currentCommand = 0;
    executionInfo.currentFunction = "";
    executionInfo.functionDepth = 0;
  } else {
    executionInfo.isExecuting = false;
  }
}

void QueueManager::resetExecutionInfo() {
  executionInfo.totalCommands = 0;
  executionInfo.currentCommand = 0;
  executionInfo.currentFunction = "";
  executionInfo.functionDepth = 0;
  executionInfo.executionStartTime = 0;
  executionInfo.isExecuting = false;
}

bool QueueManager::initFileSystem() {
  if (!LittleFS.begin(true)) {
    return false;
  }

  if (!LittleFS.exists(queueIndexPath)) {
    File indexFile = LittleFS.open(queueIndexPath, "w");
    if (!indexFile) {
      return false;
    }
    indexFile.println("0");
    indexFile.println("0");
    ensureFileIsClosed(indexFile);
  }

  readQueueIndex();
  return true;
}

bool QueueManager::writeQueueIndex() {
  File indexFile = LittleFS.open(queueIndexPath, "w");
  if (!indexFile) {
    return false;
  }
  indexFile.println(String(queueHead));
  indexFile.println(String(queueSize));
  ensureFileIsClosed(indexFile);
  return true;
}

bool QueueManager::readQueueIndex() {
  File indexFile = LittleFS.open(queueIndexPath, "r");
  if (!indexFile) {
    return false;
  }

  String headStr = indexFile.readStringUntil('\n');
  String sizeStr = indexFile.readStringUntil('\n');
  ensureFileIsClosed(indexFile);

  queueHead = headStr.toInt();
  queueSize = sizeStr.toInt();
  return true;
}

bool QueueManager::appendToQueueFile(const String& command) {
  File queueFile = LittleFS.open(queueFilePath, "a");
  if (!queueFile) {
    return false;
  }
  queueFile.println(command);
  ensureFileIsClosed(queueFile);
  return true;
}

String QueueManager::readQueueCommandAt(int index) {
  File queueFile = LittleFS.open(queueFilePath, "r");
  if (!queueFile) {
    return "";
  }

  String command = "";
  int currentLine = 0;

  while (queueFile.available()) {
    String line = queueFile.readStringUntil('\n');
    if (currentLine == index) {
      command = line;
      break;
    }
    currentLine++;
  }

  ensureFileIsClosed(queueFile);
  return command;
}

void QueueManager::ensureFileIsClosed(File& file) {
  if (file) {
    file.close();
  }
}

bool QueueManager::ensureFileExists(const String& path) {
  if (!LittleFS.exists(path)) {
    File file = LittleFS.open(path, "w");
    if (file) {
      file.close();
      return true;
    }
    return false;
  }
  return true;
}

bool QueueManager::isScriptCommand(const String& command) {
  String trimmed = command;
  trimmed.trim();

  if (trimmed.indexOf("FUNC(") != -1 || trimmed.indexOf("CALL(") != -1) {
    return true;
  }

  if (trimmed.indexOf('{') != -1 && trimmed.indexOf('}') != -1) {
    return true;
  }

  int semicolonCount = 0;
  for (int i = 0; i < trimmed.length(); i++) {
    if (trimmed.charAt(i) == ';') {
      semicolonCount++;
    }
  }

  if (semicolonCount > 1) {
    return true;
  }

  return false;
}