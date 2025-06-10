#include "SimpleExecutor.h"

SimpleExecutor* SimpleExecutor::instance = nullptr;

SimpleExecutor::SimpleExecutor(FlashManager* flashManager, CommandRouter* commandRouter)
  : flashManager(flashManager), commandRouter(commandRouter), currentState(IDLE), currentLine(0), totalLines(0), lastExecutionTime(0), waitingForCompletion(false), stateChangeCallback(nullptr) {
  instance = this;
}

void SimpleExecutor::begin() {
  if (commandRouter) {
    commandRouter->setCompletionCallback(commandCompletionWrapper);
  }

  totalLines = flashManager ? flashManager->getTotalLines() : 0;
  setState(IDLE);
}

void SimpleExecutor::update() {
  if (currentState == RUNNING && !waitingForCompletion) {
    if (currentLine < totalLines) {
      executeNextCommand();
    } else {
      setState(IDLE);
    }
  }
}

bool SimpleExecutor::startExecution() {
  if (!flashManager || !commandRouter) {
    return false;
  }

  if (!flashManager->hasCommands()) {
    return false;
  }

  currentLine = 0;
  totalLines = flashManager->getTotalLines();
  setState(RUNNING);
  return true;
}

void SimpleExecutor::pauseExecution() {
  if (currentState == RUNNING) {
    setState(PAUSED);
  }
}

void SimpleExecutor::stopExecution() {
  setState(STOPPING);
  waitingForCompletion = false;
  currentLine = 0;
  currentCommand = "";
  setState(IDLE);
}

void SimpleExecutor::resumeExecution() {
  if (currentState == PAUSED) {
    setState(RUNNING);
  }
}

SimpleExecutor::ExecutionState SimpleExecutor::getState() {
  return currentState;
}

int SimpleExecutor::getCurrentLine() {
  return currentLine;
}

int SimpleExecutor::getTotalLines() {
  return totalLines;
}

float SimpleExecutor::getProgress() {
  if (totalLines == 0) return 0.0;
  return (float(currentLine) / float(totalLines)) * 100.0;
}

String SimpleExecutor::getCurrentCommand() {
  return currentCommand;
}

void SimpleExecutor::setStateChangeCallback(void (*callback)(ExecutionState)) {
  stateChangeCallback = callback;
}

void SimpleExecutor::executeNextCommand() {
  if (!flashManager || currentLine >= totalLines) {
    return;
  }

  currentCommand = flashManager->readCommand(currentLine);

  if (currentCommand.length() == 0) {
    currentLine++;
    return;
  }

  if (commandRouter && commandRouter->routeCommand(currentCommand)) {
    waitingForCompletion = true;
    lastExecutionTime = millis();
  } else {
    currentLine++;
  }
}

void SimpleExecutor::onCommandComplete() {
  if (currentState == RUNNING) {
    waitingForCompletion = false;
    currentLine++;
  }
}

void SimpleExecutor::setState(ExecutionState newState) {
  if (currentState != newState) {
    currentState = newState;

    if (stateChangeCallback) {
      stateChangeCallback(newState);
    }
  }
}

void SimpleExecutor::commandCompletionWrapper() {
  if (instance) {
    instance->onCommandComplete();
  }
}