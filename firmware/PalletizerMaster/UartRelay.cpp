#include "UartRelay.h"

UartRelay::UartRelay(int rxPin, int txPin)
  : rxPin(rxPin), txPin(txPin), slaveSerial(Serial2), responseCallback(nullptr), lastHeartbeat(0) {
}

void UartRelay::begin() {
  slaveSerial.begin(9600, SERIAL_8N1, rxPin, txPin);
  Serial.println("UART relay initialized on pins RX:" + String(rxPin) + " TX:" + String(txPin));
}

void UartRelay::update() {
  checkSlaveResponses();

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
    const char* slaveIds[] = { "x", "y", "z", "t", "g" };
    for (int i = 0; i < 5; i++) {
      String cmd = String(slaveIds[i]) + ";2";
      slaveSerial.println(cmd);
      Serial.println("ESP32→SLAVE: " + cmd);
      delay(10);
    }
  } else if (upperCommand.startsWith("SPEED;")) {
    String params = trimmedCommand.substring(6);
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

      String cmd = slaveId + ";6;" + speedValue;
      slaveSerial.println(cmd);
      Serial.println("ESP32→SLAVE: " + cmd);
    } else {
      const char* slaveIds[] = { "x", "y", "z", "t", "g" };
      for (int i = 0; i < 5; i++) {
        String cmd = String(slaveIds[i]) + ";6;" + params;
        slaveSerial.println(cmd);
        Serial.println("ESP32→SLAVE: " + cmd);
        delay(10);
      }
    }
  } else if (upperCommand.startsWith("GROUP(") && upperCommand.endsWith(")")) {
    String groupCommands = trimmedCommand.substring(6, trimmedCommand.length() - 1);
    parseGroupCommands(groupCommands);
  } else if (isCoordinateCommand(trimmedCommand)) {
    parseCoordinateCommand(trimmedCommand);
  } else {
    slaveSerial.println(trimmedCommand);
    Serial.println("ESP32→SLAVE: " + trimmedCommand);
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