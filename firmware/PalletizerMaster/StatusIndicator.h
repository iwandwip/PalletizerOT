#ifndef STATUS_INDICATOR_H
#define STATUS_INDICATOR_H

#include "Arduino.h"

class StatusIndicator {
public:
  enum State {
    STARTING,
    CONNECTING,
    CONNECTED,
    AP_MODE,
    READY,
    RUNNING,
    ERROR,
    DISCONNECTED
  };

  StatusIndicator(int greenPin, int yellowPin, int redPin);
  void begin();
  void setState(State newState);
  void update();

private:
  int greenPin;
  int yellowPin;
  int redPin;
  State currentState;
  unsigned long lastBlink;
  bool blinkState;

  void setLED(int pin, bool state);
  void allOff();
  void handleBlinking();
};