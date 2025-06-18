#ifndef PALLETIZER_SLAVE_H
#define PALLETIZER_SLAVE_H

#include "Arduino.h"
#include "MotorController.h"
#include "CommandParser.h"
#include "SlaveStatusManager.h"

class PalletizerSlave {
public:
  enum SystemState {
    INITIALIZING,
    READY,
    BUSY,
    ERROR,
    EMERGENCY_STOP
  };

  static PalletizerSlave* getInstance();

  void begin();
  void loop();
  void end();

  SystemState getState() const {
    return currentState;
  }
  void setState(SystemState newState);

  MotorController* getMotorController() {
    return motorController;
  }
  CommandParser* getCommandParser() {
    return commandParser;
  }
  SlaveStatusManager* getStatusManager() {
    return statusManager;
  }

  void processSerialInput();
  void sendResponse(const String& response);
  void sendStatus();
  void sendPosition();
  void sendError(const String& error);

  void handleEmergencyStop();
  void handleResume();

  void setStateChangeCallback(void (*callback)(SystemState));
  void setErrorCallback(void (*callback)(const String&));

private:
  static PalletizerSlave* instance;
  PalletizerSlave();
  ~PalletizerSlave();

  MotorController* motorController;
  CommandParser* commandParser;
  SlaveStatusManager* statusManager;

  SystemState currentState;
  unsigned long lastStatusUpdate;
  unsigned long lastHeartbeat;

  String serialBuffer;

  void (*stateChangeCallback)(SystemState);
  void (*errorCallback)(const String&);

  void initializeComponents();
  void cleanupComponents();
  void processCommand(const String& command);
  void handlePeriodicTasks();

  static void onMotionCompleteWrapper();
  static void onPositionChangeWrapper(const MotorController::Position& position);
  static void onMotionStateChangeWrapper(MotorController::MotionState state);
  static void onCommandResponseWrapper(const String& response);
  static void onCommandErrorWrapper(const String& error);

  void onMotionComplete();
  void onPositionChange(const MotorController::Position& position);
  void onMotionStateChange(MotorController::MotionState state);
  void onCommandResponse(const String& response);
  void onCommandError(const String& error);

  void notifyStateChange(SystemState state);
  void notifyError(const String& error);

  static const unsigned long STATUS_UPDATE_INTERVAL = 500;
  static const unsigned long HEARTBEAT_INTERVAL = 1000;
  static const unsigned long SERIAL_BAUD_RATE = 115200;
};

#endif