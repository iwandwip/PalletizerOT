#include "SerialBridge.h"

SerialBridge::SerialBridge(HardwareSerial* serialPort) {
  serial = serialPort;
  responseTimeout = 5000;
  lastResponse = "";
  waitingForResponse = false;
}

void SerialBridge::begin(unsigned long baudRate) {
  serial->begin(baudRate);
  delay(100);
}

bool SerialBridge::sendCommand(const String& command) {
  if (!serial) return false;
  
  serial->println(command);
  waitingForResponse = true;
  return true;
}

bool SerialBridge::sendCommandAndWait(const String& command, const String& expectedResponse, unsigned long timeout) {
  if (!sendCommand(command)) return false;
  
  unsigned long startTime = millis();
  while (millis() - startTime < timeout) {
    if (hasResponse()) {
      String response = readResponse();
      if (response == expectedResponse) {
        return true;
      }
    }
    delay(10);
  }
  return false;
}

String SerialBridge::getLastResponse() {
  return lastResponse;
}

bool SerialBridge::hasResponse() {
  return serial->available() > 0;
}

String SerialBridge::readResponse() {
  if (!hasResponse()) return "";
  
  String response = serial->readStringUntil('\n');
  response.trim();
  lastResponse = response;
  waitingForResponse = false;
  return response;
}

void SerialBridge::clearBuffer() {
  while (serial->available()) {
    serial->read();
  }
}

bool SerialBridge::isReady() {
  return serial && !waitingForResponse;
}