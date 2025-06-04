#ifndef COMMAND_PROCESSOR_H
#define COMMAND_PROCESSOR_H

#include "Arduino.h"
#include "QueueManager.h"

class PalletizerMaster;
class PalletizerScriptParser;

class CommandProcessor {
public:
  enum Command {
    CMD_NONE = 0,
    CMD_RUN = 1,
    CMD_ZERO = 2,
    CMD_SETSPEED = 6,
    CMD_SET = 7,
    CMD_WAIT = 8,
    CMD_GROUP = 9
  };

  enum SystemState {
    STATE_IDLE = 0,
    STATE_RUNNING = 1,
    STATE_PAUSED = 2,
    STATE_STOPPING = 3
  };

  CommandProcessor(PalletizerMaster* master, QueueManager* queueManager, PalletizerScriptParser* scriptParser);
  void processCommand(const String& data);
  void onCommandReceived(const String& data);
  void processStandardCommand(const String& command);
  void processSpeedCommand(const String& data);
  void processCoordinateData(const String& data);
  void processSystemStateCommand(const String& command);
  void processSyncCommand(const String& command);
  void processSetCommand(const String& data);
  void processWaitCommand();
  void processScriptCommand(const String& script);
  void processGroupCommand(const String& groupCommands);
  void parseCoordinateData(const String& data);
  void parseAndSendGroupCommands(const String& groupCommands);
  void processCommandsBatch(const String& commands);
  bool isScriptCommand(const String& command);
  bool isCoordinateCommand(const String& command);
  bool shouldClearQueue(const String& data);

private:
  PalletizerMaster* palletizerMaster;
  QueueManager* queueManager;
  PalletizerScriptParser* scriptParser;

  Command currentCommand = CMD_NONE;
  bool scriptProcessing = false;
  bool queueClearRequested = false;

  void logMotionCommand(const String& data);
  void sendCommandToAllSlaves(Command cmd);
};

#endif