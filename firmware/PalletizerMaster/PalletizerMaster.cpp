#include "PalletizerMaster.h"
#include "DebugManager.h"

PalletizerMaster* PalletizerMaster::instance = nullptr;

PalletizerMaster::PalletizerMaster(int rxPin, int txPin, int indicatorPin)
  : rxPin(rxPin), txPin(txPin), rxIndicatorLed(2), indicatorPin(indicatorPin),
    syncSetPin(SYNC_SET_PIN), syncWaitPin(SYNC_WAIT_PIN), waitingForSync(false), waitStartTime(0),
    waitingForDetect(false), detectStartTime(0), debounceStartTime(0), inDebouncePhase(false),
    scriptParser(this), ledIndicator{
      DigitalOut(27, true),
      DigitalOut(14, true),
      DigitalOut(13, true),
    } {
  instance = this;
  indicatorEnabled = (indicatorPin != -1);

  for (int i = 0; i < 5; i++) {
    currentPinStates[i] = true;
    lastPinStates[i] = true;
  }
}

void PalletizerMaster::begin() {
  slaveCommSerial.begin(9600, SERIAL_8N1, rxPin, txPin);
  slaveSerial.begin(&slaveCommSerial);

  pinMode(syncSetPin, OUTPUT);
  pinMode(syncWaitPin, INPUT_PULLDOWN);
  digitalWrite(syncSetPin, LOW);

  initDetectPins();

  if (indicatorEnabled) {
    pinMode(indicatorPin, INPUT_PULLUP);
    DEBUG_SERIAL_PRINTLN("MASTER: Indicator pin enabled on pin " + String(indicatorPin));
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Indicator pin disabled");
  }

  if (!initFileSystem()) {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to initialize file system");
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: File system initialized");
    clearQueue();
    loadTimeoutConfig();
  }

  systemState = STATE_IDLE;
  sendStateUpdate();
  DEBUG_SERIAL_PRINTLN("MASTER: System initialized");
  DEBUG_SERIAL_PRINTLN("MASTER: Sync pins initialized - Set:" + String(syncSetPin) + " Wait:" + String(syncWaitPin));
}

void PalletizerMaster::update() {
  checkSlaveData();

  if (waitingForGroupDelay && millis() >= groupCommandTimer) {
    waitingForGroupDelay = false;
    sequenceRunning = true;
    waitingForCompletion = indicatorEnabled;
    lastCheckTime = millis();

    DEBUG_MGR.info("GROUP", "✅ GROUP delay completed, starting completion monitoring");
    if (indicatorEnabled) {
      DEBUG_MGR.info("GROUP", "└─ Using indicator pin for completion detection");
    } else {
      DEBUG_MGR.info("GROUP", "└─ Using message-based completion detection");
    }
  }

  if (waitingForSync) {
    if (digitalRead(syncWaitPin) == HIGH) {
      DEBUG_MGR.sync("WAIT", "Sync signal received - continuing execution");
      waitingForSync = false;
      updateTimeoutStats(true);

      if (!isQueueEmpty() && systemState == STATE_RUNNING) {
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

        if (!isQueueEmpty() && systemState == STATE_RUNNING) {
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

      if (!isQueueEmpty() && systemState == STATE_RUNNING) {
        processNextCommand();
      }
    }

    return;
  }

  if (canProcessNextCommand()) {
    requestCommand();
  }

  if (indicatorEnabled && waitingForCompletion && sequenceRunning) {
    if (millis() - lastCheckTime > 50) {
      lastCheckTime = millis();

      bool allCompleted = checkAllSlavesCompleted();

      if (allCompleted) {
        sequenceRunning = false;
        waitingForCompletion = false;
        groupExecutionActive = false;
        DEBUG_MGR.info("EXECUTOR", "All slaves completed sequence");

        if (!isQueueEmpty() && systemState == STATE_RUNNING) {
          DEBUG_SERIAL_PRINTLN("MASTER: Processing next command from queue");
          processNextCommand();
        } else if (isQueueEmpty() && systemState == STATE_RUNNING) {
          if (executionInfo.isExecuting) {
            logExecutionProgress();
            updateExecutionInfo(false);
          }
          setSystemState(STATE_IDLE);
        }
      }
    }
  }

  if (systemState == STATE_STOPPING && !sequenceRunning && !waitingForCompletion) {
    setSystemState(STATE_IDLE);
  }

  for (int i = 0; i < MAX_LED_INDICATOR_SIZE; i++) {
    ledIndicator[i].update();
  }
}

void PalletizerMaster::sendToSlave(const String& data) {
  slaveSerial.println(data);
}

void PalletizerMaster::setSlaveDataCallback(DataCallback callback) {
  slaveDataCallback = callback;
}

void PalletizerMaster::processCommand(const String& data) {
  if (instance) {
    instance->onCommandReceived(data);
  }
}

PalletizerMaster::SystemState PalletizerMaster::getSystemState() {
  return systemState;
}

void PalletizerMaster::setTimeoutConfig(const TimeoutConfig& config) {
  timeoutConfig = config;
  if (config.saveToFile) {
    saveTimeoutConfig();
  }
  DEBUG_SERIAL_PRINTLN("MASTER: Timeout config updated - timeout:" + String(config.maxWaitTime) + "ms strategy:" + String(config.strategy));
}

PalletizerMaster::TimeoutConfig PalletizerMaster::getTimeoutConfig() {
  return timeoutConfig;
}

void PalletizerMaster::setWaitTimeout(unsigned long timeoutMs) {
  timeoutConfig.maxWaitTime = timeoutMs;
  if (timeoutConfig.saveToFile) {
    saveTimeoutConfig();
  }
  DEBUG_SERIAL_PRINTLN("MASTER: Wait timeout set to " + String(timeoutMs) + "ms");
}

void PalletizerMaster::setTimeoutStrategy(WaitTimeoutStrategy strategy) {
  timeoutConfig.strategy = strategy;
  if (timeoutConfig.saveToFile) {
    saveTimeoutConfig();
  }
  DEBUG_SERIAL_PRINTLN("MASTER: Timeout strategy set to " + String(strategy));
}

void PalletizerMaster::setMaxTimeoutWarning(int maxWarning) {
  timeoutConfig.maxTimeoutWarning = maxWarning;
  if (timeoutConfig.saveToFile) {
    saveTimeoutConfig();
  }
  DEBUG_SERIAL_PRINTLN("MASTER: Max timeout warning set to " + String(maxWarning));
}

PalletizerMaster::TimeoutStats PalletizerMaster::getTimeoutStats() {
  return timeoutStats;
}

void PalletizerMaster::clearTimeoutStats() {
  timeoutStats.totalTimeouts = 0;
  timeoutStats.successfulWaits = 0;
  timeoutStats.lastTimeoutTime = 0;
  timeoutStats.totalWaitTime = 0;
  timeoutStats.currentRetryCount = 0;
  DEBUG_SERIAL_PRINTLN("MASTER: Timeout statistics cleared");
}

float PalletizerMaster::getTimeoutSuccessRate() {
  int totalAttempts = timeoutStats.totalTimeouts + timeoutStats.successfulWaits;
  if (totalAttempts == 0) return 100.0;
  return (float(timeoutStats.successfulWaits) / float(totalAttempts)) * 100.0;
}

bool PalletizerMaster::saveTimeoutConfig() {
  File configFile = LittleFS.open(timeoutConfigPath, "w");
  if (!configFile) {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to save timeout config");
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
  DEBUG_SERIAL_PRINTLN("MASTER: Timeout config saved");
  return true;
}

bool PalletizerMaster::loadTimeoutConfig() {
  if (!LittleFS.exists(timeoutConfigPath)) {
    DEBUG_SERIAL_PRINTLN("MASTER: No timeout config file found, using defaults");
    return false;
  }

  File configFile = LittleFS.open(timeoutConfigPath, "r");
  if (!configFile) {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to load timeout config");
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

  DEBUG_SERIAL_PRINTLN("MASTER: Timeout config loaded - timeout:" + String(timeoutConfig.maxWaitTime) + "ms");
  return true;
}

PalletizerMaster::ExecutionInfo PalletizerMaster::getExecutionInfo() {
  return executionInfo;
}

PalletizerScriptParser* PalletizerMaster::getScriptParser() {
  return &scriptParser;
}

void PalletizerMaster::processGroupCommand(const String& groupCommands) {
  DEBUG_MGR.info("GROUP", "🔄 Executing GROUP command");
  DEBUG_MGR.info("GROUP", "└─ Commands: " + groupCommands);
  DEBUG_MGR.info("GROUP", "└─ Setting wait flags and 100ms delay");

  groupExecutionActive = true;
  currentCommand = CMD_GROUP;

  parseAndSendGroupCommands(groupCommands);

  groupCommandTimer = millis() + 100;
  waitingForGroupDelay = true;

  DEBUG_MGR.info("GROUP", "└─ GROUP setup complete, waiting for delay...");
}

void PalletizerMaster::addCommandToQueue(const String& command) {
  addToQueue(command);
}

bool PalletizerMaster::canProcessNextCommand() {
  return !requestNextCommand && !isQueueFull() && !waitingForSync && !waitingForDetect && !scriptProcessing && !waitingForGroupDelay && !groupExecutionActive && !sequenceRunning && !waitingForCompletion;
}

void PalletizerMaster::checkSlaveData() {
  if (slaveSerial.available() > 0) {
    while (slaveSerial.available() > 0) {
      rxIndicatorLed.on();
      char c = slaveSerial.read();

      if (c == '\n' || c == '\r') {
        if (slavePartialBuffer.length() > 0) {
          slavePartialBuffer.trim();
          if (slaveDataCallback) {
            slaveDataCallback(slavePartialBuffer);
          }
          onSlaveData(slavePartialBuffer);
          slavePartialBuffer = "";
        }
      } else {
        slavePartialBuffer += c;
      }
      rxIndicatorLed.off();
    }
  }
}

void PalletizerMaster::onCommandReceived(const String& data) {
  DEBUG_SERIAL_PRINTLN("COMMAND→MASTER: " + data);
  requestNextCommand = false;

  String trimmedData = data;
  trimmedData.trim();
  String upperData = trimmedData;
  upperData.toUpperCase();

  if (upperData.startsWith("SPEED;")) {
    processSpeedCommand(trimmedData);
    return;
  }

  if (upperData == "IDLE" || upperData == "PLAY" || upperData == "PAUSE" || upperData == "STOP") {
    processSystemStateCommand(upperData);
    return;
  }

  if (upperData == "ZERO") {
    processStandardCommand(upperData);
    return;
  }

  if (upperData.startsWith("SET(") || upperData == "WAIT") {
    processSyncCommand(upperData);
    return;
  }

  if (upperData == "DETECT") {
    processDetectCommand();
    return;
  }

  if (trimmedData.startsWith("GROUP;")) {
    String groupCommands = trimmedData.substring(6);
    processGroupCommand(groupCommands);
    return;
  }

  if (upperData.startsWith("GROUP(") && upperData.indexOf(")") != -1) {
    int startPos = 6;
    int endPos = trimmedData.indexOf(")", startPos);
    endPos = trimmedData.lastIndexOf(")", endPos);
    if (endPos > startPos) {
      String groupCommands = trimmedData.substring(startPos, endPos);
      processGroupCommand(groupCommands);
    }
    return;
  }

  if (isRealScriptCommand(trimmedData)) {
    DEBUG_SERIAL_PRINTLN("MASTER: Detected script format - processing directly");
    processScriptCommand(trimmedData);
    return;
  }

  if (!sequenceRunning && !waitingForCompletion && !scriptProcessing) {
    if (upperData == "END_QUEUE") {
      DEBUG_SERIAL_PRINTLN("MASTER: Queue loading completed");
      scriptProcessing = false;
    } else {
      if (shouldClearQueue(trimmedData)) {
        if (!queueClearRequested) {
          clearQueue();
          queueClearRequested = true;
        }
      }

      DEBUG_SERIAL_PRINTLN("MASTER: Processing as inline commands");
      processInlineCommands(trimmedData);
    }
  } else if (trimmedData != "END_QUEUE") {
    if (shouldClearQueue(trimmedData)) {
      if (!queueClearRequested) {
        clearQueue();
        queueClearRequested = true;
      }
    }

    DEBUG_SERIAL_PRINTLN("MASTER: Processing as inline commands");
    processInlineCommands(trimmedData);
  }
}

void PalletizerMaster::onSlaveData(const String& data) {
  DEBUG_MGR.info("SLAVE→MASTER", data);

  if (!indicatorEnabled && waitingForCompletion && sequenceRunning) {
    if (data.indexOf("SEQUENCE COMPLETED") != -1) {
      sequenceRunning = false;
      waitingForCompletion = false;
      groupExecutionActive = false;
      DEBUG_SERIAL_PRINTLN("MASTER: All slaves completed sequence (based on message)");

      if (!isQueueEmpty() && systemState == STATE_RUNNING) {
        DEBUG_SERIAL_PRINTLN("MASTER: Processing next command from queue");
        processNextCommand();
      } else if (isQueueEmpty() && systemState == STATE_RUNNING) {
        if (executionInfo.isExecuting) {
          logExecutionProgress();
          updateExecutionInfo(false);
        }
        setSystemState(STATE_IDLE);
      } else if (systemState == STATE_STOPPING) {
        clearQueue();
        setSystemState(STATE_IDLE);
      }
    }
  }

  if (data.indexOf("POSITION REACHED") != -1) {
    String axis = data.substring(0, data.indexOf(";"));
    axis.toUpperCase();
    DEBUG_MGR.info("MOTION", "✅ " + axis + " axis reached target position");
  }

  if (groupExecutionActive && data.indexOf("ERROR") != -1) {
    DEBUG_MGR.error("GROUP", "❌ Error in GROUP execution - aborting sequence");
    clearQueue();
    setSystemState(STATE_IDLE);
    groupExecutionActive = false;
  }
}

void PalletizerMaster::processStandardCommand(const String& command) {
  if (command == "ZERO") {
    currentCommand = CMD_ZERO;
    DEBUG_MGR.info("SYSTEM", "⚙️ Executing ZERO (Homing) command");
    sendCommandToAllSlaves(CMD_ZERO);
    delay(100);
    sequenceRunning = true;
    waitingForCompletion = indicatorEnabled;
    lastCheckTime = millis();
  }
}

void PalletizerMaster::processSpeedCommand(const String& data) {
  String params = data.substring(6);
  params.trim();

  while (params.endsWith(";")) {
    params = params.substring(0, params.length() - 1);
  }

  int separatorPos = params.indexOf(';');

  if (separatorPos != -1) {
    String slaveId = params.substring(0, separatorPos);
    String speedValue = params.substring(separatorPos + 1);

    slaveId.trim();
    speedValue.trim();

    while (speedValue.endsWith(";")) {
      speedValue = speedValue.substring(0, speedValue.length() - 1);
    }

    slaveId.toLowerCase();
    String command = slaveId + ";" + String(CMD_SETSPEED) + ";" + speedValue;

    sendToSlave(command);
    slaveId.toUpperCase();
    DEBUG_MGR.info("SPEED", "⚡ Set " + slaveId + " axis speed to " + speedValue);
  } else {
    while (params.endsWith(";")) {
      params = params.substring(0, params.length() - 1);
    }

    const char* slaveIds[] = { "x", "y", "z", "t", "g" };
    for (int i = 0; i < 5; i++) {
      String command = String(slaveIds[i]) + ";" + String(CMD_SETSPEED) + ";" + params;
      sendToSlave(command);
    }
    DEBUG_MGR.info("SPEED", "⚡ Set all axes speed to " + params);
  }
}

void PalletizerMaster::processCoordinateData(const String& data) {
  DEBUG_SERIAL_PRINTLN("MASTER: Processing coordinates");
  currentCommand = CMD_RUN;
  logMotionCommand(data);
  parseCoordinateData(data);
  delay(100);
  sequenceRunning = true;
  waitingForCompletion = true;
  lastCheckTime = millis();
}

void PalletizerMaster::processSystemStateCommand(const String& command) {
  static String lastStateCommand = "";
  static unsigned long lastStateTime = 0;

  unsigned long currentTime = millis();

  if (command == lastStateCommand && (currentTime - lastStateTime) < 200) {
    DEBUG_SERIAL_PRINTLN("MASTER: Ignoring duplicate state command: " + command);
    return;
  }

  lastStateCommand = command;
  lastStateTime = currentTime;

  DEBUG_SERIAL_PRINTLN("MASTER: Processing system state command: " + command);

  if (command == "IDLE") {
    if (systemState == STATE_RUNNING || systemState == STATE_PAUSED) {
      if (sequenceRunning) {
        setSystemState(STATE_STOPPING);
      } else {
        clearQueue();
        setSystemState(STATE_IDLE);
      }
    } else {
      setSystemState(STATE_IDLE);
    }
  } else if (command == "PLAY") {
    if (systemState == STATE_RUNNING) {
      DEBUG_SERIAL_PRINTLN("MASTER: Already running, ignoring duplicate PLAY");
      return;
    }

    if (isQueueEmpty()) {
      loadCommandsFromFile();
    }

    updateExecutionInfo(true);
    setSystemState(STATE_RUNNING);
    if (!sequenceRunning && !waitingForCompletion && !isQueueEmpty()) {
      processNextCommand();
    }
  } else if (command == "PAUSE") {
    setSystemState(STATE_PAUSED);
  } else if (command == "STOP") {
    if (sequenceRunning) {
      setSystemState(STATE_STOPPING);
    } else {
      clearQueue();
      setSystemState(STATE_IDLE);
    }
  }
}

void PalletizerMaster::processSyncCommand(const String& command) {
  if (command.startsWith("SET(")) {
    processSetCommand(command);
  } else if (command == "WAIT") {
    processWaitCommand();
  }
}

void PalletizerMaster::processSetCommand(const String& data) {
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
      DEBUG_SERIAL_PRINTLN("MASTER: Invalid SET value: " + value);
    }
  }
}

void PalletizerMaster::processWaitCommand() {
  DEBUG_MGR.sync("WAIT", "Waiting for sync signal HIGH");
  waitingForSync = true;
  waitStartTime = millis();
  waitStartTimeForStats = millis();
}

void PalletizerMaster::processDetectCommand() {
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

void PalletizerMaster::processScriptCommand(const String& script) {
  static bool scriptInProgress = false;
  if (scriptInProgress) {
    DEBUG_SERIAL_PRINTLN("MASTER: Script already processing, ignoring duplicate");
    return;
  }

  scriptInProgress = true;
  DEBUG_SERIAL_PRINTLN("MASTER: Processing script command");

  scriptProcessing = true;
  queueClearRequested = false;
  scriptParser.parseScript(script);
  scriptProcessing = false;

  scriptInProgress = false;
}

void PalletizerMaster::processInlineCommands(const String& commands) {
  String statements[50];
  int statementCount = 0;

  parseInlineCommands(commands, statements, statementCount);

  for (int i = 0; i < statementCount; i++) {
    statements[i].trim();
    if (statements[i].length() > 0) {
      addToQueue(statements[i]);
    }
  }
}

void PalletizerMaster::sendCommandToAllSlaves(Command cmd) {
  const char* slaveIds[] = { "x", "y", "z", "t", "g" };
  for (int i = 0; i < 5; i++) {
    String command = String(slaveIds[i]) + ";" + String(cmd);
    sendToSlave(command);
    DEBUG_SERIAL_PRINTLN("MASTER→SLAVE: " + command);
  }
}

void PalletizerMaster::parseCoordinateData(const String& data) {
  int pos = 0, endPos;
  while (pos < data.length()) {
    endPos = data.indexOf('(', pos);
    if (endPos == -1) break;
    String slaveId = data.substring(pos, endPos);
    slaveId.trim();
    slaveId.toLowerCase();

    int closePos = data.indexOf(')', endPos);
    if (closePos == -1) break;

    String paramsOrig = data.substring(endPos + 1, closePos);

    String params = "";
    for (int i = 0; i < paramsOrig.length(); i++) {
      params += (paramsOrig.charAt(i) == ',') ? ';' : paramsOrig.charAt(i);
    }

    String command = slaveId + ";" + String(currentCommand) + ";" + params;
    sendToSlave(command);
    DEBUG_SERIAL_PRINTLN("MASTER→SLAVE: " + command);

    pos = data.indexOf(',', closePos);
    pos = (pos == -1) ? data.length() : pos + 1;
  }
}

void PalletizerMaster::parseAndSendGroupCommands(const String& groupCommands) {
  DEBUG_MGR.info("GROUP", "Parsing and sending simultaneous commands");

  int pos = 0;
  while (pos < groupCommands.length()) {
    while (pos < groupCommands.length() && (groupCommands.charAt(pos) == ' ' || groupCommands.charAt(pos) == '\t')) {
      pos++;
    }

    int endPos = groupCommands.indexOf('(', pos);
    if (endPos == -1 || pos >= groupCommands.length()) break;

    String slaveId = groupCommands.substring(pos, endPos);
    slaveId.trim();
    slaveId.toLowerCase();

    int openParen = endPos;
    int closeParen = -1;
    int parenCount = 1;

    for (int i = openParen + 1; i < groupCommands.length() && parenCount > 0; i++) {
      if (groupCommands.charAt(i) == '(') {
        parenCount++;
      } else if (groupCommands.charAt(i) == ')') {
        parenCount--;
        if (parenCount == 0) {
          closeParen = i;
        }
      }
    }

    if (closeParen == -1) break;

    String paramsOrig = groupCommands.substring(openParen + 1, closeParen);
    String params = "";
    for (int i = 0; i < paramsOrig.length(); i++) {
      if (paramsOrig.charAt(i) == ' ') {
        continue;
      }
      params += (paramsOrig.charAt(i) == ',') ? ';' : paramsOrig.charAt(i);
    }

    String command = slaveId + ";" + String(CMD_RUN) + ";" + params;
    sendToSlave(command);
    DEBUG_MGR.info("GROUP→SLAVE", command);

    pos = closeParen + 1;
    while (pos < groupCommands.length() && (groupCommands.charAt(pos) == ' ' || groupCommands.charAt(pos) == ',')) {
      pos++;
    }
  }

  DEBUG_MGR.info("GROUP", "All commands broadcasted simultaneously");
}

void PalletizerMaster::parseInlineCommands(const String& input, String* statements, int& count) {
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

bool PalletizerMaster::checkAllSlavesCompleted() {
  if (!indicatorEnabled) {
    return false;
  }
  return digitalRead(indicatorPin) == HIGH;
}

bool PalletizerMaster::checkSyncTimeout() {
  return waitingForSync && (millis() - waitStartTime) > timeoutConfig.maxWaitTime;
}

bool PalletizerMaster::checkAllPinsLow() {
  for (int i = 0; i < DETECT_PIN_COUNT; i++) {
    currentPinStates[i] = digitalRead(DETECT_PINS[i]);
    if (currentPinStates[i] == HIGH) {
      return false;
    }
  }
  return true;
}

bool PalletizerMaster::checkDetectTimeout() {
  return waitingForDetect && (millis() - detectStartTime) > DETECT_TIMEOUT_MS;
}

void PalletizerMaster::resetDetectionState() {
  waitingForDetect = false;
  inDebouncePhase = false;
  detectStartTime = 0;
  debounceStartTime = 0;
}

void PalletizerMaster::initDetectPins() {
  for (int i = 0; i < DETECT_PIN_COUNT; i++) {
    pinMode(DETECT_PINS[i], INPUT_PULLUP);
    currentPinStates[i] = digitalRead(DETECT_PINS[i]);
    lastPinStates[i] = currentPinStates[i];
    DEBUG_SERIAL_PRINTLN("MASTER: Detect pins initialized - Pins: " + String(DETECT_PINS[i]));
  }
}

void PalletizerMaster::addToQueue(const String& command) {
  static unsigned long lastAddTime = 0;
  static String lastAddCommand = "";

  unsigned long currentTime = millis();
  if (currentTime - lastAddTime < 50 && command == lastAddCommand) {
    DEBUG_SERIAL_PRINTLN("MASTER: Ignoring duplicate queue add: " + command);
    return;
  }

  lastAddTime = currentTime;
  lastAddCommand = command;

  if (appendToQueueFile(command)) {
    queueSize++;
    writeQueueIndex();
    DEBUG_SERIAL_PRINTLN("MASTER: Added command to queue: " + command + " (Queue size: " + String(queueSize) + ")");
    executionInfo.totalCommands++;
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to add command to queue: " + command);
  }
}

String PalletizerMaster::getFromQueue() {
  if (isQueueEmpty()) {
    return "";
  }

  String command = readQueueCommandAt(queueHead);
  queueHead++;
  queueSize--;
  writeQueueIndex();

  DEBUG_SERIAL_PRINTLN("MASTER: Processing command from queue: " + command + " (Queue size: " + String(queueSize) + ")");

  return command;
}

bool PalletizerMaster::isQueueEmpty() {
  return queueSize == 0;
}

bool PalletizerMaster::isQueueFull() {
  return queueSize >= 100;
}

void PalletizerMaster::processNextCommand() {
  static bool processingCommand = false;

  if (processingCommand) {
    DEBUG_SERIAL_PRINTLN("MASTER: Already processing command, skipping duplicate");
    return;
  }

  if (groupExecutionActive || waitingForGroupDelay) {
    DEBUG_SERIAL_PRINTLN("MASTER: GROUP command active, deferring next command");
    return;
  }

  if (isQueueEmpty()) {
    DEBUG_SERIAL_PRINTLN("MASTER: Command queue is empty");
    return;
  }

  if (systemState != STATE_RUNNING) {
    DEBUG_SERIAL_PRINTLN("MASTER: Not processing command because system is not in RUNNING state");
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
      processGroupCommand(groupCommands);
      processingCommand = false;
      return;
    }
  }

  if (trimmedCommand.startsWith("GROUP;")) {
    String groupCommands = trimmedCommand.substring(6);
    processGroupCommand(groupCommands);
    processingCommand = false;
    return;
  }

  if (upperData.startsWith("CALL(")) {
    processScriptCommand(trimmedCommand);
  } else if (upperData == "ZERO") {
    processStandardCommand(upperData);
  } else if (upperData.startsWith("SPEED;")) {
    processSpeedCommand(trimmedCommand);
  } else if (upperData.startsWith("SET(") || upperData == "WAIT") {
    processSyncCommand(upperData);
  } else if (upperData == "DETECT") {
    processDetectCommand();
  } else if (isCoordinateCommand(trimmedCommand)) {
    processCoordinateData(trimmedCommand);
  } else if (isInvalidSpeedFragment(trimmedCommand)) {
    DEBUG_SERIAL_PRINTLN("MASTER: Skipping invalid speed fragment: " + trimmedCommand);
  } else if (isRealScriptCommand(trimmedCommand)) {
    processScriptCommand(trimmedCommand);
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Unknown command format: " + trimmedCommand);
  }

  processingCommand = false;
}

void PalletizerMaster::requestCommand() {
  if (!isQueueFull() && !requestNextCommand) {
    requestNextCommand = true;
    DEBUG_SERIAL_PRINTLN("MASTER: Ready for next command");
  }
}

void PalletizerMaster::clearQueue() {
  queueClearRequested = false;

  if (LittleFS.exists(queueFilePath)) {
    File testFile = LittleFS.open(queueFilePath, "r");
    if (testFile) {
      ensureFileIsClosed(testFile);
      delay(10);
    }

    bool removed = LittleFS.remove(queueFilePath);
    if (!removed) {
      DEBUG_SERIAL_PRINTLN("MASTER: Warning - could not remove queue file");
    }
  }

  File queueFile = LittleFS.open(queueFilePath, "w");
  if (queueFile) {
    ensureFileIsClosed(queueFile);
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to create new queue file");
  }

  queueHead = 0;
  queueSize = 0;
  writeQueueIndex();

  executionInfo.totalCommands = 0;
  executionInfo.currentCommand = 0;

  DEBUG_SERIAL_PRINTLN("MASTER: Command queue cleared");
}

bool PalletizerMaster::initFileSystem() {
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

bool PalletizerMaster::writeQueueIndex() {
  File indexFile = LittleFS.open(queueIndexPath, "w");
  if (!indexFile) {
    return false;
  }
  indexFile.println(String(queueHead));
  indexFile.println(String(queueSize));
  ensureFileIsClosed(indexFile);
  return true;
}

bool PalletizerMaster::readQueueIndex() {
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

bool PalletizerMaster::appendToQueueFile(const String& command) {
  File queueFile = LittleFS.open(queueFilePath, "a");
  if (!queueFile) {
    return false;
  }
  queueFile.println(command);
  ensureFileIsClosed(queueFile);
  return true;
}

String PalletizerMaster::readQueueCommandAt(int index) {
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

int PalletizerMaster::getQueueCount() {
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

void PalletizerMaster::setSystemState(SystemState newState) {
  if (systemState != newState) {
    systemState = newState;
    DEBUG_SERIAL_PRINTLN("MASTER: System state changed to " + String(systemState));
    sendStateUpdate();

    if (newState == STATE_RUNNING && !sequenceRunning && !waitingForCompletion && !isQueueEmpty()) {
      processNextCommand();
    }
  }
}

void PalletizerMaster::sendStateUpdate() {
  String stateStr;
  switch (systemState) {
    case STATE_IDLE:
      setOnLedIndicator(LED_RED);
      stateStr = "IDLE";
      break;
    case STATE_RUNNING:
      setOnLedIndicator(LED_GREEN);
      stateStr = "RUNNING";
      break;
    case STATE_PAUSED:
      setOnLedIndicator(LED_YELLOW);
      stateStr = "PAUSED";
      break;
    case STATE_STOPPING:
      setOnLedIndicator(LED_RED);
      stateStr = "STOPPING";
      break;
    default:
      setOnLedIndicator(LED_OFF);
      stateStr = "UNKNOWN";
      break;
  }
  DEBUG_SERIAL_PRINTLN("MASTER: STATE:" + stateStr);
}

void PalletizerMaster::setOnLedIndicator(LedIndicator index) {
  for (int i = 0; i < MAX_LED_INDICATOR_SIZE; i++) {
    ledIndicator[i].off();
  }
  if (index >= MAX_LED_INDICATOR_SIZE || index == LED_OFF) {
    return;
  }
  ledIndicator[index].on();
}

void PalletizerMaster::loadCommandsFromFile() {
  if (!LittleFS.exists(queueFilePath)) {
    DEBUG_SERIAL_PRINTLN("MASTER: No saved commands found");
    return;
  }

  File file = LittleFS.open(queueFilePath, "r");
  if (!file) {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to open queue file");
    return;
  }

  DEBUG_SERIAL_PRINTLN("MASTER: Loading commands from file...");

  String allCommands = file.readString();
  ensureFileIsClosed(file);

  clearQueue();

  if (allCommands.length() > 0) {
    if (isRealScriptCommand(allCommands)) {
      DEBUG_SERIAL_PRINTLN("MASTER: Detected script format - processing directly");
      processScriptCommand(allCommands);
    } else {
      DEBUG_SERIAL_PRINTLN("MASTER: Processing as inline commands");
      processInlineCommands(allCommands);
      processCommand("END_QUEUE");
    }
    DEBUG_SERIAL_PRINTLN("MASTER: Commands loaded from file successfully");
    DEBUG_MGR.info("EXECUTOR", "Total Commands in Queue: " + String(executionInfo.totalCommands));
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: No valid commands found in file");
  }
}

void PalletizerMaster::handleWaitTimeout() {
  updateTimeoutStats(false);

  switch (timeoutConfig.strategy) {
    case TIMEOUT_SKIP_CONTINUE:
      DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout #" + String(timeoutStats.totalTimeouts) + " - skipping and continuing");
      waitingForSync = false;

      if (timeoutStats.totalTimeouts >= timeoutConfig.maxTimeoutWarning) {
        DEBUG_SERIAL_PRINTLN("MASTER: WARNING - Frequent WAIT timeouts detected!");

        if (timeoutStats.totalTimeouts >= timeoutConfig.maxTimeoutWarning * 2) {
          DEBUG_SERIAL_PRINTLN("MASTER: Too many timeouts - auto pausing");
          setSystemState(STATE_PAUSED);
          return;
        }
      }

      if (!isQueueEmpty() && systemState == STATE_RUNNING) {
        processNextCommand();
      }
      break;

    case TIMEOUT_PAUSE_SYSTEM:
      DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout - pausing system for user intervention");
      waitingForSync = false;
      setSystemState(STATE_PAUSED);
      break;

    case TIMEOUT_ABORT_RESET:
      DEBUG_MGR.error("TIMEOUT", "❌ WAIT timeout - aborting sequence and resetting");
      waitingForSync = false;
      clearQueue();
      setSystemState(STATE_IDLE);
      break;

    case TIMEOUT_RETRY_BACKOFF:
      if (timeoutStats.currentRetryCount < timeoutConfig.autoRetryCount) {
        timeoutStats.currentRetryCount++;
        DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout - retry " + String(timeoutStats.currentRetryCount) + "/" + String(timeoutConfig.autoRetryCount));
        waitStartTime = millis();
      } else {
        DEBUG_MGR.error("TIMEOUT", "❌ WAIT timeout - max retries reached, pausing");
        timeoutStats.currentRetryCount = 0;
        waitingForSync = false;
        setSystemState(STATE_PAUSED);
      }
      break;
  }
}

void PalletizerMaster::resetTimeoutCounter() {
  if (timeoutStats.totalTimeouts > 0) {
    DEBUG_SERIAL_PRINTLN("MASTER: WAIT successful - resetting timeout counter");
    timeoutStats.currentRetryCount = 0;
  }
}

void PalletizerMaster::updateTimeoutStats(bool success) {
  if (success) {
    timeoutStats.successfulWaits++;
    timeoutStats.totalWaitTime += millis() - waitStartTimeForStats;
    resetTimeoutCounter();
  } else {
    timeoutStats.totalTimeouts++;
    timeoutStats.lastTimeoutTime = millis();
  }
}

void PalletizerMaster::processCommandsBatch(const String& commands) {
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

bool PalletizerMaster::shouldClearQueue(const String& data) {
  bool isCoordinateCmd = data.indexOf('(') != -1;
  return isCoordinateCmd && QUEUE_OPERATION_MODE == QUEUE_MODE_OVERWRITE;
}

void PalletizerMaster::ensureFileIsClosed(File& file) {
  if (file) {
    file.close();
  }
}

void PalletizerMaster::updateExecutionInfo(bool start) {
  static bool executionActive = false;

  if (start) {
    if (executionActive || executionInfoActive) {
      DEBUG_SERIAL_PRINTLN("MASTER: Execution already active, ignoring duplicate start");
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
      DEBUG_SERIAL_PRINTLN("MASTER: Execution not active, ignoring duplicate end");
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

void PalletizerMaster::logExecutionProgress() {
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

void PalletizerMaster::logMotionCommand(const String& data) {
  int count = 0;
  int pos = 0;

  while ((pos = data.indexOf('(', pos)) != -1) {
    count++;
    pos++;
  }

  if (count > 1) {
    DEBUG_MGR.info("MOTION", "🎯 Multi-axis movement (" + String(count) + " axes)");
  }
}

bool PalletizerMaster::isScriptCommand(const String& command) {
  return isRealScriptCommand(command);
}

bool PalletizerMaster::isRealScriptCommand(const String& command) {
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

bool PalletizerMaster::isCoordinateCommand(const String& command) {
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

bool PalletizerMaster::isDuplicateMessage(const String& message) {
  unsigned long currentTime = millis();

  if (debugTracker.lastMessage == message && (currentTime - debugTracker.lastTimestamp) < 100) {
    debugTracker.duplicateCount++;
    return true;
  }

  debugTracker.lastMessage = message;
  debugTracker.lastTimestamp = currentTime;
  debugTracker.duplicateCount = 0;
  return false;
}

bool PalletizerMaster::isInvalidSpeedFragment(const String& command) {
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

String PalletizerMaster::cleanSpeedValue(const String& value) {
  String cleaned = value;
  cleaned.trim();

  while (cleaned.endsWith(";")) {
    cleaned = cleaned.substring(0, cleaned.length() - 1);
  }

  cleaned.trim();
  return cleaned;
}

bool PalletizerMaster::isCompleteSpeedCommand(const String& command) {
  if (!command.startsWith("SPEED;")) return false;

  int semicolonCount = 0;
  for (int i = 0; i < command.length(); i++) {
    if (command.charAt(i) == ';') {
      semicolonCount++;
    }
  }

  if (semicolonCount == 2) {
    String param = command.substring(6);
    param.trim();
    return isNumeric(param);
  } else if (semicolonCount == 3) {
    String remaining = command.substring(6);
    int nextSemi = remaining.indexOf(';');
    if (nextSemi != -1) {
      String axis = remaining.substring(0, nextSemi);
      axis.trim();
      return axis.length() == 1 && !isNumeric(axis);
    }
  }

  return false;
}

bool PalletizerMaster::isNumeric(const String& str) {
  if (str.length() == 0) return false;

  for (int i = 0; i < str.length(); i++) {
    char c = str.charAt(i);
    if (!(c >= '0' && c <= '9')) {
      return false;
    }
  }
  return true;
}