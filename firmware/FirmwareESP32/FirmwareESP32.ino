#include "CommandForwarder.h"

CommandForwarder forwarder;

void setup() {
  forwarder.initialize("silenceAndSleep", "11111111", "palletizer.local", 3006);
}

void loop() {
  forwarder.update();
}