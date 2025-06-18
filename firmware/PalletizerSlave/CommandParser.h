#ifndef COMMAND_PARSER_H
#define COMMAND_PARSER_H

#include <Arduino.h>
#include "MotorController.h"

/**
 * CommandParser - Parses and executes serial commands from ESP32 Master
 * 
 * Responsibilities:
 * - Serial command parsing
 * - Command validation
 * - Parameter extraction
 * - Command execution coordination
 */
class CommandParser {
public:
    enum CommandType {
        CMD_UNKNOWN,
        CMD_MOVE,           // M X1000 Y2000 S1000 A500
        CMD_GROUP_MOVE,     // G X1000 Y2000 Z500 S1000 A500
        CMD_SET_SPEED,      // V X1000 Y2000
        CMD_SET_ACCEL,      // A X500 Y500
        CMD_STATUS,         // S
        CMD_HOME,           // H
        CMD_ZERO,           // Z
        CMD_EMERGENCY_STOP  // E
    };

    struct ParsedCommand {
        CommandType type;
        bool hasAxis[MotorController::AXIS_COUNT];
        long axisValues[MotorController::AXIS_COUNT];
        int speed;
        int acceleration;
        bool isValid;
        String errorMessage;
    };

    // Constructor
    CommandParser(MotorController* motorController);
    ~CommandParser();
    
    // Command processing
    bool processCommand(const String& command);
    ParsedCommand parseCommand(const String& command);
    bool executeCommand(const ParsedCommand& cmd);
    
    // Response generation
    String generateResponse(bool success, const String& message = "");
    String generateStatusResponse();
    String generatePositionResponse();
    String generateErrorResponse(const String& error);
    
    // Callback registration (Observer Pattern)
    void setResponseCallback(void (*callback)(const String& response));
    void setErrorCallback(void (*callback)(const String& error));

private:
    // Dependencies
    MotorController* motorController;
    
    // Parsing state
    String inputBuffer;
    
    // Callbacks (Observer Pattern)
    void (*responseCallback)(const String& response);
    void (*errorCallback)(const String& error);
    
    // Command parsing methods
    CommandType identifyCommandType(const String& command);
    ParsedCommand parseMoveCommand(const String& command);
    ParsedCommand parseGroupMoveCommand(const String& command);
    ParsedCommand parseSpeedCommand(const String& command);
    ParsedCommand parseAccelCommand(const String& command);
    ParsedCommand parseSystemCommand(const String& command);
    
    // Parameter extraction
    bool extractAxisValues(const String& command, ParsedCommand& cmd);
    bool extractSpeed(const String& command, ParsedCommand& cmd);
    bool extractAcceleration(const String& command, ParsedCommand& cmd);
    long extractAxisValue(const String& command, char axis);
    int extractParameter(const String& command, char parameter);
    
    // Command execution
    bool executeMoveCommand(const ParsedCommand& cmd);
    bool executeGroupMoveCommand(const ParsedCommand& cmd);
    bool executeSpeedCommand(const ParsedCommand& cmd);
    bool executeAccelCommand(const ParsedCommand& cmd);
    bool executeSystemCommand(const ParsedCommand& cmd);
    
    // Validation
    bool validateCommand(const ParsedCommand& cmd);
    bool validateAxisValues(const ParsedCommand& cmd);
    bool validateSpeed(int speed);
    bool validateAcceleration(int acceleration);
    
    // Utility methods
    void notifyResponse(const String& response);
    void notifyError(const String& error);
    char getAxisChar(MotorController::MotorAxis axis);
    MotorController::MotorAxis getAxisFromChar(char axisChar);
    String trimCommand(const String& command);
    
    // Constants
    static const long MIN_POSITION = -1000000;
    static const long MAX_POSITION = 1000000;
    static const int MIN_SPEED = 1;
    static const int MAX_SPEED = 5000;
    static const int MIN_ACCELERATION = 1;
    static const int MAX_ACCELERATION = 10000;
};

#endif // COMMAND_PARSER_H