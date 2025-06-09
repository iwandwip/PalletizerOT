#include "StatusIndicator.h"

StatusIndicator::StatusIndicator(int greenPin, int yellowPin, int redPin)
  : greenPin(greenPin), yellowPin(yellowPin), redPin(redPin),
    currentState(STARTING), lastBlink(0), blinkState(false),
    lastStateChange(0), stateStable(true), blinkSpeed(500),
    errorCount(0), connectionLost(false) {
}

void StatusIndicator::begin() {
  pinMode(greenPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(redPin, OUTPUT);

  allOff();
  lastStateChange = millis();
  Serial.println("Status indicator initialized - Green:" + String(greenPin) + " Yellow:" + String(yellowPin) + " Red:" + String(redPin));
}

void StatusIndicator::setState(State newState) {
  if (currentState != newState) {
    currentState = newState;
    lastStateChange = millis();
    stateStable = false;
    allOff();

    switch (currentState) {
      case STARTING:
        Serial.println("Status: STARTING - System initialization");
        blinkSpeed = 300;
        break;
      case CONNECTING:
        Serial.println("Status: CONNECTING - Establishing WiFi connection");
        blinkSpeed = 500;
        break;
      case CONNECTED:
        Serial.println("Status: CONNECTED - WiFi connected, services ready");
        setLED(greenPin, true);
        stateStable = true;
        break;
      case AP_MODE:
        Serial.println("Status: AP_MODE - Access Point mode active");
        setLED(yellowPin, true);
        stateStable = true;
        break;
      case READY:
        Serial.println("Status: READY - System ready for commands");
        setLED(greenPin, true);
        stateStable = true;
        break;
      case RUNNING:
        Serial.println("Status: RUNNING - Executing commands");
        blinkSpeed = 250;
        break;
      case PAUSED:
        Serial.println("Status: PAUSED - Execution paused");
        blinkSpeed = 1000;
        break;
      case SYNC_WAIT:
        Serial.println("Status: SYNC_WAIT - Waiting for synchronization");
        blinkSpeed = 200;
        break;
      case ERROR:
        Serial.println("Status: ERROR - System error detected");
        errorCount++;
        blinkSpeed = 150;
        break;
      case DISCONNECTED:
        Serial.println("Status: DISCONNECTED - Connection lost");
        connectionLost = true;
        blinkSpeed = 300;
        break;
      case CRITICAL_ERROR:
        Serial.println("Status: CRITICAL_ERROR - Critical system error");
        blinkSpeed = 100;
        break;
    }
  }
}

void StatusIndicator::update() {
  switch (currentState) {
    case STARTING:
      handleTripleBlinking();
      break;

    case CONNECTING:
      handleBlinking();
      setLED(yellowPin, blinkState);
      setLED(redPin, false);
      setLED(greenPin, false);
      break;

    case RUNNING:
      handleBlinking();
      setLED(greenPin, blinkState);
      setLED(yellowPin, false);
      setLED(redPin, false);
      break;

    case PAUSED:
      handleSlowBlinking();
      setLED(yellowPin, blinkState);
      setLED(redPin, false);
      setLED(greenPin, false);
      break;

    case SYNC_WAIT:
      handleRapidBlinking();
      setLED(greenPin, blinkState);
      setLED(yellowPin, blinkState);
      setLED(redPin, false);
      break;

    case DISCONNECTED:
      handleBlinking();
      setLED(redPin, blinkState);
      setLED(yellowPin, false);
      setLED(greenPin, false);
      break;

    case ERROR:
      handleDoubleBlinking();
      break;

    case CRITICAL_ERROR:
      handleRapidBlinking();
      setLED(redPin, blinkState);
      setLED(yellowPin, blinkState);
      setLED(greenPin, false);
      break;

    default:
      break;
  }

  if (!stateStable && (millis() - lastStateChange > 2000)) {
    stateStable = true;
  }
}

void StatusIndicator::setSystemRunning(bool running) {
  if (running && currentState == READY) {
    setState(RUNNING);
  } else if (!running && currentState == RUNNING) {
    setState(READY);
  }
}

void StatusIndicator::setSyncWaiting(bool waiting) {
  if (waiting) {
    setState(SYNC_WAIT);
  } else if (currentState == SYNC_WAIT) {
    setState(READY);
  }
}

void StatusIndicator::setConnectionLost(bool lost) {
  connectionLost = lost;
  if (lost) {
    setState(DISCONNECTED);
  } else if (currentState == DISCONNECTED) {
    setState(CONNECTED);
  }
}

void StatusIndicator::incrementErrorCount() {
  errorCount++;
  if (errorCount >= 5) {
    setState(CRITICAL_ERROR);
  } else {
    setState(ERROR);
  }
}

void StatusIndicator::resetErrorCount() {
  errorCount = 0;
  if (currentState == ERROR || currentState == CRITICAL_ERROR) {
    setState(READY);
  }
}

String StatusIndicator::getStatusString() const {
  switch (currentState) {
    case STARTING: return "STARTING";
    case CONNECTING: return "CONNECTING";
    case CONNECTED: return "CONNECTED";
    case AP_MODE: return "AP_MODE";
    case READY: return "READY";
    case RUNNING: return "RUNNING";
    case PAUSED: return "PAUSED";
    case SYNC_WAIT: return "SYNC_WAIT";
    case ERROR: return "ERROR";
    case DISCONNECTED: return "DISCONNECTED";
    case CRITICAL_ERROR: return "CRITICAL_ERROR";
    default: return "UNKNOWN";
  }
}

bool StatusIndicator::isStable() const {
  return stateStable;
}

int StatusIndicator::getErrorCount() const {
  return errorCount;
}

void StatusIndicator::setLED(int pin, bool state) {
  digitalWrite(pin, state ? HIGH : LOW);
}

void StatusIndicator::allOff() {
  setLED(greenPin, false);
  setLED(yellowPin, false);
  setLED(redPin, false);
}

void StatusIndicator::handleBlinking() {
  if (millis() - lastBlink > blinkSpeed) {
    blinkState = !blinkState;
    lastBlink = millis();
  }
}

void StatusIndicator::handleSlowBlinking() {
  if (millis() - lastBlink > 1000) {
    blinkState = !blinkState;
    lastBlink = millis();
  }
}

void StatusIndicator::handleRapidBlinking() {
  if (millis() - lastBlink > 150) {
    blinkState = !blinkState;
    lastBlink = millis();
  }
}

void StatusIndicator::handleDoubleBlinking() {
  unsigned long elapsed = millis() - lastBlink;

  if (elapsed < 150) {
    setLED(redPin, true);
    setLED(yellowPin, false);
    setLED(greenPin, false);
  } else if (elapsed < 300) {
    allOff();
  } else if (elapsed < 450) {
    setLED(redPin, true);
    setLED(yellowPin, false);
    setLED(greenPin, false);
  } else if (elapsed < 1000) {
    allOff();
  } else {
    lastBlink = millis();
  }
}

void StatusIndicator::handleTripleBlinking() {
  unsigned long elapsed = millis() - lastBlink;

  if (elapsed < 100) {
    setLED(redPin, true);
    setLED(yellowPin, false);
    setLED(greenPin, false);
  } else if (elapsed < 200) {
    setLED(redPin, false);
    setLED(yellowPin, true);
    setLED(greenPin, false);
  } else if (elapsed < 300) {
    setLED(redPin, false);
    setLED(yellowPin, false);
    setLED(greenPin, true);
  } else if (elapsed < 700) {
    allOff();
  } else {
    lastBlink = millis();
  }
}