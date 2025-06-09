#include "PalletizerMaster.h"
#include "DebugManager.h"

PalletizerMaster* PalletizerMaster::instance = nullptr;

PalletizerMaster::PalletizerMaster(int rxPin, int txPin, int indicatorPin)
  : protocol(nullptr), runtime(nullptr), scriptParser(this),
    systemState(STATE_IDLE), slaveDataCallback(nullptr),
    indicatorPin(indicatorPin), indicatorEnabled(indicatorPin != -1),
    sequenceRunning(false), waitingForCompletion(false), groupExecutionActive(false),
    lastCheckTime(0), groupCommandTimer(0), waitingForGroupDelay(false),
    ledIndicator{
      DigitalOut(27, true),
      DigitalOut(14, true),
      DigitalOut(13, true),
    } {

  instance = this;
  protocol = new PalletizerProtocol(rxPin, txPin);
  runtime = new PalletizerRuntime(protocol);
}

PalletizerMaster::~PalletizerMaster() {
  delete protocol;
  delete runtime;
}

void PalletizerMaster::begin() {
  protocol->begin();
  protocol->setDataCallback(onSlaveDataWrapper);
  protocol->setPacketMode(PalletizerProtocol::PACKET_MODE_BATCH);

  runtime->begin();
  runtime->setScriptParser(&scriptParser);
  runtime->setSystemStateCallback(onSystemStateChangeWrapper);
  runtime->setGroupCommandCallback(onGroupCommandWrapper);

  if (indicatorEnabled) {
    pinMode(indicatorPin, INPUT_PULLUP);
    DEBUG_SERIAL_PRINTLN("MASTER: Indicator pin enabled on pin " + String(indicatorPin));
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Indicator pin disabled - using message-based completion");
  }

  systemState = STATE_IDLE;
  sendStateUpdate();
  DEBUG_SERIAL_PRINTLN("MASTER: System orchestrator initialized with enhanced state management");
  DEBUG_SERIAL_PRINTLN("MASTER: Packet-based communication enabled for reduced bus collision");
}

void PalletizerMaster::update() {
  runtime->update();

  if (waitingForGroupDelay && millis() >= groupCommandTimer) {
    waitingForGroupDelay = false;
    sequenceRunning = true;
    waitingForCompletion = true;
    lastCheckTime = millis();

    DEBUG_MGR.info("GROUP", "✅ GROUP delay completed, starting completion monitoring");
    if (indicatorEnabled) {
      DEBUG_MGR.info("GROUP", "└─ Using indicator pin for completion detection");
    } else {
      DEBUG_MGR.info("GROUP", "└─ Using message-based completion detection");
    }
  }

  if ((sequenceRunning && waitingForCompletion) || runtime->isSingleCommandExecuting()) {
    if (indicatorEnabled) {
      handleIndicatorBasedCompletion();
    }
  }

  bool isRuntimeBusy = runtime->isWaitingForSync() || runtime->isWaitingForDetect() || runtime->isSingleCommandExecuting();
  bool isSystemBusy = sequenceRunning || waitingForCompletion || groupExecutionActive || waitingForGroupDelay;

  if (systemState == STATE_STOPPING && !isRuntimeBusy && !isSystemBusy) {
    setSystemState(STATE_IDLE);
  }

  for (int i = 0; i < MAX_LED_INDICATOR_SIZE; i++) {
    ledIndicator[i].update();
  }
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

void PalletizerMaster::setTimeoutConfig(const PalletizerRuntime::TimeoutConfig& config) {
  runtime->setTimeoutConfig(config);
}

PalletizerRuntime::TimeoutConfig PalletizerMaster::getTimeoutConfig() {
  return runtime->getTimeoutConfig();
}

void PalletizerMaster::setWaitTimeout(unsigned long timeoutMs) {
  PalletizerRuntime::TimeoutConfig config = runtime->getTimeoutConfig();
  config.maxWaitTime = timeoutMs;
  runtime->setTimeoutConfig(config);
  DEBUG_SERIAL_PRINTLN("MASTER: Wait timeout set to " + String(timeoutMs) + "ms");
}

void PalletizerMaster::setTimeoutStrategy(PalletizerRuntime::WaitTimeoutStrategy strategy) {
  PalletizerRuntime::TimeoutConfig config = runtime->getTimeoutConfig();
  config.strategy = strategy;
  runtime->setTimeoutConfig(config);
  DEBUG_SERIAL_PRINTLN("MASTER: Timeout strategy set to " + String(strategy));
}

void PalletizerMaster::setMaxTimeoutWarning(int maxWarning) {
  PalletizerRuntime::TimeoutConfig config = runtime->getTimeoutConfig();
  config.maxTimeoutWarning = maxWarning;
  runtime->setTimeoutConfig(config);
  DEBUG_SERIAL_PRINTLN("MASTER: Max timeout warning set to " + String(maxWarning));
}

PalletizerRuntime::TimeoutStats PalletizerMaster::getTimeoutStats() {
  return runtime->getTimeoutStats();
}

void PalletizerMaster::clearTimeoutStats() {
  runtime->clearTimeoutStats();
}

float PalletizerMaster::getTimeoutSuccessRate() {
  return runtime->getTimeoutSuccessRate();
}

bool PalletizerMaster::saveTimeoutConfig() {
  return true;
}

bool PalletizerMaster::loadTimeoutConfig() {
  return true;
}

PalletizerRuntime::ExecutionInfo PalletizerMaster::getExecutionInfo() {
  return runtime->getExecutionInfo();
}

PalletizerScriptParser* PalletizerMaster::getScriptParser() {
  return &scriptParser;
}

PalletizerRuntime* PalletizerMaster::getRuntime() {
  return runtime;
}

void PalletizerMaster::processGroupCommand(const String& groupCommands) {
  DEBUG_MGR.info("GROUP", "🔄 Executing GROUP command (Packet Mode)");
  DEBUG_MGR.info("GROUP", "└─ Commands: " + groupCommands);
  DEBUG_MGR.info("GROUP", "└─ Using single packet transmission");

  groupExecutionActive = true;
  handleGroupExecution(groupCommands);

  groupCommandTimer = millis() + 100;
  waitingForGroupDelay = true;

  DEBUG_MGR.info("GROUP", "└─ GROUP setup complete, waiting for delay...");
}

void PalletizerMaster::onGroupCommand(const String& groupCommands) {
  DEBUG_SERIAL_PRINTLN("MASTER: GROUP command callback received from Runtime");
  processGroupCommand(groupCommands);
}

void PalletizerMaster::addCommandToQueue(const String& command) {
  runtime->addCommandToQueue(command);
}

bool PalletizerMaster::canProcessNextCommand() {
  bool runtimeCanProcess = runtime->canProcessNextCommand();
  bool masterCanProcess = !waitingForGroupDelay && !groupExecutionActive && !sequenceRunning && !waitingForCompletion;

  if (!masterCanProcess) {
    DEBUG_SERIAL_PRINTLN("MASTER: Blocking processNextCommand - master state busy");
  }

  return runtimeCanProcess && masterCanProcess;
}

void PalletizerMaster::onCommandReceived(const String& data) {
  DEBUG_SERIAL_PRINTLN("COMMAND→MASTER: " + data);

  String trimmedData = data;
  trimmedData.trim();
  String upperData = trimmedData;
  upperData.toUpperCase();

  if (upperData.startsWith("PACKET_MODE;")) {
    String mode = trimmedData.substring(12);
    mode.toUpperCase();

    if (mode == "BATCH") {
      protocol->setPacketMode(PalletizerProtocol::PACKET_MODE_BATCH);
      DEBUG_SERIAL_PRINTLN("MASTER: Switched to BATCH packet mode");
    } else if (mode == "LEGACY") {
      protocol->setPacketMode(PalletizerProtocol::PACKET_MODE_LEGACY);
      DEBUG_SERIAL_PRINTLN("MASTER: Switched to LEGACY packet mode");
    }
    return;
  }

  if (upperData.startsWith("SPEED;")) {
    protocol->sendSpeedCommand(trimmedData);
    return;
  }

  if (upperData == "IDLE" || upperData == "PLAY" || upperData == "PAUSE" || upperData == "STOP") {
    processSystemStateCommand(upperData);
    return;
  }

  if (upperData == "ZERO") {
    DEBUG_MGR.info("SYSTEM", "⚙️ Executing ZERO (Homing) command");
    protocol->sendCommandToAllSlaves(PalletizerProtocol::CMD_ZERO);
    delay(100);
    sequenceRunning = true;
    waitingForCompletion = true;
    lastCheckTime = millis();
    return;
  }

  if (upperData.startsWith("SET(") || upperData == "WAIT" || upperData == "DETECT") {
    if (canProcessNextCommand()) {
      runtime->addCommandToQueue(trimmedData);
    } else {
      DEBUG_SERIAL_PRINTLN("MASTER: Cannot queue command - system busy");
    }
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
    runtime->processScriptCommand(trimmedData);
    return;
  }

  if (upperData == "END_QUEUE") {
    DEBUG_SERIAL_PRINTLN("MASTER: Queue loading completed");
    return;
  }

  if (shouldClearQueue(trimmedData)) {
    runtime->clearQueue();
  }

  DEBUG_SERIAL_PRINTLN("MASTER: Processing as inline commands");
  parseInlineCommands(trimmedData);
}

void PalletizerMaster::onSlaveData(const String& data) {
  DEBUG_MGR.info("SLAVE→MASTER", data);

  if (slaveDataCallback) {
    slaveDataCallback(data);
  }

  bool isSequenceCompleted = data.indexOf("SEQUENCE COMPLETED") != -1;
  bool isPositionReached = data.indexOf("POSITION REACHED") != -1;

  if (runtime->isSingleCommandExecuting() && (isSequenceCompleted || isPositionReached)) {
    DEBUG_SERIAL_PRINTLN("MASTER: Single command completed (message-based)");
    runtime->notifySingleCommandComplete();
    return;
  }

  if (sequenceRunning && waitingForCompletion && isSequenceCompleted) {
    handleSequenceCompletion();
    return;
  }

  if (isPositionReached) {
    String axis = data.substring(0, data.indexOf(";"));
    axis.toUpperCase();
    DEBUG_MGR.info("MOTION", "✅ " + axis + " axis reached target position");
  }

  if (groupExecutionActive && data.indexOf("ERROR") != -1) {
    DEBUG_MGR.error("GROUP", "❌ Error in GROUP execution - aborting sequence");
    runtime->clearQueue();
    setSystemState(STATE_IDLE);
    resetExecutionFlags();
  }
}

void PalletizerMaster::handleSequenceCompletion() {
  DEBUG_SERIAL_PRINTLN("MASTER: Sequence completed - processing next command");

  resetExecutionFlags();

  if (!runtime->isQueueEmpty() && systemState == STATE_RUNNING) {
    DEBUG_SERIAL_PRINTLN("MASTER: Triggering next command from queue");
    if (canProcessNextCommand()) {
      runtime->triggerNextCommand();
    }
  } else if (runtime->isQueueEmpty() && systemState == STATE_RUNNING) {
    PalletizerRuntime::ExecutionInfo execInfo = runtime->getExecutionInfo();
    if (execInfo.isExecuting) {
      runtime->updateExecutionInfo(false);
    }
    setSystemState(STATE_IDLE);
  } else if (systemState == STATE_STOPPING) {
    runtime->clearQueue();
    setSystemState(STATE_IDLE);
  }
}

void PalletizerMaster::resetExecutionFlags() {
  sequenceRunning = false;
  waitingForCompletion = false;
  groupExecutionActive = false;
  waitingForGroupDelay = false;
}

void PalletizerMaster::onSystemStateChange(const String& newState) {
  if (newState == "PAUSE") {
    setSystemState(STATE_PAUSED);
  } else if (newState == "IDLE") {
    setSystemState(STATE_IDLE);
  }
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
    bool isSystemBusy = sequenceRunning || runtime->isSingleCommandExecuting() || runtime->isWaitingForSync() || runtime->isWaitingForDetect();

    if (systemState == STATE_RUNNING || systemState == STATE_PAUSED) {
      if (isSystemBusy) {
        setSystemState(STATE_STOPPING);
      } else {
        runtime->clearQueue();
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

    if (runtime->isQueueEmpty()) {
      runtime->loadCommandsFromFile();
    }

    runtime->updateExecutionInfo(true);
    setSystemState(STATE_RUNNING);

    bool canStart = !sequenceRunning && !waitingForCompletion && !runtime->isQueueEmpty() && !runtime->isSingleCommandExecuting();
    if (canStart && canProcessNextCommand()) {
      runtime->triggerNextCommand();
    }
  } else if (command == "PAUSE") {
    setSystemState(STATE_PAUSED);
  } else if (command == "STOP") {
    bool isSystemBusy = sequenceRunning || runtime->isSingleCommandExecuting() || runtime->isWaitingForSync() || runtime->isWaitingForDetect();

    if (isSystemBusy) {
      setSystemState(STATE_STOPPING);
    } else {
      runtime->clearQueue();
      setSystemState(STATE_IDLE);
    }
  }
}

void PalletizerMaster::setSystemState(SystemState newState) {
  if (systemState != newState) {
    systemState = newState;
    DEBUG_SERIAL_PRINTLN("MASTER: System state changed to " + String(systemState));

    runtime->setSystemRunning(newState == STATE_RUNNING);
    sendStateUpdate();

    bool canStart = newState == STATE_RUNNING && !sequenceRunning && !waitingForCompletion && !runtime->isQueueEmpty() && !runtime->isSingleCommandExecuting();
    if (canStart && canProcessNextCommand()) {
      runtime->triggerNextCommand();
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

bool PalletizerMaster::checkAllSlavesCompleted() {
  if (!indicatorEnabled) {
    return false;
  }
  return digitalRead(indicatorPin) == HIGH;
}

void PalletizerMaster::handleIndicatorBasedCompletion() {
  if (millis() - lastCheckTime > 50) {
    lastCheckTime = millis();

    bool allCompleted = checkAllSlavesCompleted();

    if (allCompleted) {
      if (runtime->isSingleCommandExecuting()) {
        DEBUG_SERIAL_PRINTLN("MASTER: Single command completed (indicator-based)");
        runtime->notifySingleCommandComplete();
        return;
      }

      if (sequenceRunning && waitingForCompletion) {
        DEBUG_MGR.info("EXECUTOR", "All slaves completed sequence (indicator-based)");
        handleSequenceCompletion();
      }
    }
  }
}

void PalletizerMaster::handleGroupExecution(const String& groupCommands) {
  protocol->sendGroupCommands(groupCommands);
  DEBUG_MGR.info("PROTOCOL", "GROUP command sent as single packet");
}

bool PalletizerMaster::shouldClearQueue(const String& data) {
  bool isCoordinateCmd = data.indexOf('(') != -1;
  return isCoordinateCmd;
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

void PalletizerMaster::parseInlineCommands(const String& commands) {
  runtime->processInlineCommands(commands);
}

void PalletizerMaster::onSlaveDataWrapper(const String& data) {
  if (instance) {
    instance->onSlaveData(data);
  }
}

void PalletizerMaster::onSystemStateChangeWrapper(const String& newState) {
  if (instance) {
    instance->onSystemStateChange(newState);
  }
}

void PalletizerMaster::onGroupCommandWrapper(const String& groupCommands) {
  if (instance) {
    instance->onGroupCommand(groupCommands);
  }
}