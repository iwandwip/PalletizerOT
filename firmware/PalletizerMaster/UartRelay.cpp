#include "UartRelay.h"

UartRelay::UartRelay(int rxPin, int txPin)
  : rxPin(rxPin), txPin(txPin), slaveSerial(Serial2), responseCallback(nullptr),
    lastHeartbeat(0), syncState(false), waitingForSync(false), detectActive(false),
    lastSyncSignalTime(0), syncTimeout(10000) {
}

void UartRelay::begin() {
  slaveSerial.begin(9600, SERIAL_8N1, rxPin, txPin);
  pinMode(SYNC_SET_PIN, OUTPUT);
  pinMode(SYNC_WAIT_PIN, INPUT_PULLUP);
  pinMode(DETECT_PIN, INPUT_PULLUP);

  digitalWrite(SYNC_SET_PIN, LOW);

  Serial.println("UART relay initialized on pins RX:" + String(rxPin) + " TX:" + String(txPin));
  Serial.println("Sync pins - SET:" + String(SYNC_SET_PIN) + " WAIT:" + String(SYNC_WAIT_PIN) + " DETECT:" + String(DETECT_PIN));
}

void UartRelay::update() {
  checkSlaveResponses();
  updateSyncHandling();

  if (millis() - lastHeartbeat > 5000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
}

void UartRelay::sendToSlaves(const String& command) {
  String trimmedCommand = command;
  trimmedCommand.trim();

  if (trimmedCommand.length() == 0) {
    return;
  }

  String upperCommand = trimmedCommand;
  upperCommand.toUpperCase();

  if (upperCommand == "ZERO") {
    handleZeroCommand();
  } else if (upperCommand.startsWith("SPEED;")) {
    handleSpeedCommand(trimmedCommand);
  } else if (upperCommand.startsWith("GROUP(") && upperCommand.endsWith(")")) {
    handleGroupCommand(trimmedCommand);
  } else if (upperCommand.startsWith("SET(") && upperCommand.endsWith(")")) {
    handleSetCommand(trimmedCommand);
  } else if (upperCommand == "WAIT") {
    handleWaitCommand();
  } else if (upperCommand == "DETECT") {
    handleDetectCommand();
  } else if (isCoordinateCommand(trimmedCommand)) {
    handleCoordinateCommand(trimmedCommand);
  } else {
    sendRawCommand(trimmedCommand);
  }
}

void UartRelay::setResponseCallback(ResponseCallback callback) {
  responseCallback = callback;
}

void UartRelay::checkSlaveResponses() {
  if (slaveSerial.available() > 0) {
    while (slaveSerial.available() > 0) {
      char c = slaveSerial.read();

      if (c == '\n' || c == '\r') {
        if (partialBuffer.length() > 0) {
          partialBuffer.trim();
          processSlaveData(partialBuffer);
          partialBuffer = "";
        }
      } else {
        partialBuffer += c;
      }
    }
  }
}

void UartRelay::processSlaveData(const String& data) {
  if (responseCallback) {
    responseCallback(data);
  }
}

void UartRelay::updateSyncHandling() {
  if (waitingForSync) {
    bool syncSignal = digitalRead(SYNC_WAIT_PIN) == LOW;

    if (syncSignal) {
      waitingForSync = false;
      Serial.println("SYNC→COMPLETE: External sync signal received");

      if (responseCallback) {
        responseCallback("SYNC;WAIT_COMPLETE");
      }
    } else if (millis() - lastSyncSignalTime > syncTimeout) {
      waitingForSync = false;
      Serial.println("SYNC→TIMEOUT: Wait timeout after " + String(syncTimeout) + "ms");

      if (responseCallback) {
        responseCallback("SYNC;WAIT_TIMEOUT");
      }
    }
  }

  if (detectActive) {
    bool detectSignal = digitalRead(DETECT_PIN) == LOW;

    if (detectSignal) {
      detectActive = false;
      Serial.println("DETECT→TRIGGERED: Detection signal received");

      if (responseCallback) {
        responseCallback("DETECT;TRIGGERED");
      }
    }
  }
}

void UartRelay::handleZeroCommand() {
  const char* slaveIds[] = { "x", "y", "z", "t", "g" };
  Serial.println("ESP32→SLAVES: Executing ZERO command for all axes");

  for (int i = 0; i < 5; i++) {
    String cmd = String(slaveIds[i]) + ";2";
    slaveSerial.println(cmd);
    Serial.println("ESP32→SLAVE: " + cmd);
    delay(10);
  }
}

void UartRelay::handleSpeedCommand(const String& command) {
  String params = command.substring(6);
  params.trim();

  while (params.endsWith(";")) {
    params = params.substring(0, params.length() - 1);
  }

  int separatorPos = params.indexOf(';');

  if (separatorPos != -1) {
    String slaveId = params.substring(0, separatorPos);
    String speedValue = params.substring(separatorPos + 1);
    slaveId.trim();
    speedValue.trim();
    slaveId.toLowerCase();

    if (isValidSlaveId(slaveId)) {
      String cmd = slaveId + ";6;" + speedValue;
      slaveSerial.println(cmd);
      Serial.println("ESP32→SLAVE: " + cmd);
    }
  } else {
    const char* slaveIds[] = { "x", "y", "z", "t", "g" };
    Serial.println("ESP32→SLAVES: Setting global speed " + params);

    for (int i = 0; i < 5; i++) {
      String cmd = String(slaveIds[i]) + ";6;" + params;
      slaveSerial.println(cmd);
      Serial.println("ESP32→SLAVE: " + cmd);
      delay(10);
    }
  }
}

void UartRelay::handleGroupCommand(const String& command) {
  String groupCommands = command.substring(6, command.length() - 1);
  Serial.println("ESP32→SLAVES: Executing GROUP command");
  parseGroupCommands(groupCommands);
}

void UartRelay::handleSetCommand(const String& command) {
  String valueStr = command.substring(4, command.length() - 1);
  int value = valueStr.toInt();

  syncState = (value == 1);
  digitalWrite(SYNC_SET_PIN, syncState ? HIGH : LOW);

  Serial.println("SYNC→SET: Signal set to " + String(syncState ? "HIGH" : "LOW"));

  if (responseCallback) {
    responseCallback("SET;" + String(value) + ";COMPLETE");
  }
}

void UartRelay::handleWaitCommand() {
  waitingForSync = true;
  lastSyncSignalTime = millis();

  Serial.println("SYNC→WAIT: Waiting for external sync signal...");

  if (responseCallback) {
    responseCallback("WAIT;STARTED");
  }
}

void UartRelay::handleDetectCommand() {
  detectActive = true;

  Serial.println("DETECT→ACTIVE: Monitoring detection signal");

  if (responseCallback) {
    responseCallback("DETECT;ACTIVE");
  }
}

void UartRelay::handleCoordinateCommand(const String& command) {
  parseCoordinateCommand(command);
}

void UartRelay::sendRawCommand(const String& command) {
  slaveSerial.println(command);
  Serial.println("ESP32→SLAVE: " + command);
}

void UartRelay::sendHeartbeat() {
  const char* slaveIds[] = { "x", "y", "z", "t", "g" };
  for (int i = 0; i < 5; i++) {
    String ping = String(slaveIds[i]) + ";0";
    slaveSerial.println(ping);
    delay(5);
  }
}

void UartRelay::parseGroupCommands(const String& groupCommands) {
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

    if (!isValidSlaveId(slaveId)) {
      pos = endPos + 1;
      continue;
    }

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
    String params = formatParameters(paramsOrig);

    String cmd = slaveId + ";1;" + params;
    slaveSerial.println(cmd);
    Serial.println("ESP32→SLAVE: " + cmd);

    pos = closeParen + 1;
    while (pos < groupCommands.length() && (groupCommands.charAt(pos) == ' ' || groupCommands.charAt(pos) == ',')) {
      pos++;
    }
  }
}

void UartRelay::parseCoordinateCommand(const String& command) {
  int pos = 0;
  while (pos < command.length()) {
    int endPos = command.indexOf('(', pos);
    if (endPos == -1) break;

    String slaveId = command.substring(pos, endPos);
    slaveId.trim();
    slaveId.toLowerCase();

    if (!isValidSlaveId(slaveId)) {
      pos = command.indexOf(',', endPos);
      pos = (pos == -1) ? command.length() : pos + 1;
      continue;
    }

    int closePos = command.indexOf(')', endPos);
    if (closePos == -1) break;

    String paramsOrig = command.substring(endPos + 1, closePos);
    String params = formatParameters(paramsOrig);

    String cmd = slaveId + ";1;" + params;
    slaveSerial.println(cmd);
    Serial.println("ESP32→SLAVE: " + cmd);

    pos = command.indexOf(',', closePos);
    pos = (pos == -1) ? command.length() : pos + 1;
  }
}

bool UartRelay::isValidSlaveId(const String& slaveId) {
  String id = slaveId;
  id.toLowerCase();
  return (id == "x" || id == "y" || id == "z" || id == "t" || id == "g");
}

bool UartRelay::isCoordinateCommand(const String& command) {
  return command.indexOf('(') != -1 && command.indexOf(')') != -1;
}

String UartRelay::formatParameters(const String& params) {
  String formatted = "";
  for (int i = 0; i < params.length(); i++) {
    char c = params.charAt(i);
    if (c == ' ') {
      continue;
    }
    formatted += (c == ',') ? ';' : c;
  }
  return formatted;
}