#include "PalletizerMaster.h"
#include "PalletizerProtocol.h"
#include "FlashManager.h"
#include "CommandRouter.h"
#include "SimpleExecutor.h"

PalletizerMaster* PalletizerMaster::instance = nullptr;

PalletizerMaster::PalletizerMaster(int rxPin, int txPin)
  : protocol(nullptr), flashManager(nullptr), commandRouter(nullptr), executor(nullptr),
    systemState(STATE_IDLE), slaveDataCallback(nullptr),
    ledIndicator{
      DigitalOut(27, true),
      DigitalOut(14, true),
      DigitalOut(13, true),
    } {

  instance = this;
  protocol = new PalletizerProtocol(rxPin, txPin);
  flashManager = new FlashManager();
  commandRouter = new CommandRouter(protocol);
  executor = new SimpleExecutor(flashManager, commandRouter);
}

PalletizerMaster::~PalletizerMaster() {
  delete protocol;
  delete flashManager;
  delete commandRouter;
  delete executor;
}

void PalletizerMaster::begin() {
  protocol->begin();
  protocol->setDataCallback(onSlaveDataWrapper);

  flashManager->begin();

  commandRouter->setCompletionCallback(nullptr);

  executor->begin();
  executor->setStateChangeCallback(onExecutionStateWrapper);

  systemState = STATE_IDLE;
  sendStateUpdate();

  DEBUG_SERIAL_PRINTLN("MASTER: Batch Processing System initialized");
  DEBUG_SERIAL_PRINTLN("MASTER: Flash storage ready for command upload");
}

void PalletizerMaster::update() {
  protocol->update();
  executor->update();

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

bool PalletizerMaster::uploadCommands(const String& commands) {
  if (!flashManager) {
    return false;
  }

  DEBUG_SERIAL_PRINTLN("MASTER: Uploading commands to flash storage");
  bool success = flashManager->storeCommands(commands);

  if (success) {
    DEBUG_SERIAL_PRINTLN("MASTER: Commands uploaded successfully");
    DEBUG_SERIAL_PRINTLN("MASTER: " + flashManager->getStorageInfo());
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Failed to upload commands");
  }

  return success;
}

bool PalletizerMaster::startExecution() {
  if (!executor) {
    return false;
  }

  DEBUG_SERIAL_PRINTLN("MASTER: Starting batch execution");
  bool success = executor->startExecution();

  if (success) {
    setSystemState(STATE_RUNNING);
  }

  return success;
}

void PalletizerMaster::pauseExecution() {
  if (executor) {
    DEBUG_SERIAL_PRINTLN("MASTER: Pausing execution");
    executor->pauseExecution();
    setSystemState(STATE_PAUSED);
  }
}

void PalletizerMaster::stopExecution() {
  if (executor) {
    DEBUG_SERIAL_PRINTLN("MASTER: Stopping execution");
    executor->stopExecution();
    setSystemState(STATE_IDLE);
  }
}

String PalletizerMaster::getExecutionStatus() {
  if (!executor) {
    return "{\"status\":\"IDLE\",\"current_line\":0,\"total_lines\":0,\"progress\":0}";
  }

  String status = "IDLE";
  switch (executor->getState()) {
    case SimpleExecutor::RUNNING: status = "RUNNING"; break;
    case SimpleExecutor::PAUSED: status = "PAUSED"; break;
    case SimpleExecutor::STOPPING: status = "STOPPING"; break;
    default: status = "IDLE"; break;
  }

  String json = "{";
  json += "\"status\":\"" + status + "\",";
  json += "\"current_line\":" + String(executor->getCurrentLine()) + ",";
  json += "\"total_lines\":" + String(executor->getTotalLines()) + ",";
  json += "\"progress\":" + String(executor->getProgress()) + ",";
  json += "\"current_command\":\"" + executor->getCurrentCommand() + "\",";
  json += "\"timestamp\":" + String(millis());
  json += "}";

  return json;
}

FlashManager* PalletizerMaster::getFlashManager() {
  return flashManager;
}

void PalletizerMaster::onCommandReceived(const String& data) {
  DEBUG_SERIAL_PRINTLN("COMMAND→MASTER: " + data);

  String trimmedData = data;
  trimmedData.trim();
  String upperData = trimmedData;
  upperData.toUpperCase();

  if (upperData == "PLAY") {
    startExecution();
  } else if (upperData == "PAUSE") {
    pauseExecution();
  } else if (upperData == "STOP" || upperData == "IDLE") {
    stopExecution();
  } else if (upperData == "ZERO") {
    DEBUG_SERIAL_PRINTLN("MASTER: Executing ZERO command");
    if (commandRouter) {
      commandRouter->routeCommand("ZERO");
    }
  } else if (upperData.startsWith("SPEED;")) {
    DEBUG_SERIAL_PRINTLN("MASTER: Executing SPEED command");
    if (commandRouter) {
      commandRouter->routeCommand(trimmedData);
    }
  } else {
    DEBUG_SERIAL_PRINTLN("MASTER: Unknown command: " + trimmedData);
  }
}

void PalletizerMaster::onSlaveData(const String& data) {
  DEBUG_SERIAL_PRINTLN("SLAVE→MASTER: " + data);

  if (slaveDataCallback) {
    slaveDataCallback(data);
  }
}

void PalletizerMaster::onExecutionStateChange(int state) {
  switch (state) {
    case 0:  // SimpleExecutor::IDLE
      setSystemState(STATE_IDLE);
      break;
    case 1:  // SimpleExecutor::RUNNING
      setSystemState(STATE_RUNNING);
      break;
    case 2:  // SimpleExecutor::PAUSED
      setSystemState(STATE_PAUSED);
      break;
    case 3:  // SimpleExecutor::STOPPING
      setSystemState(STATE_STOPPING);
      break;
  }
}

void PalletizerMaster::setSystemState(SystemState newState) {
  if (systemState != newState) {
    systemState = newState;
    DEBUG_SERIAL_PRINTLN("MASTER: System state changed to " + String(systemState));
    sendStateUpdate();
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

void PalletizerMaster::onSlaveDataWrapper(const String& data) {
  if (instance) {
    instance->onSlaveData(data);
  }
}

void PalletizerMaster::onExecutionStateWrapper(int state) {
  if (instance) {
    instance->onExecutionStateChange(state);
  }
}