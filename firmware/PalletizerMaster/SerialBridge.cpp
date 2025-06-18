#include "SerialBridge.h"

SerialBridge::SerialBridge(HardwareSerial* serial, int rxPin, int txPin)
    : serialPort(serial), rxPin(rxPin), txPin(txPin), dataCallback(nullptr) {
}

void SerialBridge::begin() {
    serialPort->begin(115200, SERIAL_8N1, rxPin, txPin);
}

void SerialBridge::loop() {
    processIncomingData();
}

bool SerialBridge::sendCommand(const String& command) {
    serialPort->println(command);
    Serial.println("Sent to Arduino: " + command);
    return true;
}

void SerialBridge::setDataCallback(void (*callback)(const String&)) {
    dataCallback = callback;
}

void SerialBridge::processIncomingData() {
    while (serialPort->available()) {
        char c = serialPort->read();
        if (c == '\n') {
            if (inputBuffer.length() > 0) {
                if (dataCallback) {
                    dataCallback(inputBuffer);
                }
                inputBuffer = "";
            }
        } else {
            inputBuffer += c;
        }
    }
}