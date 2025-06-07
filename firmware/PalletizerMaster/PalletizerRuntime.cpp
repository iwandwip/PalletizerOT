#include "PalletizerRuntime.h"
#include "PalletizerScriptParser.h"
#include "DebugManager.h"

#define QUEUE_MODE_APPEND 0
#define QUEUE_MODE_OVERWRITE 1
#define QUEUE_OPERATION_MODE QUEUE_MODE_APPEND

PalletizerRuntime::PalletizerRuntime(PalletizerProtocol* protocol)
  : protocol(protocol), scriptParser(nullptr), systemStateCallback(nullptr), groupCommandCallback(nullptr),
    queueSize(0), queueHead(0), syncSetPin(SYNC_SET_PIN), syncWaitPin(SYNC_WAIT_PIN),
    waitingForSync(false), waitStartTime(0), waitStartTimeForStats(0),
    waitingForDetect(false), detectStartTime(0), debounceStartTime(0), inDebouncePhase(false),
    executionInfoActive(false), progressLoggingActive(false), systemRunning(false), scriptProcessing(false),
    singleCommandExecuting(false) {

  for (int i = 0; i < 5; i++) {
    currentPinStates[i] = true;
    lastPinStates[i] = true;
  }
}

void PalletizerRuntime::begin() {
  initSyncPins();
  initDetectPins();

  if (!initFileSystem()) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Failed to initialize file system");
  } else {
    DEBUG_SERIAL_PRINTLN("RUNTIME: File system initialized");
    clearQueue();
    loadTimeoutConfig();
  }

  DEBUG_SERIAL_PRINTLN("RUNTIME: Execution engine initialized");
}

void PalletizerRuntime::update() {
  if (waitingForSync) {
    if (digitalRead(syncWaitPin) == HIGH) {
      DEBUG_MGR.sync("WAIT", "Sync signal received - continuing execution");
      waitingForSync = false;
      updateTimeoutStats(true);

      if (!isQueueEmpty() && systemRunning) {
        processNextCommand();
      }
    } else if (checkSyncTimeout()) {
      handleWaitTimeout();
    }
    return;
  }

  if (waitingForDetect) {
    if (checkAllPinsLow()) {
      if (!inDebouncePhase) {
        inDebouncePhase = true;
        debounceStartTime = millis();
        DEBUG_MGR.info("DETECT", "🔍 All pins LOW detected, starting debounce (" + String(DETECT_DEBOUNCE_MS) + "ms)");
      } else if (millis() - debounceStartTime >= DETECT_DEBOUNCE_MS) {
        DEBUG_MGR.info("DETECT", "✅ Detection confirmed - continuing execution");
        resetDetectionState();

        if (!isQueueEmpty() && systemRunning) {
          processNextCommand();
        }
      }
    } else {
      if (inDebouncePhase) {
        DEBUG_MGR.warning("DETECT", "🔄 Pin went HIGH during debounce - resetting detection");
        inDebouncePhase = false;
      }
    }

    if (checkDetectTimeout()) {
      DEBUG_MGR.warning("DETECT", "⏰ Detection timeout after " + String(DETECT_TIMEOUT_MS) + "ms - skipping");
      resetDetectionState();

      if (!isQueueEmpty() && systemRunning) {
        processNextCommand();
      }
    }
    return;
  }
}

void PalletizerRuntime::addCommandToQueue(const String& command) {
  static unsigned long lastAddTime = 0;
  static String lastAddCommand = "";

  unsigned long currentTime = millis();
  if (currentTime - lastAddTime < 50 && command == lastAddCommand) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Ignoring duplicate queue add: " + command);
    return;
  }

  lastAddTime = currentTime;
  lastAddCommand = command;

  if (appendToQueueFile(command)) {
    queueSize++;
    writeQueueIndex();
    DEBUG_SERIAL_PRINTLN("RUNTIME: Added command to queue: " + command + " (Queue size: " + String(queueSize) + ")");
    executionInfo.totalCommands++;
  } else {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Failed to add command to queue: " + command);
  }
}

String PalletizerRuntime::getFromQueue() {
  if (isQueueEmpty()) {
    return "";
  }

  String command = readQueueCommandAt(queueHead);
  queueHead++;
  queueSize--;
  writeQueueIndex();

  DEBUG_SERIAL_PRINTLN("RUNTIME: Processing command from queue: " + command + " (Queue size: " + String(queueSize) + ")");
  return command;
}

bool PalletizerRuntime::isQueueEmpty() {
  return queueSize == 0;
}

bool PalletizerRuntime::isQueueFull() {
  return queueSize >= 100;
}

void PalletizerRuntime::clearQueue() {
  if (LittleFS.exists(queueFilePath)) {
    File testFile = LittleFS.open(queueFilePath, "r");
    if (testFile) {
      ensureFileIsClosed(testFile);
      delay(10);
    }

    bool removed = LittleFS.remove(queueFilePath);
    if (!removed) {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Warning - could not remove queue file");
    }
  }

  File queueFile = LittleFS.open(queueFilePath, "w");
  if (queueFile) {
    ensureFileIsClosed(queueFile);
  } else {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Failed to create new queue file");
  }

  queueHead = 0;
  queueSize = 0;
  writeQueueIndex();

  executionInfo.totalCommands = 0;
  executionInfo.currentCommand = 0;

  DEBUG_SERIAL_PRINTLN("RUNTIME: Command queue cleared");
}

void PalletizerRuntime::processNextCommand() {
  static bool processingCommand = false;

  if (processingCommand) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Already processing command, skipping duplicate");
    return;
  }

  if (isQueueEmpty()) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Command queue is empty");
    return;
  }

  if (!systemRunning) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Not processing command because system is not running");
    return;
  }

  processingCommand = true;
  String command = getFromQueue();
  executionInfo.currentCommand++;

  DEBUG_MGR.sequence("EXECUTOR", executionInfo.currentCommand, executionInfo.totalCommands, "Executing: " + command);
  logExecutionProgress();

  String trimmedCommand = command;
  trimmedCommand.trim();
  String upperData = trimmedCommand;
  upperData.toUpperCase();

  if (trimmedCommand.startsWith("GROUP(") && trimmedCommand.indexOf(")") != -1) {
    int startPos = 6;
    int endPos = -1;
    int parenCount = 1;

    for (int i = startPos; i < trimmedCommand.length() && parenCount > 0; i++) {
      if (trimmedCommand.charAt(i) == '(') {
        parenCount++;
      } else if (trimmedCommand.charAt(i) == ')') {
        parenCount--;
        if (parenCount == 0) {
          endPos = i;
        }
      }
    }

    if (endPos > startPos) {
      String groupCommands = trimmedCommand.substring(startPos, endPos);
      DEBUG_SERIAL_PRINTLN("RUNTIME: GROUP command detected - notifying Master");
      if (groupCommandCallback) {
        groupCommandCallback(groupCommands);
      } else {
        DEBUG_SERIAL_PRINTLN("RUNTIME: WARNING - No GROUP callback registered!");
        protocol->sendGroupCommands(groupCommands);
      }
      processingCommand = false;
      return;
    }
  }

  if (trimmedCommand.startsWith("GROUP;")) {
    String groupCommands = trimmedCommand.substring(6);
    DEBUG_SERIAL_PRINTLN("RUNTIME: GROUP; command detected - notifying Master");
    if (groupCommandCallback) {
      groupCommandCallback(groupCommands);
    } else {
      DEBUG_SERIAL_PRINTLN("RUNTIME: WARNING - No GROUP callback registered!");
      protocol->sendGroupCommands(groupCommands);
    }
    processingCommand = false;
    return;
  }

  if (upperData.startsWith("CALL(")) {
    processScriptCommand(trimmedCommand);
  } else if (upperData == "ZERO") {
    setSingleCommandFlags();
    protocol->sendCommandToAllSlaves(PalletizerProtocol::CMD_ZERO);
  } else if (upperData.startsWith("SPEED;")) {
    protocol->sendSpeedCommand(trimmedCommand);
  } else if (upperData.startsWith("SET(")) {
    processSetCommand(trimmedCommand);
  } else if (upperData == "WAIT") {
    processWaitCommand();
  } else if (upperData == "DETECT") {
    processDetectCommand();
  } else if (isCoordinateCommand(trimmedCommand)) {
    setSingleCommandFlags();
    protocol->sendCoordinateData(trimmedCommand, PalletizerProtocol::CMD_RUN);
  } else if (isInvalidSpeedFragment(trimmedCommand)) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Skipping invalid speed fragment: " + trimmedCommand);
  } else if (isRealScriptCommand(trimmedCommand)) {
    processScriptCommand(trimmedCommand);
  } else {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Unknown command format: " + trimmedCommand);
  }

  processingCommand = false;
}

void PalletizerRuntime::setSingleCommandFlags() {
  singleCommandExecuting = true;
  DEBUG_SERIAL_PRINTLN("RUNTIME: Single command started - awaiting completion");
}

void PalletizerRuntime::notifySingleCommandComplete() {
  if (singleCommandExecuting) {
    singleCommandExecuting = false;
    DEBUG_SERIAL_PRINTLN("RUNTIME: Single command completed");

    if (!isQueueEmpty() && systemRunning) {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Processing next command from queue");
      processNextCommand();
    } else if (isQueueEmpty() && systemRunning) {
      PalletizerRuntime::ExecutionInfo execInfo = getExecutionInfo();
      if (execInfo.isExecuting) {
        updateExecutionInfo(false);
      }
      if (systemStateCallback) {
        systemStateCallback("IDLE");
      }
    }
  }
}

bool PalletizerRuntime::isSingleCommandExecuting() {
  return singleCommandExecuting;
}

void PalletizerRuntime::processScriptCommand(const String& script) {
  static bool scriptInProgress = false;
  if (scriptInProgress) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Script already processing, ignoring duplicate");
    return;
  }

  scriptInProgress = true;
  DEBUG_SERIAL_PRINTLN("RUNTIME: Processing script command");

  if (scriptParser) {
    scriptProcessing = true;
    scriptParser->parseScript(script);
    scriptProcessing = false;
  } else {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Script parser not available");
  }

  scriptInProgress = false;
}

void PalletizerRuntime::processInlineCommands(const String& commands) {
  String statements[50];
  int statementCount = 0;

  parseInlineCommands(commands, statements, statementCount);

  for (int i = 0; i < statementCount; i++) {
    statements[i].trim();
    if (statements[i].length() > 0) {
      addCommandToQueue(statements[i]);
    }
  }
}

void PalletizerRuntime::loadCommandsFromFile() {
  if (!LittleFS.exists(queueFilePath)) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: No saved commands found");
    return;
  }

  File file = LittleFS.open(queueFilePath, "r");
  if (!file) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Failed to open queue file");
    return;
  }

  DEBUG_SERIAL_PRINTLN("RUNTIME: Loading commands from file...");

  String allCommands = file.readString();
  ensureFileIsClosed(file);

  clearQueue();

  if (allCommands.length() > 0) {
    if (isRealScriptCommand(allCommands)) {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Detected script format - processing directly");
      processScriptCommand(allCommands);
    } else {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Processing as inline commands");
      processInlineCommands(allCommands);
    }
    DEBUG_SERIAL_PRINTLN("RUNTIME: Commands loaded from file successfully");
    DEBUG_MGR.info("EXECUTOR", "Total Commands in Queue: " + String(executionInfo.totalCommands));
  } else {
    DEBUG_SERIAL_PRINTLN("RUNTIME: No valid commands found in file");
  }
}

void PalletizerRuntime::processWaitCommand() {
  DEBUG_MGR.sync("WAIT", "Waiting for sync signal HIGH");
  waitingForSync = true;
  waitStartTime = millis();
  waitStartTimeForStats = millis();
}

void PalletizerRuntime::processDetectCommand() {
  DEBUG_MGR.info("DETECT", "🎯 DETECT command received");
  String pinStatus = "⏳ Monitoring pins [";
  for (int i = 0; i < DETECT_PIN_COUNT; i++) {
    if (i > 0) pinStatus += ", ";
    pinStatus += String(DETECT_PINS[i]);
  }
  pinStatus += "]";
  DEBUG_MGR.info("DETECT", pinStatus);

  waitingForDetect = true;
  detectStartTime = millis();
  inDebouncePhase = false;
}

void PalletizerRuntime::processSetCommand(const String& data) {
  int startPos = data.indexOf('(');
  int endPos = data.indexOf(')');

  if (startPos != -1 && endPos != -1) {
    String value = data.substring(startPos + 1, endPos);
    int setValue = value.toInt();

    if (setValue == 1) {
      digitalWrite(syncSetPin, HIGH);
      DEBUG_MGR.sync("SET(1)", "Sync signal HIGH");
    } else if (setValue == 0) {
      digitalWrite(syncSetPin, LOW);
      DEBUG_MGR.sync("SET(0)", "Sync signal LOW");
    } else {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Invalid SET value: " + value);
    }
  }
}

bool PalletizerRuntime::canProcessNextCommand() {
  return !isQueueFull() && !waitingForSync && !waitingForDetect && !scriptProcessing && !singleCommandExecuting;
}

void PalletizerRuntime::setSystemRunning(bool running) {
  systemRunning = running;
}

bool PalletizerRuntime::isSystemRunning() {
  return systemRunning;
}

PalletizerRuntime::ExecutionInfo PalletizerRuntime::getExecutionInfo() {
  return executionInfo;
}

void PalletizerRuntime::updateExecutionInfo(bool start) {
  static bool executionActive = false;

  if (start) {
    if (executionActive || executionInfoActive) {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Execution already active, ignoring duplicate start");
      return;
    }

    executionActive = true;
    executionInfoActive = true;
    executionInfo.isExecuting = true;
    executionInfo.executionStartTime = millis();
    executionInfo.currentCommand = 0;
    executionInfo.currentFunction = "";
    executionInfo.functionDepth = 0;

    DEBUG_MGR.info("EXECUTOR", "▶️ EXECUTION STARTED");
  } else {
    if (!executionActive || !executionInfoActive) {
      DEBUG_SERIAL_PRINTLN("RUNTIME: Execution not active, ignoring duplicate end");
      return;
    }

    executionActive = false;
    executionInfoActive = false;
    executionInfo.isExecuting = false;
    unsigned long totalTime = millis() - executionInfo.executionStartTime;

    DEBUG_MGR.separator();
    DEBUG_MGR.info("PERFORMANCE", "📊 Execution Summary:");
    DEBUG_MGR.info("PERFORMANCE", "├─ Total Time: " + String(totalTime / 1000) + "s");
    DEBUG_MGR.info("PERFORMANCE", "├─ Commands: " + String(executionInfo.currentCommand) + "/" + String(executionInfo.totalCommands) + " (100%)");
    DEBUG_MGR.info("PERFORMANCE", "├─ Success Rate: " + String(getTimeoutSuccessRate(), 1) + "%");
    DEBUG_MGR.info("PERFORMANCE", "└─ Avg Command Time: " + String(totalTime / executionInfo.totalCommands) + "ms");
    DEBUG_MGR.separator();
  }
}

void PalletizerRuntime::setTimeoutConfig(const TimeoutConfig& config) {
  timeoutConfig = config;
  if (config.saveToFile) {
    saveTimeoutConfig();
  }
  DEBUG_SERIAL_PRINTLN("RUNTIME: Timeout config updated - timeout:" + String(config.maxWaitTime) + "ms strategy:" + String(config.strategy));
}

PalletizerRuntime::TimeoutConfig PalletizerRuntime::getTimeoutConfig() {
  return timeoutConfig;
}

PalletizerRuntime::TimeoutStats PalletizerRuntime::getTimeoutStats() {
  return timeoutStats;
}

void PalletizerRuntime::clearTimeoutStats() {
  timeoutStats.totalTimeouts = 0;
  timeoutStats.successfulWaits = 0;
  timeoutStats.lastTimeoutTime = 0;
  timeoutStats.totalWaitTime = 0;
  timeoutStats.currentRetryCount = 0;
  DEBUG_SERIAL_PRINTLN("RUNTIME: Timeout statistics cleared");
}

float PalletizerRuntime::getTimeoutSuccessRate() {
  int totalAttempts = timeoutStats.totalTimeouts + timeoutStats.successfulWaits;
  if (totalAttempts == 0) return 100.0;
  return (float(timeoutStats.successfulWaits) / float(totalAttempts)) * 100.0;
}

bool PalletizerRuntime::isWaitingForSync() {
  return waitingForSync;
}

bool PalletizerRuntime::isWaitingForDetect() {
  return waitingForDetect;
}

void PalletizerRuntime::setScriptParser(PalletizerScriptParser* parser) {
  scriptParser = parser;
}

void PalletizerRuntime::setSystemStateCallback(SystemStateCallback callback) {
  systemStateCallback = callback;
}

void PalletizerRuntime::setGroupCommandCallback(GroupCommandCallback callback) {
  groupCommandCallback = callback;
}

bool PalletizerRuntime::initFileSystem() {
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

bool PalletizerRuntime::writeQueueIndex() {
  File indexFile = LittleFS.open(queueIndexPath, "w");
  if (!indexFile) {
    return false;
  }
  indexFile.println(String(queueHead));
  indexFile.println(String(queueSize));
  ensureFileIsClosed(indexFile);
  return true;
}

bool PalletizerRuntime::readQueueIndex() {
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

bool PalletizerRuntime::appendToQueueFile(const String& command) {
  File queueFile = LittleFS.open(queueFilePath, "a");
  if (!queueFile) {
    return false;
  }
  queueFile.println(command);
  ensureFileIsClosed(queueFile);
  return true;
}

String PalletizerRuntime::readQueueCommandAt(int index) {
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

void PalletizerRuntime::ensureFileIsClosed(File& file) {
  if (file) {
    file.close();
  }
}

void PalletizerRuntime::initSyncPins() {
  pinMode(syncSetPin, OUTPUT);
  pinMode(syncWaitPin, INPUT_PULLDOWN);
  digitalWrite(syncSetPin, LOW);
  DEBUG_SERIAL_PRINTLN("RUNTIME: Sync pins initialized - Set:" + String(syncSetPin) + " Wait:" + String(syncWaitPin));
}

void PalletizerRuntime::initDetectPins() {
  for (int i = 0; i < DETECT_PIN_COUNT; i++) {
    pinMode(DETECT_PINS[i], INPUT_PULLUP);
    currentPinStates[i] = digitalRead(DETECT_PINS[i]);
    lastPinStates[i] = currentPinStates[i];
  }
  DEBUG_SERIAL_PRINTLN("RUNTIME: Detect pins initialized - Pins: " + String(DETECT_PINS[0]) + ", " + String(DETECT_PINS[1]));
}

bool PalletizerRuntime::checkSyncTimeout() {
  return waitingForSync && (millis() - waitStartTime) > timeoutConfig.maxWaitTime;
}

bool PalletizerRuntime::checkDetectTimeout() {
  return waitingForDetect && (millis() - detectStartTime) > DETECT_TIMEOUT_MS;
}

bool PalletizerRuntime::checkAllPinsLow() {
  for (int i = 0; i < DETECT_PIN_COUNT; i++) {
    currentPinStates[i] = digitalRead(DETECT_PINS[i]);
    if (currentPinStates[i] == HIGH) {
      return false;
    }
  }
  return true;
}

void PalletizerRuntime::resetDetectionState() {
  waitingForDetect = false;
  inDebouncePhase = false;
  detectStartTime = 0;
  debounceStartTime = 0;
}

void PalletizerRuntime::handleWaitTimeout() {
  updateTimeoutStats(false);

  switch (timeoutConfig.strategy) {
    case TIMEOUT_SKIP_CONTINUE:
      DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout #" + String(timeoutStats.totalTimeouts) + " - skipping and continuing");
      waitingForSync = false;

      if (timeoutStats.totalTimeouts >= timeoutConfig.maxTimeoutWarning) {
        DEBUG_SERIAL_PRINTLN("RUNTIME: WARNING - Frequent WAIT timeouts detected!");

        if (timeoutStats.totalTimeouts >= timeoutConfig.maxTimeoutWarning * 2) {
          DEBUG_SERIAL_PRINTLN("RUNTIME: Too many timeouts - requesting system pause");
          if (systemStateCallback) {
            systemStateCallback("PAUSE");
          }
          return;
        }
      }

      if (!isQueueEmpty() && systemRunning) {
        processNextCommand();
      }
      break;

    case TIMEOUT_PAUSE_SYSTEM:
      DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout - requesting system pause");
      waitingForSync = false;
      if (systemStateCallback) {
        systemStateCallback("PAUSE");
      }
      break;

    case TIMEOUT_ABORT_RESET:
      DEBUG_MGR.error("TIMEOUT", "❌ WAIT timeout - requesting system reset");
      waitingForSync = false;
      clearQueue();
      if (systemStateCallback) {
        systemStateCallback("IDLE");
      }
      break;

    case TIMEOUT_RETRY_BACKOFF:
      if (timeoutStats.currentRetryCount < timeoutConfig.autoRetryCount) {
        timeoutStats.currentRetryCount++;
        DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout - retry " + String(timeoutStats.currentRetryCount) + "/" + String(timeoutConfig.autoRetryCount));
        waitStartTime = millis();
      } else {
        DEBUG_MGR.error("TIMEOUT", "❌ WAIT timeout - max retries reached, requesting pause");
        timeoutStats.currentRetryCount = 0;
        waitingForSync = false;
        if (systemStateCallback) {
          systemStateCallback("PAUSE");
        }
      }
      break;
  }
}

void PalletizerRuntime::updateTimeoutStats(bool success) {
  if (success) {
    timeoutStats.successfulWaits++;
    timeoutStats.totalWaitTime += millis() - waitStartTimeForStats;
    resetTimeoutCounter();
  } else {
    timeoutStats.totalTimeouts++;
    timeoutStats.lastTimeoutTime = millis();
  }
}

void PalletizerRuntime::resetTimeoutCounter() {
  if (timeoutStats.totalTimeouts > 0) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: WAIT successful - resetting timeout counter");
    timeoutStats.currentRetryCount = 0;
  }
}

void PalletizerRuntime::logExecutionProgress() {
  static unsigned long lastProgressTime = 0;
  static int lastProgressCommand = -1;

  unsigned long currentTime = millis();

  if ((currentTime - lastProgressTime < 500 && executionInfo.currentCommand == lastProgressCommand) || progressLoggingActive) {
    return;
  }

  lastProgressTime = currentTime;
  lastProgressCommand = executionInfo.currentCommand;
  progressLoggingActive = true;

  if (executionInfo.totalCommands > 0) {
    DEBUG_MGR.progress(executionInfo.currentCommand, executionInfo.totalCommands, "Execution Progress");
  }

  progressLoggingActive = false;
}

void PalletizerRuntime::parseInlineCommands(const String& input, String* statements, int& count) {
  count = 0;
  String buffer = "";

  for (int i = 0; i <= input.length() && count < 50; i++) {
    char c = (i < input.length()) ? input.charAt(i) : ';';

    if (c == ';') {
      buffer.trim();
      if (buffer.length() > 0) {
        if (buffer.startsWith("SPEED;")) {
          int semicolons = 0;
          for (int j = 0; j < buffer.length(); j++) {
            if (buffer.charAt(j) == ';') semicolons++;
          }

          if (semicolons == 2) {
            String param = buffer.substring(6);
            param.trim();
            if (isNumeric(param)) {
              statements[count++] = buffer;
              buffer = "";
              continue;
            }
          } else if (semicolons == 3) {
            String remaining = buffer.substring(6);
            int nextSemi = remaining.indexOf(';');
            if (nextSemi != -1) {
              String axis = remaining.substring(0, nextSemi);
              axis.trim();
              if (axis.length() == 1 && !isNumeric(axis)) {
                statements[count++] = buffer;
                buffer = "";
                continue;
              }
            }
          }
        }

        if (buffer.startsWith("GROUP(")) {
          int parenCount = 0;
          bool foundEnd = false;
          for (int j = 5; j < buffer.length(); j++) {
            if (buffer.charAt(j) == '(') parenCount++;
            else if (buffer.charAt(j) == ')') {
              parenCount--;
              if (parenCount == 0) {
                foundEnd = true;
                break;
              }
            }
          }
          if (foundEnd) {
            statements[count++] = buffer;
            buffer = "";
            continue;
          }
        }

        if (!buffer.startsWith("SPEED;") || buffer.indexOf(' ') != -1) {
          statements[count++] = buffer;
          buffer = "";
        }
      }
    } else {
      buffer += c;
    }
  }
}

bool PalletizerRuntime::saveTimeoutConfig() {
  File configFile = LittleFS.open(timeoutConfigPath, "w");
  if (!configFile) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Failed to save timeout config");
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
  DEBUG_SERIAL_PRINTLN("RUNTIME: Timeout config saved");
  return true;
}

bool PalletizerRuntime::loadTimeoutConfig() {
  if (!LittleFS.exists(timeoutConfigPath)) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: No timeout config file found, using defaults");
    return false;
  }

  File configFile = LittleFS.open(timeoutConfigPath, "r");
  if (!configFile) {
    DEBUG_SERIAL_PRINTLN("RUNTIME: Failed to load timeout config");
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

  DEBUG_SERIAL_PRINTLN("RUNTIME: Timeout config loaded - timeout:" + String(timeoutConfig.maxWaitTime) + "ms");
  return true;
}

bool PalletizerRuntime::isRealScriptCommand(const String& command) {
  String trimmed = command;
  trimmed.trim();

  if (trimmed.indexOf("FUNC(") != -1 || trimmed.indexOf("CALL(") != -1) {
    return true;
  }

  if (trimmed.indexOf('{') != -1 && trimmed.indexOf('}') != -1) {
    return true;
  }

  return false;
}

bool PalletizerRuntime::isCoordinateCommand(const String& command) {
  String trimmed = command;
  trimmed.trim();
  trimmed.toUpperCase();

  if (trimmed.startsWith("GROUP(")) {
    return false;
  }

  if (trimmed.startsWith("X(") || trimmed.startsWith("Y(") || trimmed.startsWith("Z(") || trimmed.startsWith("T(") || trimmed.startsWith("G(")) {
    return true;
  }

  if (trimmed.indexOf("X(") != -1 && trimmed.indexOf("Y(") != -1) {
    return true;
  }

  return false;
}

bool PalletizerRuntime::isInvalidSpeedFragment(const String& command) {
  String trimmed = command;
  trimmed.trim();

  if (trimmed == "SPEED" || trimmed == "x" || trimmed == "y" || trimmed == "z" || trimmed == "t" || trimmed == "g") {
    return true;
  }

  if (trimmed.length() <= 4 && trimmed.toInt() > 0) {
    return true;
  }

  return false;
}

bool PalletizerRuntime::isNumeric(const String& str) {
  if (str.length() == 0) return false;

  for (int i = 0; i < str.length(); i++) {
    char c = str.charAt(i);
    if (!(c >= '0' && c <= '9')) {
      return false;
    }
  }
  return true;
}

bool PalletizerRuntime::shouldClearQueue(const String& data) {
  bool isCoordinateCmd = data.indexOf('(') != -1;
  return isCoordinateCmd && QUEUE_OPERATION_MODE == QUEUE_MODE_OVERWRITE;
}