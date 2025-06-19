#include "SerialBridge.h"

SerialBridge::SerialBridge(HardwareSerial& serial, int rxPin, int txPin) 
  : serial(serial), rxPin(rxPin), txPin(txPin), responseCallback(nullptr) {
}

void SerialBridge::begin(unsigned long baudRate) {
  serial.begin(baudRate, SERIAL_8N1, rxPin, txPin);
  Serial.println("Serial bridge initialized");
}

void SerialBridge::loop() {
  while (serial.available()) {
    char c = serial.read();
    if (c == '\n') {
      if (inputBuffer.length() > 0) {
        processResponse(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
    }
  }
}

void SerialBridge::sendCommand(const String& command) {
  serial.println(command);
  Serial.println("-> Arduino: " + command);
}

void SerialBridge::setResponseCallback(void (*callback)(const String&)) {
  responseCallback = callback;
}

String SerialBridge::jsonToSerial(const String& jsonCmd) {
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, jsonCmd) != DeserializationError::Ok) {
    return "";
  }
  String cmdType = doc["cmd"];
  JsonObject data = doc["data"];
  String serialCmd = "";
  if (cmdType == "MOVE") serialCmd = "M";
  else if (cmdType == "GROUP") serialCmd = "G";
  else if (cmdType == "HOME") serialCmd = "H";
  else if (cmdType == "ZERO") serialCmd = "Z";
  else if (cmdType == "STOP") serialCmd = "E";
  else if (cmdType == "SET_SPEED") serialCmd = "V";
  else return "";
  if (data.containsKey("X")) serialCmd += " X" + String((int)data["X"]);
  if (data.containsKey("Y")) serialCmd += " Y" + String((int)data["Y"]);
  if (data.containsKey("Z")) serialCmd += " Z" + String((int)data["Z"]);
  if (data.containsKey("T")) serialCmd += " T" + String((int)data["T"]);
  if (data.containsKey("G")) serialCmd += " G" + String((int)data["G"]);
  if (data.containsKey("speed")) serialCmd += " S" + String((int)data["speed"]);
  return serialCmd;
}

String SerialBridge::serialToJson(const String& serialResp) {
  StaticJsonDocument<256> doc;
  if (serialResp == "B") {
    doc["type"] = "status";
    doc["status"] = "BUSY";
  } else if (serialResp == "D") {
    doc["type"] = "status";
    doc["status"] = "IDLE";
  } else if (serialResp.startsWith("P")) {
    doc["type"] = "position";
    doc["data"] = serialResp;
  } else if (serialResp.startsWith("E")) {
    doc["type"] = "error";
    doc["error"] = serialResp.substring(2);
  } else if (serialResp == "SLAVE_READY") {
    doc["type"] = "status";
    doc["status"] = "READY";
  } else if (serialResp == "OK") {
    doc["type"] = "status";
    doc["status"] = "OK";
  }
  String output;
  serializeJson(doc, output);
  return output;
}

void SerialBridge::processResponse(const String& response) {
  Serial.println("<- Arduino: " + response);
  String jsonResponse = serialToJson(response);
  if (jsonResponse.length() > 0 && responseCallback) {
    responseCallback(jsonResponse);
  }
}