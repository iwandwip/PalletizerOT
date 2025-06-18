/*
 * PalletizerSlave - Arduino Mega 5-Motor Controller
 * NEW ARCHITECTURE: Laptop Server → ESP32 Master → Arduino Mega Slave
 * Simple OOP implementation for motor control
 */

#include "MotorController.h"

MotorController* controller;

void setup() {
    controller = new MotorController();
    controller->begin();
}

void loop() {
    controller->loop();
}