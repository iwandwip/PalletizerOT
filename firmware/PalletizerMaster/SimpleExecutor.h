#ifndef SIMPLE_EXECUTOR_H
#define SIMPLE_EXECUTOR_H

#include "Arduino.h"

class FlashManager;
class CommandRouter;

class SimpleExecutor {
public:
  enum ExecutionState {
    IDLE,
    RUNNING,
    PAUSED,
    STOPPING
  };

  SimpleExecutor(FlashManager* flashManager, CommandRouter* commandRouter);

  void begin();
  void update();

  bool startExecution();
  void pauseExecution();
  void stopExecution();
  void resumeExecution();

  ExecutionState getState();
  int getCurrentLine();
  int getTotalLines();
  float getProgress();
  String getCurrentCommand();

  void setStateChangeCallback(void (*callback)(ExecutionState));

private:
  FlashManager* flashManager;
  CommandRouter* commandRouter;

  ExecutionState currentState;
  int currentLine;
  int totalLines;
  String currentCommand;

  unsigned long lastExecutionTime;
  bool waitingForCompletion;

  void (*stateChangeCallback)(ExecutionState);

  void executeNextCommand();
  void onCommandComplete();
  void setState(ExecutionState newState);

  static void commandCompletionWrapper();
  static SimpleExecutor* instance;
};

#endif