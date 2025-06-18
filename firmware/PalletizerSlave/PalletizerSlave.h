#ifndef PALLETIZER_SLAVE_H
#define PALLETIZER_SLAVE_H

#include <Arduino.h>
#include "MotorController.h"
#include "CommandParser.h"
#include "SlaveStatusManager.h"

/**
 * PalletizerSlave - Arduino Mega 5-Motor Controller
 * NEW ARCHITECTURE: Laptop Server → ESP32 Master → Arduino Mega Slave
 * 
 * Implements OOP design patterns similar to old firmware:
 * - Singleton Pattern for global access
 * - Observer Pattern for status updates
 * - Command Pattern for message handling
 */
class PalletizerSlave {
public:
    enum SystemState {
        INITIALIZING,
        READY,
        BUSY,
        ERROR,
        EMERGENCY_STOP
    };

    // Singleton access
    static PalletizerSlave* getInstance();
    
    // Lifecycle management
    void begin();
    void loop();
    void end();
    
    // State management
    SystemState getState() const { return currentState; }
    void setState(SystemState newState);
    
    // Component access
    MotorController* getMotorController() { return motorController; }
    CommandParser* getCommandParser() { return commandParser; }
    SlaveStatusManager* getStatusManager() { return statusManager; }
    
    // Communication
    void processSerialInput();
    void sendResponse(const String& response);
    void sendStatus();
    void sendPosition();
    void sendError(const String& error);
    
    // System commands
    void handleEmergencyStop();
    void handleResume();
    
    // Callback registration
    void setStateChangeCallback(void (*callback)(SystemState));
    void setErrorCallback(void (*callback)(const String&));

private:
    // Singleton pattern
    static PalletizerSlave* instance;
    PalletizerSlave();
    ~PalletizerSlave();
    
    // Components (Dependency Injection)
    MotorController* motorController;
    CommandParser* commandParser;
    SlaveStatusManager* statusManager;
    
    // State management
    SystemState currentState;
    unsigned long lastStatusUpdate;
    unsigned long lastHeartbeat;
    
    // Serial communication
    String serialBuffer;
    
    // Callbacks (Observer Pattern)
    void (*stateChangeCallback)(SystemState);
    void (*errorCallback)(const String&);
    
    // Internal methods
    void initializeComponents();
    void cleanupComponents();
    void processCommand(const String& command);
    void handlePeriodicTasks();
    
    // Static callback wrappers
    static void onMotionCompleteWrapper();
    static void onPositionChangeWrapper(const MotorController::Position& position);
    static void onMotionStateChangeWrapper(MotorController::MotionState state);
    static void onCommandResponseWrapper(const String& response);
    static void onCommandErrorWrapper(const String& error);
    
    // Instance callback handlers
    void onMotionComplete();
    void onPositionChange(const MotorController::Position& position);
    void onMotionStateChange(MotorController::MotionState state);
    void onCommandResponse(const String& response);
    void onCommandError(const String& error);
    
    // Utility methods
    void notifyStateChange(SystemState state);
    void notifyError(const String& error);
    
    // Constants
    static const unsigned long STATUS_UPDATE_INTERVAL = 500; // ms
    static const unsigned long HEARTBEAT_INTERVAL = 1000; // ms
    static const unsigned long SERIAL_BAUD_RATE = 115200;
};

#endif // PALLETIZER_SLAVE_H