#include "PalletizerProtocol.h"
#include "DebugManager.h"

PalletizerProtocol::PalletizerProtocol(int rxPin, int txPin)
  : rxPin(rxPin), txPin(txPin), rxIndicatorLed(2), slavePartialBuffer(""), lastReceivedData(""),
    slaveDataCallback(nullptr), dataReceived(false) {
}

void PalletizerProtocol::begin() {
  slaveCommSerial.begin(9600, SERIAL_8N1, rxPin, txPin);
  slaveSerial.begin(&slaveCommSerial);
  DEBUG_SERIAL_PRINTLN("PROTOCOL: UART communication initialized on pins RX:" + String(rxPin) + " TX:" + String(txPin));
}

void PalletizerProtocol::update() {
  // checkSlaveData();
}

void PalletizerProtocol::sendToSlave(const String& data) {
  slaveSerial.println(data);
  DEBUG_SERIAL_PRINTLN("PROTOCOL→SLAVE: " + data);
  delay(100);
}

void PalletizerProtocol::sendCommandToAllSlaves(Command cmd) {
  const char* slaveIds[] = { "x", "y", "z", "t", "g" };
  for (int i = 0; i < 5; i++) {
    formatSlaveCommand(String(slaveIds[i]), cmd);
  }
  DEBUG_MGR.info("PROTOCOL", "Broadcasted command " + String(cmd) + " to all slaves");
}

void PalletizerProtocol::sendGroupCommands(const String& groupCommands) {
  DEBUG_MGR.info("PROTOCOL", "Processing GROUP commands: " + groupCommands);
  parseAndSendGroupCommands(groupCommands);
}

void PalletizerProtocol::sendCoordinateData(const String& data, Command currentCommand) {
  DEBUG_MGR.info("PROTOCOL", "Processing coordinate data: " + data);
  parseCoordinateData(data, currentCommand);
}

void PalletizerProtocol::sendSpeedCommand(const String& speedData) {
  DEBUG_MGR.info("PROTOCOL", "Processing speed command: " + speedData);
  parseSpeedParameters(speedData);
}

void PalletizerProtocol::setDataCallback(DataCallback callback) {
  slaveDataCallback = callback;
}

bool PalletizerProtocol::isDataAvailable() {
  return dataReceived;
}

String PalletizerProtocol::getLastReceivedData() {
  dataReceived = false;
  return lastReceivedData;
}

void PalletizerProtocol::checkSlaveData() {
  if (slaveSerial.available() > 0) {
    while (slaveSerial.available() > 0) {
      rxIndicatorLed.on();
      char c = slaveSerial.read();

      if (c == '\n' || c == '\r') {
        if (slavePartialBuffer.length() > 0) {
          slavePartialBuffer.trim();
          onSlaveData(slavePartialBuffer);
          slavePartialBuffer = "";
        }
      } else {
        slavePartialBuffer += c;
      }
      rxIndicatorLed.off();
    }
  }
}

void PalletizerProtocol::onSlaveData(const String& data) {
  lastReceivedData = data;
  dataReceived = true;

  if (slaveDataCallback) {
    slaveDataCallback(data);
  }

  DEBUG_MGR.info("SLAVE→PROTOCOL", data);
}

void PalletizerProtocol::parseCoordinateData(const String& data, Command currentCommand) {
  int pos = 0, endPos;
  while (pos < data.length()) {
    endPos = data.indexOf('(', pos);
    if (endPos == -1) break;

    String slaveId = data.substring(pos, endPos);
    slaveId.trim();
    slaveId.toLowerCase();

    if (!isValidSlaveId(slaveId)) {
      pos = data.indexOf(',', endPos);
      pos = (pos == -1) ? data.length() : pos + 1;
      continue;
    }

    int closePos = data.indexOf(')', endPos);
    if (closePos == -1) break;

    String paramsOrig = data.substring(endPos + 1, closePos);
    String params = formatParameters(paramsOrig);

    formatSlaveCommand(slaveId, currentCommand, params);

    pos = data.indexOf(',', closePos);
    pos = (pos == -1) ? data.length() : pos + 1;
  }
}

void PalletizerProtocol::parseAndSendGroupCommands(const String& groupCommands) {
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

    formatSlaveCommand(slaveId, CMD_RUN, params);

    pos = closeParen + 1;
    while (pos < groupCommands.length() && (groupCommands.charAt(pos) == ' ' || groupCommands.charAt(pos) == ',')) {
      pos++;
    }
  }
}

void PalletizerProtocol::parseSpeedParameters(const String& speedData) {
  String params = speedData.substring(6);
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

    while (speedValue.endsWith(";")) {
      speedValue = speedValue.substring(0, speedValue.length() - 1);
    }

    if (isValidSlaveId(slaveId)) {
      formatSlaveCommand(slaveId, CMD_SETSPEED, speedValue);
      String upperSlaveId = slaveId;
      upperSlaveId.toUpperCase();
      DEBUG_MGR.info("PROTOCOL", "Set " + upperSlaveId + " axis speed to " + speedValue);
    }
  } else {
    while (params.endsWith(";")) {
      params = params.substring(0, params.length() - 1);
    }

    const char* slaveIds[] = { "x", "y", "z", "t", "g" };
    for (int i = 0; i < 5; i++) {
      formatSlaveCommand(String(slaveIds[i]), CMD_SETSPEED, params);
    }
    DEBUG_MGR.info("PROTOCOL", "Set all axes speed to " + params);
  }
}

void PalletizerProtocol::formatSlaveCommand(const String& slaveId, Command cmd, const String& params) {
  String command = slaveId + ";" + String(cmd);
  if (params.length() > 0) {
    command += ";" + params;
  }
  sendToSlave(command);
}

bool PalletizerProtocol::isValidSlaveId(const String& slaveId) {
  String id = slaveId;
  id.toLowerCase();
  return (id == "x" || id == "y" || id == "z" || id == "t" || id == "g");
}

String PalletizerProtocol::formatParameters(const String& params) {
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