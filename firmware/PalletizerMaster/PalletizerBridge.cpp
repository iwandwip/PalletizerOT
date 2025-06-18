#include "PalletizerBridge.h"

PalletizerBridge* PalletizerBridge::instance = nullptr;

PalletizerBridge::PalletizerBridge()
  : currentState(DISCONNECTED), lastHeartbeat(0), stateChangeCallback(nullptr), errorCallback(nullptr) {
  initializeComponents();
}

PalletizerBridge* PalletizerBridge::getInstance() {
  if (!instance) {
    instance = new PalletizerBridge();
  }
  return instance;
}

void PalletizerBridge::begin() {
  Serial.begin(115200);
  Serial.println("PalletizerBridge Starting...");

  webSocket->begin();
  serial->begin();

  webSocket->setMessageCallback(onWebSocketMessage);
  serial->setDataCallback(onSerialData);
}

void PalletizerBridge::loop() {
  webSocket->loop();
  serial->loop();
  processCommands();
  sendHeartbeat();
}


void PalletizerBridge::setStateChangeCallback(void (*callback)(SystemState state)) {
  stateChangeCallback = callback;
}

void PalletizerBridge::setErrorCallback(void (*callback)(const String& error)) {
  errorCallback = callback;
}

void PalletizerBridge::initializeComponents() {
  webSocket = new WebSocketClient(WIFI_SSID, WIFI_PASSWORD, SERVER_IP, SERVER_PORT);
  serial = new SerialBridge(&Serial2, 16, 17);
  queue = new CommandQueue(20);
}

void PalletizerBridge::processCommands() {
  if (!queue->isEmpty() && serial) {
    String command = queue->dequeue();
    serial->sendCommand(command);
  }
}

void PalletizerBridge::sendHeartbeat() {
  if (isConnected() && millis() - lastHeartbeat > 30000) {
    StaticJsonDocument<128> doc;
    doc["type"] = "heartbeat";
    doc["uptime"] = millis();

    String output;
    serializeJson(doc, output);
    webSocket->sendMessage(output);
    lastHeartbeat = millis();
  }
}

void PalletizerBridge::onWebSocketMessage(const String& message) {
  if (instance) {
    instance->handleServerCommand(message);
  }
}

void PalletizerBridge::onSerialData(const String& data) {
  if (instance) {
    instance->handleArduinoResponse(data);
  }
}

void PalletizerBridge::handleServerCommand(const String& message) {
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, message) != DeserializationError::Ok) return;

  String cmdType = doc["cmd"];
  JsonObject data = doc["data"];

  if (cmdType == "STOP") {
    queue->clear();
    serial->sendCommand("E");
  } else {
    convertAndQueueCommand(cmdType, data);
  }
}

void PalletizerBridge::handleArduinoResponse(const String& response) {
  String trimmed = response;
  trimmed.trim();

  if (trimmed == "B") {
    sendStatusToServer("BUSY", queue->size());
  } else if (trimmed == "D") {
    sendStatusToServer("IDLE", queue->size());
  } else if (trimmed.startsWith("P")) {
    sendPositionToServer(trimmed);
  } else if (trimmed.startsWith("E")) {
    sendErrorToServer(trimmed.substring(2));
  } else if (trimmed == "SLAVE_READY") {
    sendStatusToServer("SLAVE_READY");
  }
}

void PalletizerBridge::convertAndQueueCommand(const String& cmdType, JsonObject data) {
  String arduinoCmd = "";

  if (cmdType == "MOVE") {
    arduinoCmd = "M";
  } else if (cmdType == "GROUP") {
    arduinoCmd = "G";
  } else if (cmdType == "HOME") {
    arduinoCmd = "H";
    queue->enqueue(arduinoCmd);
    return;
  } else if (cmdType == "ZERO") {
    arduinoCmd = "Z";
    queue->enqueue(arduinoCmd);
    return;
  } else if (cmdType == "SET_SPEED") {
    arduinoCmd = "V";
  } else if (cmdType == "SET_ACCEL") {
    arduinoCmd = "A";
  } else {
    return;
  }

  if (data.containsKey("X")) arduinoCmd += " X" + String((int)data["X"]);
  if (data.containsKey("Y")) arduinoCmd += " Y" + String((int)data["Y"]);
  if (data.containsKey("Z")) arduinoCmd += " Z" + String((int)data["Z"]);
  if (data.containsKey("T")) arduinoCmd += " T" + String((int)data["T"]);
  if (data.containsKey("G")) arduinoCmd += " G" + String((int)data["G"]);
  if (data.containsKey("speed")) arduinoCmd += " S" + String((int)data["speed"]);
  if (data.containsKey("accel")) arduinoCmd += " A" + String((int)data["accel"]);

  queue->enqueue(arduinoCmd);
}

void PalletizerBridge::sendStatusToServer(const String& status, int queueSize) {
  if (!isConnected()) return;

  StaticJsonDocument<256> doc;
  doc["type"] = "status";
  doc["status"] = status;
  doc["queue"] = queueSize;

  String output;
  serializeJson(doc, output);
  webSocket->sendMessage(output);
}

void PalletizerBridge::sendPositionToServer(const String& position) {
  if (!isConnected()) return;

  StaticJsonDocument<256> doc;
  doc["type"] = "position";
  JsonObject pos = doc.createNestedObject("position");

  int idx = 2;
  while (idx < position.length()) {
    if (position[idx] == ' ') {
      idx++;
      continue;
    }

    char axis = position[idx++];
    String value = "";
    while (idx < position.length() && position[idx] != ' ') {
      value += position[idx++];
    }
    if (value.length() > 0) {
      pos[String(axis)] = value.toInt();
    }
  }

  String output;
  serializeJson(doc, output);
  webSocket->sendMessage(output);
}

void PalletizerBridge::sendErrorToServer(const String& error) {
  if (!isConnected()) return;

  StaticJsonDocument<256> doc;
  doc["type"] = "error";
  doc["error"] = error;

  String output;
  serializeJson(doc, output);
  webSocket->sendMessage(output);
}