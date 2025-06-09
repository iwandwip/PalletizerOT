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
    PAUSED,
    SYNC_WAIT,
    ERROR,
    DISCONNECTED,
    CRITICAL_ERROR
  };

  StatusIndicator(int greenPin, int yellowPin, int redPin);
  void begin();
  void setState(State newState);
  void update();
  void setSystemRunning(bool running);
  void setSyncWaiting(bool waiting);
  void setConnectionLost(bool lost);
  void incrementErrorCount();
  void resetErrorCount();
  String getStatusString() const;
  bool isStable() const;
  int getErrorCount() const;

private:
  int greenPin;
  int yellowPin;
  int redPin;
  State currentState;
  unsigned long lastBlink;
  unsigned long lastStateChange;
  bool blinkState;
  bool stateStable;
  int blinkSpeed;
  int errorCount;
  bool connectionLost;

  void setLED(int pin, bool state);
  void allOff();
  void handleBlinking();
  void handleSlowBlinking();
  void handleRapidBlinking();
  void handleDoubleBlinking();
  void handleTripleBlinking();
};

#endif