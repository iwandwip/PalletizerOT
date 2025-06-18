#include "PalletizerSlave.h"

// Static instance for Singleton pattern
PalletizerSlave* PalletizerSlave::instance = nullptr;

PalletizerSlave* PalletizerSlave::getInstance() {
  if (instance == nullptr) {
    instance = new PalletizerSlave();
  }
  return instance;
}

PalletizerSlave::PalletizerSlave() 
  : motorController(nullptr), commandParser(nullptr), statusManager(nullptr),
    currentState(INITIALIZING), lastStatusUpdate(0), lastHeartbeat(0),
    stateChangeCallback(nullptr), errorCallback(nullptr) {
}

PalletizerSlave::~PalletizerSlave() {
  cleanupComponents();
}

void PalletizerSlave::begin() {
  Serial.begin(SERIAL_BAUD_RATE);
  
  initializeComponents();
  
  setState(READY);
  
  Serial.println("PalletizerSlave ready!");
}

void PalletizerSlave::loop() {
  processSerialInput();
  
  if (motorController) {
    motorController->run();
  }
  
  handlePeriodicTasks();
  
  if (statusManager) {
    statusManager->updateLoopTiming();
  }
}

void PalletizerSlave::end() {
  setState(INITIALIZING);
  cleanupComponents();
}

void PalletizerSlave::initializeComponents() {
  // Initialize motor controller
  motorController = new MotorController();
  motorController->begin();
  
  // Initialize command parser
  commandParser = new CommandParser(motorController);
  commandParser->setResponseCallback(onCommandResponseWrapper);
  commandParser->setErrorCallback(onCommandErrorWrapper);
  
  // Initialize status manager
  statusManager = new SlaveStatusManager(motorController);
}

void PalletizerSlave::cleanupComponents() {
  if (statusManager) {
    delete statusManager;
    statusManager = nullptr;
  }
  
  if (commandParser) {
    delete commandParser;
    commandParser = nullptr;
  }
  
  if (motorController) {
    delete motorController;
    motorController = nullptr;
  }
}

void PalletizerSlave::setState(SystemState newState) {
  if (currentState != newState) {
    currentState = newState;
    notifyStateChange(newState);
  }
}

void PalletizerSlave::processSerialInput() {
  while (Serial.available()) {
    char c = Serial.read();
    
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
    }
  }
}

void PalletizerSlave::processCommand(const String& command) {
  if (currentState == ERROR || currentState == EMERGENCY_STOP) {
    sendError("System in error state");
    return;
  }
  
  if (commandParser) {
    bool success = commandParser->processCommand(command);
    
    if (success) {
      setState(BUSY);
      if (statusManager) {
        statusManager->recordCommandProcessed();
      }
    } else {
      if (statusManager) {
        statusManager->recordCommandError("Command processing failed");
      }
    }
  }
}

void PalletizerSlave::sendResponse(const String& response) {
  Serial.println(response);
}

void PalletizerSlave::sendStatus() {
  if (commandParser) {
    String status = commandParser->generateStatusResponse();
    sendResponse(status);
  }
}

void PalletizerSlave::sendPosition() {
  if (commandParser) {
    String position = commandParser->generatePositionResponse();
    sendResponse(position);
  }
}

void PalletizerSlave::sendError(const String& error) {
  if (commandParser) {
    String errorResponse = commandParser->generateErrorResponse(error);
    sendResponse(errorResponse);
  }
}

void PalletizerSlave::handleEmergencyStop() {
  if (motorController) {
    motorController->emergencyStop();
  }
  setState(EMERGENCY_STOP);
  sendError("Emergency stop activated");
}

void PalletizerSlave::handleResume() {
  if (currentState == EMERGENCY_STOP) {
    setState(READY);
    sendResponse("D"); // Done - ready to accept commands
  }
}

void PalletizerSlave::handlePeriodicTasks() {
  unsigned long currentTime = millis();
  
  // Status updates
  if (currentTime - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    if (statusManager) {
      statusManager->updateStatus();
    }
    lastStatusUpdate = currentTime;
  }
  
  // Heartbeat
  if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    if (statusManager) {
      statusManager->performHealthCheck();
    }
    lastHeartbeat = currentTime;
  }
  
  // Check if motors are done moving
  if (currentState == BUSY && motorController && !motorController->isMoving()) {
    setState(READY);
    sendResponse("D"); // Done
  }
}

void PalletizerSlave::setStateChangeCallback(void (*callback)(SystemState)) {
  stateChangeCallback = callback;
}

void PalletizerSlave::setErrorCallback(void (*callback)(const String&)) {
  errorCallback = callback;
}

void PalletizerSlave::notifyStateChange(SystemState state) {
  if (stateChangeCallback) {
    stateChangeCallback(state);
  }
}

void PalletizerSlave::notifyError(const String& error) {
  if (errorCallback) {
    errorCallback(error);
  }
}

// Static callback wrappers
void PalletizerSlave::onMotionCompleteWrapper() {
  if (instance) {
    instance->onMotionComplete();
  }
}

void PalletizerSlave::onPositionChangeWrapper(const MotorController::Position& position) {
  if (instance) {
    instance->onPositionChange(position);
  }
}

void PalletizerSlave::onMotionStateChangeWrapper(MotorController::MotionState state) {
  if (instance) {
    instance->onMotionStateChange(state);
  }
}

void PalletizerSlave::onCommandResponseWrapper(const String& response) {
  if (instance) {
    instance->onCommandResponse(response);
  }
}

void PalletizerSlave::onCommandErrorWrapper(const String& error) {
  if (instance) {
    instance->onCommandError(error);
  }
}

// Instance callback handlers
void PalletizerSlave::onMotionComplete() {
  setState(READY);
  sendResponse("D"); // Done
}

void PalletizerSlave::onPositionChange(const MotorController::Position& position) {
  // Position updates can be sent if needed
  // For now, we'll just update status
}

void PalletizerSlave::onMotionStateChange(MotorController::MotionState state) {
  switch (state) {
    case MotorController::MOTION_IDLE:
      if (currentState == BUSY) {
        setState(READY);
      }
      break;
    case MotorController::MOTION_MOVING:
      setState(BUSY);
      break;
    case MotorController::MOTION_ERROR:
      setState(ERROR);
      sendError("Motor motion error");
      break;
  }
}

void PalletizerSlave::onCommandResponse(const String& response) {
  sendResponse(response);
}

void PalletizerSlave::onCommandError(const String& error) {
  setState(ERROR);
  sendError(error);
  notifyError(error);
}