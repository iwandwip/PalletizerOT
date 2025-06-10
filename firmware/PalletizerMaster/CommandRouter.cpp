#include "CommandRouter.h"

CommandRouter::CommandRouter(PalletizerProtocol* protocol)
  : protocol(protocol), completionCallback(nullptr) {
}

bool CommandRouter::routeCommand(const String& command) {
  if (!protocol || command.length() == 0) {
    return false;
  }

  String cmd = command;
  cmd.trim();
  cmd.toUpperCase();

  if (isSystemCommand(cmd)) {
    processSystemCommand(cmd);
  } else if (isBroadcastCommand(cmd)) {
    processBroadcastCommand(command);
  } else if (isDetectCommand(cmd)) {
    processDetectCommand();
  } else if (isSyncCommand(cmd)) {
    processSyncCommand(command);
  } else if (isSpeedCommand(cmd)) {
    processSpeedCommand(command);
  } else if (isAxisCommand(cmd)) {
    processAxisCommand(command);
  } else {
    return false;
  }

  return true;
}

void CommandRouter::setCompletionCallback(void (*callback)()) {
  completionCallback = callback;
}

bool CommandRouter::isSystemCommand(const String& command) {
  return command == "ZERO" || command == "PLAY" || command == "PAUSE" || command == "STOP" || command == "IDLE";
}

bool CommandRouter::isBroadcastCommand(const String& command) {
  return command.startsWith("BROADCAST;");
}

bool CommandRouter::isDetectCommand(const String& command) {
  return command == "DETECT";
}

bool CommandRouter::isSyncCommand(const String& command) {
  return command.startsWith("SET(") || command == "WAIT";
}

bool CommandRouter::isSpeedCommand(const String& command) {
  return command.startsWith("SPEED;");
}

bool CommandRouter::isAxisCommand(const String& command) {
  return (command.startsWith("X;") || command.startsWith("Y;") || command.startsWith("Z;") || command.startsWith("T;") || command.startsWith("G;"));
}

void CommandRouter::processSystemCommand(const String& command) {
  if (command == "ZERO") {
    protocol->sendCommandToAllSlaves(PalletizerProtocol::CMD_ZERO);
  }

  if (completionCallback) {
    completionCallback();
  }
}

void CommandRouter::processBroadcastCommand(const String& command) {
  String groupCommands = command.substring(10);
  protocol->sendGroupCommands(groupCommands);

  if (completionCallback) {
    completionCallback();
  }
}

void CommandRouter::processDetectCommand() {
  const int DETECT_PINS[] = { 36 };
  const int DETECT_PIN_COUNT = 1;

  for (int i = 0; i < DETECT_PIN_COUNT; i++) {
    pinMode(DETECT_PINS[i], INPUT_PULLUP);
  }

  unsigned long startTime = millis();
  bool allLow = false;

  while (millis() - startTime < 10000) {
    allLow = true;
    for (int i = 0; i < DETECT_PIN_COUNT; i++) {
      if (digitalRead(DETECT_PINS[i]) == HIGH) {
        allLow = false;
        break;
      }
    }

    if (allLow) {
      delay(1000);
      break;
    }

    delay(10);
  }

  if (completionCallback) {
    completionCallback();
  }
}

void CommandRouter::processSyncCommand(const String& command) {
  if (command.startsWith("SET(")) {
    int startPos = command.indexOf('(');
    int endPos = command.indexOf(')');

    if (startPos != -1 && endPos != -1) {
      String value = command.substring(startPos + 1, endPos);
      int setValue = value.toInt();

      const int SYNC_SET_PIN = 25;
      pinMode(SYNC_SET_PIN, OUTPUT);
      digitalWrite(SYNC_SET_PIN, setValue == 1 ? HIGH : LOW);
    }
  } else if (command == "WAIT") {
    const int SYNC_WAIT_PIN = 27;
    pinMode(SYNC_WAIT_PIN, INPUT_PULLDOWN);

    unsigned long startTime = millis();
    while (millis() - startTime < 30000) {
      if (digitalRead(SYNC_WAIT_PIN) == HIGH) {
        break;
      }
      delay(10);
    }
  }

  if (completionCallback) {
    completionCallback();
  }
}

void CommandRouter::processSpeedCommand(const String& command) {
  protocol->sendSpeedCommand(command);

  if (completionCallback) {
    completionCallback();
  }
}

void CommandRouter::processAxisCommand(const String& command) {
  protocol->sendToSlave(command);

  if (completionCallback) {
    completionCallback();
  }
}