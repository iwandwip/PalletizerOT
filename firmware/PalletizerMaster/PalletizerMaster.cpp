#include "PalletizerMaster.h"
#include "DebugManager.h"

PalletizerMaster* PalletizerMaster::instance = nullptr;

PalletizerMaster::PalletizerMaster(int rxPin, int txPin, int indicatorPin)
  : rxPin(rxPin), txPin(txPin), rxIndicatorLed(2), indicatorPin(indicatorPin),
    syncSetPin(SYNC_SET_PIN), syncWaitPin(SYNC_WAIT_PIN), waitingForSync(false), waitStartTime(0),
    scriptParser(this), commandProcessor(this, &queueManager, &scriptParser),
    ledIndicator{
      DigitalOut(27, true),
      DigitalOut(14, true),
      DigitalOut(13, true),
    } {
  instance = this;
  indicatorEnabled = (indicatorPin != -1);
}

void PalletizerMaster::begin() {
  slaveCommSerial.begin(9600, SERIAL_8N1, rxPin, txPin);
  slaveSerial.begin(&slaveCommSerial);

  pinMode(syncSetPin, OUTPUT);
  pinMode(syncWaitPin, INPUT_PULLDOWN);
  digitalWrite(syncSetPin, LOW);

  if (indicatorEnabled) {
    pinMode(indicatorPin, INPUT_PULLUP);
    DEBUG_PRINTLN("MASTER: Indicator pin enabled on pin " + String(indicatorPin));
  } else {
    DEBUG_PRINTLN("MASTER: Indicator pin disabled");
  }

  if (!queueManager.begin()) {
    DEBUG_PRINTLN("MASTER: Failed to initialize queue manager");
  } else {
    DEBUG_PRINTLN("MASTER: Queue manager initialized");
  }

  systemState = STATE_IDLE;
  sendStateUpdate();
  DEBUG_PRINTLN("MASTER: System initialized");
  DEBUG_PRINTLN("MASTER: Sync pins initialized - Set:" + String(syncSetPin) + " Wait:" + String(syncWaitPin));
}

void PalletizerMaster::update() {
  checkSlaveData();

  if (waitingForGroupDelay && millis() >= groupCommandTimer) {
    waitingForGroupDelay = false;
    sequenceRunning = true;
    waitingForCompletion = indicatorEnabled;
    lastCheckTime = millis();

    if (indicatorEnabled) {
      DEBUG_PRINTLN("MASTER: Starting completion monitoring for GROUP command");
    }
  }

  if (waitingForSync) {
    if (digitalRead(syncWaitPin) == HIGH) {
      DEBUG_MGR.sync("WAIT", "Sync signal received - continuing execution");
      waitingForSync = false;
      updateTimeoutStats(true);

      if (!queueManager.isQueueEmpty() && systemState == STATE_RUNNING) {
        processNextCommand();
      }
    } else if (checkSyncTimeout()) {
      handleWaitTimeout();
    }

    return;
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

        if (!queueManager.isQueueEmpty() && systemState == STATE_RUNNING) {
          DEBUG_PRINTLN("MASTER: Processing next command from queue");
          processNextCommand();
        } else if (queueManager.isQueueEmpty() && systemState == STATE_RUNNING) {
          if (queueManager.getExecutionInfo().isExecuting) {
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
    instance->commandProcessor.processCommand(data);
  }
}

PalletizerMaster::SystemState PalletizerMaster::getSystemState() {
  return systemState;
}

void PalletizerMaster::setSystemState(SystemState newState) {
  if (systemState != newState) {
    systemState = newState;
    DEBUG_PRINTLN("MASTER: System state changed to " + String(systemState));
    sendStateUpdate();

    if (newState == STATE_RUNNING && !sequenceRunning && !waitingForCompletion && !queueManager.isQueueEmpty()) {
      processNextCommand();
    }
  }
}

void PalletizerMaster::setSyncPin(bool high) {
  digitalWrite(syncSetPin, high ? HIGH : LOW);
}

void PalletizerMaster::setWaitingForSync(bool waiting) {
  waitingForSync = waiting;
  if (waiting) {
    waitStartTime = millis();
    waitStartTimeForStats = millis();
  }
}

bool PalletizerMaster::isSequenceRunning() {
  return sequenceRunning;
}

bool PalletizerMaster::isWaitingForCompletion() {
  return waitingForCompletion;
}

void PalletizerMaster::startSequence() {
  sequenceRunning = true;
  waitingForCompletion = indicatorEnabled;
  lastCheckTime = millis();

  if (indicatorEnabled) {
    DEBUG_PRINTLN("MASTER: Starting completion monitoring");
  }
}

void PalletizerMaster::processNextCommand() {
  static bool processingCommand = false;

  if (processingCommand) {
    DEBUG_PRINTLN("MASTER: Already processing command, skipping duplicate");
    return;
  }

  if (queueManager.isQueueEmpty()) {
    DEBUG_PRINTLN("MASTER: Command queue is empty");
    return;
  }

  if (systemState != STATE_RUNNING) {
    DEBUG_PRINTLN("MASTER: Not processing command because system is not in RUNNING state");
    return;
  }

  processingCommand = true;
  String command = queueManager.getFromQueue();
  queueManager.getExecutionInfo().currentCommand++;

  DEBUG_MGR.sequence("EXECUTOR", queueManager.getExecutionInfo().currentCommand, queueManager.getExecutionInfo().totalCommands, "Executing: " + command);
  logExecutionProgress();

  commandProcessor.onCommandReceived(command);
  processingCommand = false;
}

void PalletizerMaster::setGroupExecutionActive(bool active) {
  groupExecutionActive = active;
}

void PalletizerMaster::startGroupDelay() {
  groupCommandTimer = millis() + 100;
  waitingForGroupDelay = true;
}

void PalletizerMaster::setTimeoutConfig(const QueueManager::TimeoutConfig& config) {
  queueManager.setTimeoutConfig(config);
  DEBUG_PRINTLN("MASTER: Timeout config updated - timeout:" + String(config.maxWaitTime) + "ms strategy:" + String(config.strategy));
}

QueueManager::TimeoutConfig PalletizerMaster::getTimeoutConfig() {
  return queueManager.getTimeoutConfig();
}

void PalletizerMaster::setWaitTimeout(unsigned long timeoutMs) {
  QueueManager::TimeoutConfig config = queueManager.getTimeoutConfig();
  config.maxWaitTime = timeoutMs;
  queueManager.setTimeoutConfig(config);
  DEBUG_PRINTLN("MASTER: Wait timeout set to " + String(timeoutMs) + "ms");
}

void PalletizerMaster::setTimeoutStrategy(QueueManager::WaitTimeoutStrategy strategy) {
  QueueManager::TimeoutConfig config = queueManager.getTimeoutConfig();
  config.strategy = strategy;
  queueManager.setTimeoutConfig(config);
  DEBUG_PRINTLN("MASTER: Timeout strategy set to " + String(strategy));
}

void PalletizerMaster::setMaxTimeoutWarning(int maxWarning) {
  QueueManager::TimeoutConfig config = queueManager.getTimeoutConfig();
  config.maxTimeoutWarning = maxWarning;
  queueManager.setTimeoutConfig(config);
  DEBUG_PRINTLN("MASTER: Max timeout warning set to " + String(maxWarning));
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
  DEBUG_PRINTLN("MASTER: Timeout statistics cleared");
}

float PalletizerMaster::getTimeoutSuccessRate() {
  int totalAttempts = timeoutStats.totalTimeouts + timeoutStats.successfulWaits;
  if (totalAttempts == 0) return 100.0;
  return (float(timeoutStats.successfulWaits) / float(totalAttempts)) * 100.0;
}

QueueManager& PalletizerMaster::getQueueManager() {
  return queueManager;
}

CommandProcessor& PalletizerMaster::getCommandProcessor() {
  return commandProcessor;
}

PalletizerScriptParser* PalletizerMaster::getScriptParser() {
  return &scriptParser;
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

void PalletizerMaster::onSlaveData(const String& data) {
  DEBUG_MGR.info("SLAVE→MASTER", data);

  if (!indicatorEnabled && waitingForCompletion && sequenceRunning) {
    if (data.indexOf("SEQUENCE COMPLETED") != -1) {
      sequenceRunning = false;
      waitingForCompletion = false;
      groupExecutionActive = false;
      DEBUG_PRINTLN("MASTER: All slaves completed sequence (based on message)");

      if (!queueManager.isQueueEmpty() && systemState == STATE_RUNNING) {
        DEBUG_PRINTLN("MASTER: Processing next command from queue");
        processNextCommand();
      } else if (queueManager.isQueueEmpty() && systemState == STATE_RUNNING) {
        if (queueManager.getExecutionInfo().isExecuting) {
          logExecutionProgress();
          updateExecutionInfo(false);
        }
        setSystemState(STATE_IDLE);
      } else if (systemState == STATE_STOPPING) {
        queueManager.clearQueue();
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
    queueManager.clearQueue();
    setSystemState(STATE_IDLE);
    groupExecutionActive = false;
  }
}

bool PalletizerMaster::checkAllSlavesCompleted() {
  if (!indicatorEnabled) {
    return false;
  }
  return digitalRead(indicatorPin) == HIGH;
}

bool PalletizerMaster::checkSyncTimeout() {
  QueueManager::TimeoutConfig config = queueManager.getTimeoutConfig();
  return waitingForSync && (millis() - waitStartTime) > config.maxWaitTime;
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
  DEBUG_PRINTLN("MASTER: STATE:" + stateStr);
}

void PalletizerMaster::handleWaitTimeout() {
  QueueManager::TimeoutConfig config = queueManager.getTimeoutConfig();
  updateTimeoutStats(false);

  switch (config.strategy) {
    case QueueManager::TIMEOUT_SKIP_CONTINUE:
      DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout #" + String(timeoutStats.totalTimeouts) + " - skipping and continuing");
      waitingForSync = false;

      if (timeoutStats.totalTimeouts >= config.maxTimeoutWarning) {
        DEBUG_PRINTLN("MASTER: WARNING - Frequent WAIT timeouts detected!");

        if (timeoutStats.totalTimeouts >= config.maxTimeoutWarning * 2) {
          DEBUG_PRINTLN("MASTER: Too many timeouts - auto pausing");
          setSystemState(STATE_PAUSED);
          return;
        }
      }

      if (!queueManager.isQueueEmpty() && systemState == STATE_RUNNING) {
        processNextCommand();
      }
      break;

    case QueueManager::TIMEOUT_PAUSE_SYSTEM:
      DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout - pausing system for user intervention");
      waitingForSync = false;
      setSystemState(STATE_PAUSED);
      break;

    case QueueManager::TIMEOUT_ABORT_RESET:
      DEBUG_MGR.error("TIMEOUT", "❌ WAIT timeout - aborting sequence and resetting");
      waitingForSync = false;
      queueManager.clearQueue();
      setSystemState(STATE_IDLE);
      break;

    case QueueManager::TIMEOUT_RETRY_BACKOFF:
      if (timeoutStats.currentRetryCount < config.autoRetryCount) {
        timeoutStats.currentRetryCount++;
        DEBUG_MGR.warning("TIMEOUT", "⚠️ WAIT timeout - retry " + String(timeoutStats.currentRetryCount) + "/" + String(config.autoRetryCount));
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
    DEBUG_PRINTLN("MASTER: WAIT successful - resetting timeout counter");
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

void PalletizerMaster::updateExecutionInfo(bool start) {
  static bool executionActive = false;

  if (start) {
    if (executionActive || executionInfoActive) {
      DEBUG_PRINTLN("MASTER: Execution already active, ignoring duplicate start");
      return;
    }

    executionActive = true;
    executionInfoActive = true;
    queueManager.updateExecutionInfo(true);

    DEBUG_MGR.info("EXECUTOR", "▶️ EXECUTION STARTED");
  } else {
    if (!executionActive || !executionInfoActive) {
      DEBUG_PRINTLN("MASTER: Execution not active, ignoring duplicate end");
      return;
    }

    executionActive = false;
    executionInfoActive = false;
    queueManager.updateExecutionInfo(false);
    unsigned long totalTime = millis() - queueManager.getExecutionInfo().executionStartTime;

    DEBUG_MGR.separator();
    DEBUG_MGR.info("PERFORMANCE", "📊 Execution Summary:");
    DEBUG_MGR.info("PERFORMANCE", "├─ Total Time: " + String(totalTime / 1000) + "s");
    DEBUG_MGR.info("PERFORMANCE", "├─ Commands: " + String(queueManager.getExecutionInfo().currentCommand) + "/" + String(queueManager.getExecutionInfo().totalCommands) + " (100%)");
    DEBUG_MGR.info("PERFORMANCE", "├─ Success Rate: " + String(getTimeoutSuccessRate(), 1) + "%");
    DEBUG_MGR.info("PERFORMANCE", "└─ Avg Command Time: " + String(totalTime / queueManager.getExecutionInfo().totalCommands) + "ms");
    DEBUG_MGR.separator();
  }
}

void PalletizerMaster::logExecutionProgress() {
  static unsigned long lastProgressTime = 0;
  static int lastProgressCommand = -1;

  unsigned long currentTime = millis();

  if ((currentTime - lastProgressTime < 500 && queueManager.getExecutionInfo().currentCommand == lastProgressCommand) || progressLoggingActive) {
    return;
  }

  lastProgressTime = currentTime;
  lastProgressCommand = queueManager.getExecutionInfo().currentCommand;
  progressLoggingActive = true;

  if (queueManager.getExecutionInfo().totalCommands > 0) {
    DEBUG_MGR.progress(queueManager.getExecutionInfo().currentCommand, queueManager.getExecutionInfo().totalCommands, "Execution Progress");
  }

  progressLoggingActive = false;
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