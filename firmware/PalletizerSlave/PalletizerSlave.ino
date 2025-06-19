#include "MotorController.h"
#include "CommandProcessor.h"

MotorController* motorController;
CommandProcessor* commandProcessor;

void setup() {
  Serial.println("\n=== PalletizerSlave Starting ===");
  Serial.println("Simple OOP Architecture");
  motorController = new MotorController();
  motorController->begin();
  commandProcessor = new CommandProcessor(*motorController);
  commandProcessor->begin();
  Serial.println("Slave system ready!");
}

void loop() {
  commandProcessor->loop();
  motorController->run();
  delay(1);
}