#include "MotorController.h"

MotorController* controller;

void setup() {
  controller = new MotorController();
  controller->begin();
}

void loop() {
  controller->loop();
}