#include <AccelStepper.h>

#define CLK_PIN 10
#define CW_PIN 11
#define EN_PIN 12

AccelStepper stepper(AccelStepper::DRIVER, CLK_PIN, CW_PIN);
const float SPEED_RATIO = 0.6;
float maxSpeed = 500;
float acceleration = maxSpeed * SPEED_RATIO;

void setup() {
  Serial.begin(9600);
  stepper.setMaxSpeed(maxSpeed);
  stepper.setAcceleration(acceleration);
  stepper.setCurrentPosition(0);
  pinMode(EN_PIN, OUTPUT);
  Serial.println("| initialize ");
}

void loop() {
  if (Serial.available()) {
    digitalWrite(EN_PIN, LOW);
    int distance = Serial.readStringUntil('\n').toInt();
    Serial.print("| distance: ");
    Serial.print(distance);
    Serial.println();
    stepper.move(distance);
    stepper.runToPosition();
    digitalWrite(EN_PIN, HIGH);
  }
}
