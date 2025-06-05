#include <AccelStepper.h>

#define CLK_PIN 10
#define CW_PIN 11
#define EN_PIN 12

AccelStepper stepper(AccelStepper::DRIVER, CLK_PIN, CW_PIN);
const float SPEED_RATIO = 0.5;
float maxSpeed = 5000;
float acceleration = maxSpeed * SPEED_RATIO;

void setup() {
  Serial.begin(9600);
  stepper.setMaxSpeed(maxSpeed);
  stepper.setAcceleration(acceleration);
  stepper.setCurrentPosition(0);
  // stepper.setMinPulseWidth(100);
  pinMode(EN_PIN, OUTPUT);
  Serial.println("| initialize ");
}

void loop() {
  if (Serial.available()) {
    digitalWrite(EN_PIN, LOW);
    delay(1000);
    int distance = Serial.readStringUntil('\n').toInt();

    Serial.print("| distance: ");
    Serial.print(distance);

    stepper.moveTo(distance);
    stepper.runToPosition();
    delay(1000);
    digitalWrite(EN_PIN, HIGH);
    Serial.println("| done ");
  }
}
