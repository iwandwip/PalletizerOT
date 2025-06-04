#include "CommandProcessor.h"
#include "PalletizerMaster.h"
#include "PalletizerScriptParser.h"
#include "DebugManager.h"

CommandProcessor::CommandProcessor(PalletizerMaster* master, QueueManager* queueManager, PalletizerScriptParser* scriptParser)
  : palletizerMaster(master), queueManager(queueManager), scriptParser(scriptParser) {
}

void CommandProcessor::processCommand(const String& data) {
  if (palletizerMaster) {
    onCommandReceived(data);
  }
}

void CommandProcessor::onCommandReceived(const String& data) {
  DEBUG_PRINTLN("COMMAND→MASTER: " + data);

  String trimmedData = data;
  trimmedData.trim();

  String upperData = trimmedData;
  upperData.toUpperCase();

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

  if (isScriptCommand(trimmedData)) {
    DEBUG_PRINTLN("MASTER: Detected script format - processing directly");
    processScriptCommand(trimmedData);
    return;
  }

  if (upperData.startsWith("SET(") || upperData == "WAIT") {
    processSyncCommand(upperData);
    return;
  }

  if (upperData == "IDLE" || upperData == "PLAY" || upperData == "PAUSE" || upperData == "STOP") {
    processSystemStateCommand(upperData);
    return;
  }

  if (!palletizerMaster->isSequenceRunning() && !palletizerMaster->isWaitingForCompletion() && !scriptProcessing) {
    if (upperData == "ZERO") {
      processStandardCommand(upperData);
    } else if (upperData.startsWith("SPEED;")) {
      processSpeedCommand(trimmedData);
    } else if (upperData == "END_QUEUE") {
      DEBUG_PRINTLN("MASTER: Queue loading completed");
      scriptProcessing = false;
    } else {
      if (shouldClearQueue(trimmedData)) {
        if (!queueClearRequested) {
          queueManager->clearQueue();
          queueClearRequested = true;
        }
      }

      DEBUG_PRINTLN("MASTER: Processing as legacy batch commands");
      processCommandsBatch(trimmedData);
    }
  } else if (trimmedData != "END_QUEUE") {
    if (shouldClearQueue(trimmedData)) {
      if (!queueClearRequested) {
        queueManager->clearQueue();
        queueClearRequested = true;
      }
    }

    DEBUG_PRINTLN("MASTER: Processing as legacy batch commands");
    processCommandsBatch(trimmedData);
  }
}

void CommandProcessor::processStandardCommand(const String& command) {
  if (command == "ZERO") {
    currentCommand = CMD_ZERO;
    DEBUG_MGR.info("SYSTEM", "⚙️ Executing ZERO (Homing) command");
    sendCommandToAllSlaves(CMD_ZERO);
    delay(100);
    palletizerMaster->startSequence();
  }
}

void CommandProcessor::processSpeedCommand(const String& data) {
  String params = data.substring(6);
  int separatorPos = params.indexOf(';');

  if (separatorPos != -1) {
    String slaveId = params.substring(0, separatorPos);
    String speedValue = params.substring(separatorPos + 1);

    slaveId.toLowerCase();
    String command = slaveId + ";" + String(CMD_SETSPEED) + ";" + speedValue;

    palletizerMaster->sendToSlave(command);
    slaveId.toUpperCase();
    DEBUG_MGR.info("SPEED", "⚡ Set " + slaveId + " axis speed to " + speedValue);
  } else {
    const char* slaveIds[] = { "x", "y", "z", "t", "g" };
    for (int i = 0; i < 5; i++) {
      String command = String(slaveIds[i]) + ";" + String(CMD_SETSPEED) + ";" + params;
      palletizerMaster->sendToSlave(command);
    }
    DEBUG_MGR.info("SPEED", "⚡ Set all axes speed to " + params);
  }
}

void CommandProcessor::processCoordinateData(const String& data) {
  DEBUG_PRINTLN("MASTER: Processing coordinates");
  currentCommand = CMD_RUN;
  logMotionCommand(data);
  parseCoordinateData(data);
  delay(100);
  palletizerMaster->startSequence();
}

void CommandProcessor::processSystemStateCommand(const String& command) {
  static String lastStateCommand = "";
  static unsigned long lastStateTime = 0;

  unsigned long currentTime = millis();

  if (command == lastStateCommand && (currentTime - lastStateTime) < 200) {
    DEBUG_PRINTLN("MASTER: Ignoring duplicate state command: " + command);
    return;
  }

  lastStateCommand = command;
  lastStateTime = currentTime;

  DEBUG_PRINTLN("MASTER: Processing system state command: " + command);

  if (command == "IDLE") {
    if (palletizerMaster->getSystemState() == PalletizerMaster::STATE_RUNNING || palletizerMaster->getSystemState() == PalletizerMaster::STATE_PAUSED) {
      if (palletizerMaster->isSequenceRunning()) {
        palletizerMaster->setSystemState(PalletizerMaster::STATE_STOPPING);
      } else {
        queueManager->clearQueue();
        palletizerMaster->setSystemState(PalletizerMaster::STATE_IDLE);
      }
    } else {
      palletizerMaster->setSystemState(PalletizerMaster::STATE_IDLE);
    }
  } else if (command == "PLAY") {
    if (palletizerMaster->getSystemState() == PalletizerMaster::STATE_RUNNING) {
      DEBUG_PRINTLN("MASTER: Already running, ignoring duplicate PLAY");
      return;
    }

    if (queueManager->isQueueEmpty()) {
      queueManager->loadCommandsFromFile();
    }

    queueManager->updateExecutionInfo(true);
    palletizerMaster->setSystemState(PalletizerMaster::STATE_RUNNING);
    if (!palletizerMaster->isSequenceRunning() && !palletizerMaster->isWaitingForCompletion() && !queueManager->isQueueEmpty()) {
      palletizerMaster->processNextCommand();
    }
  } else if (command == "PAUSE") {
    palletizerMaster->setSystemState(PalletizerMaster::STATE_PAUSED);
  } else if (command == "STOP") {
    if (palletizerMaster->isSequenceRunning()) {
      palletizerMaster->setSystemState(PalletizerMaster::STATE_STOPPING);
    } else {
      queueManager->clearQueue();
      palletizerMaster->setSystemState(PalletizerMaster::STATE_IDLE);
    }
  }
}

void CommandProcessor::processSyncCommand(const String& command) {
  if (command.startsWith("SET(")) {
    processSetCommand(command);
  } else if (command == "WAIT") {
    processWaitCommand();
  }
}

void CommandProcessor::processSetCommand(const String& data) {
  int startPos = data.indexOf('(');
  int endPos = data.indexOf(')');

  if (startPos != -1 && endPos != -1) {
    String value = data.substring(startPos + 1, endPos);
    int setValue = value.toInt();

    if (setValue == 1) {
      palletizerMaster->setSyncPin(true);
      DEBUG_MGR.sync("SET(1)", "Sync signal HIGH");
    } else if (setValue == 0) {
      palletizerMaster->setSyncPin(false);
      DEBUG_MGR.sync("SET(0)", "Sync signal LOW");
    } else {
      DEBUG_PRINTLN("MASTER: Invalid SET value: " + value);
    }
  }
}

void CommandProcessor::processWaitCommand() {
  DEBUG_MGR.sync("WAIT", "Waiting for sync signal HIGH");
  palletizerMaster->setWaitingForSync(true);
}

void CommandProcessor::processScriptCommand(const String& script) {
  static bool scriptInProgress = false;
  if (scriptInProgress) {
    DEBUG_PRINTLN("MASTER: Script already processing, ignoring duplicate");
    return;
  }

  scriptInProgress = true;
  DEBUG_PRINTLN("MASTER: Processing script command");

  scriptProcessing = true;
  queueClearRequested = false;
  scriptParser->parseScript(script);
  scriptProcessing = false;

  scriptInProgress = false;
}

void CommandProcessor::processGroupCommand(const String& groupCommands) {
  DEBUG_MGR.info("GROUP", "🔄 Executing GROUP command");
  DEBUG_MGR.info("GROUP", "└─ Commands: " + groupCommands);

  palletizerMaster->setGroupExecutionActive(true);
  currentCommand = CMD_GROUP;

  parseAndSendGroupCommands(groupCommands);
  palletizerMaster->startGroupDelay();
}

void CommandProcessor::parseCoordinateData(const String& data) {
  int pos = 0, endPos;
  while (pos < data.length()) {
    endPos = data.indexOf('(', pos);
    if (endPos == -1) break;
    String slaveId = data.substring(pos, endPos);
    slaveId.trim();
    slaveId.toLowerCase();

    int closePos = data.indexOf(')', endPos);
    if (closePos == -1) break;

    String paramsOrig = data.substring(endPos + 1, closePos);

    String params = "";
    for (int i = 0; i < paramsOrig.length(); i++) {
      params += (paramsOrig.charAt(i) == ',') ? ';' : paramsOrig.charAt(i);
    }

    String command = slaveId + ";" + String(currentCommand) + ";" + params;
    palletizerMaster->sendToSlave(command);
    DEBUG_PRINTLN("MASTER→SLAVE: " + command);

    pos = data.indexOf(',', closePos);
    pos = (pos == -1) ? data.length() : pos + 1;
  }
}

void CommandProcessor::parseAndSendGroupCommands(const String& groupCommands) {
  DEBUG_MGR.info("GROUP", "Parsing and sending simultaneous commands");

  int pos = 0;
  while (pos < groupCommands.length()) {
    while (pos < groupCommands.length() && (groupCommands.charAt(pos) == ' ' || groupCommands.charAt(pos) == '\t')) {
      pos++;
    }

    int endPos = groupCommands.indexOf('(', pos);
    if (endPos == -1 || pos >= groupCommands.length()) break;

    String slaveId = groupCommands.substring(pos, endPos);
    slaveId.trim();
    slaveId.toLowerCase();

    int openParen = endPos;
    int closeParen = -1;
    int parenCount = 1;

    for (int i = openParen + 1; i < groupCommands.length() && parenCount > 0; i++) {
      if (groupCommands.charAt(i) == '(') {
        parenCount++;
      } else if (groupCommands.charAt(i) == ')') {
        parenCount--;
        if (parenCount == 0) {
          closeParen = i;
        }
      }
    }

    if (closeParen == -1) break;

    String paramsOrig = groupCommands.substring(openParen + 1, closeParen);
    String params = "";
    for (int i = 0; i < paramsOrig.length(); i++) {
      if (paramsOrig.charAt(i) == ' ') {
        continue;
      }
      params += (paramsOrig.charAt(i) == ',') ? ';' : paramsOrig.charAt(i);
    }

    String command = slaveId + ";" + String(CMD_RUN) + ";" + params;
    palletizerMaster->sendToSlave(command);
    DEBUG_MGR.info("GROUP→SLAVE", command);

    pos = closeParen + 1;
    while (pos < groupCommands.length() && (groupCommands.charAt(pos) == ' ' || groupCommands.charAt(pos) == ',')) {
      pos++;
    }
  }

  DEBUG_MGR.info("GROUP", "All commands broadcasted simultaneously");
}

void CommandProcessor::processCommandsBatch(const String& commands) {
  int startPos = 0;
  int nextPos = commands.indexOf("NEXT", startPos);

  while (startPos < commands.length()) {
    if (nextPos == -1) {
      String command = commands.substring(startPos);
      command.trim();
      if (command.length() > 0) {
        queueManager->addToQueue(command);
      }
      break;
    } else {
      String command = commands.substring(startPos, nextPos);
      command.trim();
      if (command.length() > 0) {
        queueManager->addToQueue(command);
      }
      startPos = nextPos + 4;
      nextPos = commands.indexOf("NEXT", startPos);
    }
  }
}

bool CommandProcessor::isScriptCommand(const String& command) {
  String trimmed = command;
  trimmed.trim();

  if (trimmed.indexOf("FUNC(") != -1 || trimmed.indexOf("CALL(") != -1) {
    return true;
  }

  if (trimmed.indexOf('{') != -1 && trimmed.indexOf('}') != -1) {
    return true;
  }

  int semicolonCount = 0;
  for (int i = 0; i < trimmed.length(); i++) {
    if (trimmed.charAt(i) == ';') {
      semicolonCount++;
    }
  }

  if (semicolonCount > 1) {
    return true;
  }

  return false;
}

bool CommandProcessor::isCoordinateCommand(const String& command) {
  String trimmed = command;
  trimmed.trim();
  trimmed.toUpperCase();

  if (trimmed.startsWith("GROUP(")) {
    return false;
  }

  if (trimmed.startsWith("X(") || trimmed.startsWith("Y(") || trimmed.startsWith("Z(") || trimmed.startsWith("T(") || trimmed.startsWith("G(")) {
    return true;
  }

  if (trimmed.indexOf("X(") != -1 && trimmed.indexOf("Y(") != -1) {
    return true;
  }

  return false;
}

bool CommandProcessor::shouldClearQueue(const String& data) {
  bool isCoordinateCmd = data.indexOf('(') != -1;
  return isCoordinateCmd && QUEUE_OPERATION_MODE == QUEUE_MODE_OVERWRITE;
}

void CommandProcessor::logMotionCommand(const String& data) {
  int count = 0;
  int pos = 0;

  while ((pos = data.indexOf('(', pos)) != -1) {
    count++;
    pos++;
  }

  if (count > 1) {
    DEBUG_MGR.info("MOTION", "🎯 Multi-axis movement (" + String(count) + " axes)");
  }
}

void CommandProcessor::sendCommandToAllSlaves(Command cmd) {
  const char* slaveIds[] = { "x", "y", "z", "t", "g" };
  for (int i = 0; i < 5; i++) {
    String command = String(slaveIds[i]) + ";" + String(cmd);
    palletizerMaster->sendToSlave(command);
    DEBUG_PRINTLN("MASTER→SLAVE: " + command);
  }
}