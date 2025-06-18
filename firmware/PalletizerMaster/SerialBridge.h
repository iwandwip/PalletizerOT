#ifndef SERIAL_BRIDGE_H
#define SERIAL_BRIDGE_H

#include <Arduino.h>

class SerialBridge {
public:
    SerialBridge(HardwareSerial* serial, int rxPin, int txPin);
    
    void begin();
    void loop();
    bool sendCommand(const String& command);
    
    void setDataCallback(void (*callback)(const String&));

private:
    HardwareSerial* serialPort;
    int rxPin, txPin;
    String inputBuffer;
    void (*dataCallback)(const String&);
    
    void processIncomingData();
};

#endif