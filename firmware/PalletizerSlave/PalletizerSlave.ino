#include "MotorController.h"
#include "CommandProcessor.h"

MotorController* motorController;
CommandProcessor* commandProcessor;

void setup() {
  Serial.begin(115200);
  Serial.println("Arduino Slave ready");

  motorController = new MotorController();
  motorController->begin();
  commandProcessor = new CommandProcessor(*motorController);
  commandProcessor->begin();
}

void loop() {
  commandProcessor->loop();
  motorController->run();
  delay(1);
}