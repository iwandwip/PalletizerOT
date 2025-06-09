#include "StatusIndicator.h"

StatusIndicator::StatusIndicator(int greenPin, int yellowPin, int redPin)
  : greenPin(greenPin), yellowPin(yellowPin), redPin(redPin),
    currentState(STARTING), lastBlink(0), blinkState(false) {
}

void StatusIndicator::begin() {
  pinMode(greenPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(redPin, OUTPUT);

  allOff();
  Serial.println("Status indicator initialized - Green:" + String(greenPin) + " Yellow:" + String(yellowPin) + " Red:" + String(redPin));
}

void StatusIndicator::setState(State newState) {
  if (currentState != newState) {
    currentState = newState;
    allOff();

    switch (currentState) {
      case STARTING:
        Serial.println("Status: STARTING");
        break;
      case CONNECTING:
        Serial.println("Status: CONNECTING");
        break;
      case CONNECTED:
        Serial.println("Status: CONNECTED");
        setLED(greenPin, true);
        break;
      case AP_MODE:
        Serial.println("Status: AP_MODE");
        setLED(yellowPin, true);
        break;
      case READY:
        Serial.println("Status: READY");
        setLED(greenPin, true);
        break;
      case RUNNING:
        Serial.println("Status: RUNNING");
        break;
      case ERROR:
        Serial.println("Status: ERROR");
        setLED(redPin, true);
        break;
      case DISCONNECTED:
        Serial.println("Status: DISCONNECTED");
        break;
    }
  }
}

void StatusIndicator::update() {
  switch (currentState) {
    case STARTING:
      handleBlinking();
      if (blinkState) {
        setLED(redPin, true);
        setLED(yellowPin, false);
        setLED(greenPin, false);
      } else {
        setLED(redPin, false);
        setLED(yellowPin, true);
        setLED(greenPin, false);
      }
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

    case DISCONNECTED:
      handleBlinking();
      setLED(redPin, blinkState);
      setLED(yellowPin, false);
      setLED(greenPin, false);
      break;

    case ERROR:
      handleBlinking();
      if (millis() - lastBlink > 200) {
        blinkState = !blinkState;
        lastBlink = millis();
      }
      setLED(redPin, blinkState);
      setLED(yellowPin, false);
      setLED(greenPin, false);
      break;

    default:
      break;
  }
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
  if (millis() - lastBlink > 500) {
    blinkState = !blinkState;
    lastBlink = millis();
  }
}