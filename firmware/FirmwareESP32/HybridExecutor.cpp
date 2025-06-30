#include "HybridExecutor.h"

HybridExecutor::HybridExecutor() {
  steps = nullptr;
  stepCount = 0;
  currentStepIndex = 0;
  isExecuting = false;
  stepStartTime = 0;
  lastSlaveResponse = 0;
}

HybridExecutor::~HybridExecutor() {
  clearScript();
}

bool HybridExecutor::loadScript(const String& hybridJson) {
  clearScript();
  
  DynamicJsonDocument doc(8192);
  DeserializationError error = deserializeJson(doc, hybridJson);
  
  if (error) {
    Serial.println("Failed to parse hybrid JSON: " + String(error.c_str()));
    return false;
  }
  
  JsonArray stepsArray = doc["steps"];
  if (!stepsArray) {
    Serial.println("No steps found in hybrid JSON");
    return false;
  }
  
  stepCount = stepsArray.size();
  steps = new HybridStep[stepCount];
  
  for (int i = 0; i < stepCount; i++) {
    if (!parseStep(stepsArray[i], steps[i])) {
      Serial.println("Failed to parse step " + String(i));
      clearScript();
      return false;
    }
  }
  
  Serial.println("Loaded hybrid script: " + String(stepCount) + " steps");
  return true;
}

bool HybridExecutor::parseStep(JsonObject stepObj, HybridStep& step) {
  step.id = stepObj["id"] | 0;
  step.action = stepObj["action"] | "";
  step.axis = stepObj["axis"] | "";
  step.position = stepObj["position"] | 0;
  step.speed = stepObj["speed"] | 1500;
  step.serial_cmd = stepObj["serial_cmd"] | "";
  step.expect_response = stepObj["expect_response"] | "DONE";
  step.timeout = stepObj["timeout"] | 5000;
  step.parallel = stepObj["parallel"] | false;
  step.command = stepObj["command"] | "";
  step.duration = stepObj["duration"] | 0;
  
  // Store JsonArray references for group commands
  if (stepObj.containsKey("commands")) {
    step.commands = stepObj["commands"];
  }
  if (stepObj.containsKey("expect_responses")) {
    step.expect_responses = stepObj["expect_responses"];
  }
  
  return true;
}

bool HybridExecutor::startExecution() {
  if (stepCount == 0) {
    Serial.println("No script loaded");
    return false;
  }
  
  isExecuting = true;
  currentStepIndex = 0;
  Serial.println("Starting execution of " + String(stepCount) + " steps");
  return true;
}

bool HybridExecutor::pauseExecution() {
  isExecuting = false;
  Serial.println("Execution paused at step " + String(currentStepIndex + 1));
  return true;
}

bool HybridExecutor::stopExecution() {
  isExecuting = false;
  currentStepIndex = 0;
  Serial.println("Execution stopped and reset");
  return true;
}

bool HybridExecutor::processExecution() {
  if (!isExecuting || currentStepIndex >= stepCount) {
    return false;
  }
  
  const HybridStep& currentStep = steps[currentStepIndex];
  
  if (stepStartTime == 0) {
    stepStartTime = millis();
    Serial.println("Executing step " + String(currentStep.id) + ": " + currentStep.action);
  }
  
  // Check timeout
  if (millis() - stepStartTime > currentStep.timeout) {
    Serial.println("Step " + String(currentStep.id) + " timeout");
    currentStepIndex++;
    stepStartTime = 0;
    return true;
  }
  
  // Execute step based on action type
  bool stepCompleted = false;
  
  if (currentStep.action == "MOVE") {
    stepCompleted = executeSingleCommand(currentStep);
  } else if (currentStep.action == "GROUP_MOVE") {
    stepCompleted = executeGroupCommand(currentStep);
  } else if (currentStep.action == "SYSTEM") {
    stepCompleted = executeSystemCommand(currentStep);
  } else if (currentStep.action == "WAIT") {
    stepCompleted = executeWaitCommand(currentStep);
  } else {
    Serial.println("Unknown action: " + currentStep.action);
    stepCompleted = true; // Skip unknown actions
  }
  
  if (stepCompleted) {
    Serial.println("Step " + String(currentStep.id) + " completed");
    currentStepIndex++;
    stepStartTime = 0;
    
    if (currentStepIndex >= stepCount) {
      isExecuting = false;
      Serial.println("Script execution completed");
    }
  }
  
  return true;
}

bool HybridExecutor::executeSingleCommand(const HybridStep& step) {
  static bool commandSent = false;
  
  if (!commandSent) {
    // Convert to Arduino MEGA format
    // Old format: x;1;100; -> New format: MOVE:X:100:0
    String megaCommand = "";
    
    if (step.action == "MOVE") {
      megaCommand = "MOVE:" + step.axis + ":" + String(step.position) + ":0";
    } else {
      // Use the serial_cmd as is for system commands
      megaCommand = step.serial_cmd;
    }
    
    sendSlaveCommand(megaCommand);
    commandSent = true;
    lastSlaveResponse = millis();
    return false; // Wait for response
  }
  
  bool responseReceived = waitForSlaveResponse(step.expect_response, 100); // Non-blocking check
  if (responseReceived) {
    commandSent = false;
    return true;
  }
  
  return false; // Still waiting
}

bool HybridExecutor::executeGroupCommand(const HybridStep& step) {
  static bool commandSent = false;
  
  if (!commandSent) {
    // Send group command to Arduino MEGA
    // Format: GROUP:X:100,Y:50,Z:10:0
    String groupCommand = "GROUP:";
    
    for (size_t i = 0; i < step.commands.size(); i++) {
      JsonVariant cmd = step.commands[i];
      String axis = cmd["axis"] | "";
      int position = cmd["position"] | 0;
      
      if (i > 0) groupCommand += ",";
      groupCommand += axis + ":" + String(position);
    }
    
    sendSlaveCommand(groupCommand);
    commandSent = true;
    lastSlaveResponse = millis();
    return false; // Wait for response
  }
  
  // Wait for GROUP_DONE response from Arduino MEGA
  bool responseReceived = waitForSlaveResponse("GROUP_DONE", 100);
  if (responseReceived) {
    commandSent = false;
    return true;
  }
  
  return false; // Still waiting
}

bool HybridExecutor::executeSystemCommand(const HybridStep& step) {
  static bool commandSent = false;
  
  if (!commandSent) {
    // Convert system commands to Arduino MEGA format
    String megaCommand = "";
    
    if (step.command.startsWith("HOME:")) {
      megaCommand = step.command; // HOME:X format
    } else if (step.command == "ZERO") {
      megaCommand = "ZERO";
    } else if (step.command.startsWith("SPEED:")) {
      megaCommand = step.command; // SPEED:X:1500 format
    } else if (step.command.startsWith("SET:")) {
      megaCommand = step.command; // SET:13:1 format
    } else {
      megaCommand = step.serial_cmd; // Fallback to raw command
    }
    
    sendSlaveCommand(megaCommand);
    commandSent = true;
    lastSlaveResponse = millis();
    return false;
  }
  
  bool responseReceived = waitForSlaveResponse(step.expect_response, 100);
  if (responseReceived) {
    commandSent = false;
    return true;
  }
  
  return false;
}

bool HybridExecutor::executeWaitCommand(const HybridStep& step) {
  static bool commandSent = false;
  
  if (!commandSent) {
    // Send wait command to Arduino MEGA
    String waitCommand = "WAIT:" + String(step.duration);
    sendSlaveCommand(waitCommand);
    commandSent = true;
    lastSlaveResponse = millis();
    return false;
  }
  
  bool responseReceived = waitForSlaveResponse("OK", 100);
  if (responseReceived) {
    commandSent = false;
    return true;
  }
  
  return false;
}

bool HybridExecutor::waitForSlaveResponse(const String& expectedResponse, unsigned long timeout) {
  if (Serial2.available()) {
    String response = Serial2.readStringUntil('\n');
    response.trim();
    
    if (response == expectedResponse) {
      return true;
    } else {
      Serial.println("Unexpected response: " + response + " (expected: " + expectedResponse + ")");
    }
  }
  
  return false; // No response or wrong response
}

bool HybridExecutor::waitForMultipleResponses(JsonArray expectedResponses, unsigned long timeout) {
  static int receivedCount = 0;
  
  if (Serial2.available()) {
    String response = Serial2.readStringUntil('\n');
    response.trim();
    
    // Check if response matches any expected response
    for (JsonVariant expected : expectedResponses) {
      if (response == expected.as<String>()) {
        receivedCount++;
        break;
      }
    }
  }
  
  if (receivedCount >= expectedResponses.size()) {
    receivedCount = 0;
    return true;
  }
  
  return false;
}

void HybridExecutor::sendSlaveCommand(const String& command) {
  Serial2.println(command);
  Serial.println("Sent to slave: " + command);
}

bool HybridExecutor::isRunning() {
  return isExecuting;
}

int HybridExecutor::getCurrentStep() {
  return currentStepIndex + 1;
}

int HybridExecutor::getTotalSteps() {
  return stepCount;
}

float HybridExecutor::getProgress() {
  if (stepCount == 0) return 0.0;
  return (float)currentStepIndex / (float)stepCount * 100.0;
}

void HybridExecutor::clearScript() {
  if (steps) {
    delete[] steps;
    steps = nullptr;
  }
  stepCount = 0;
  currentStepIndex = 0;
  isExecuting = false;
  stepStartTime = 0;
}

String HybridExecutor::getLastError() {
  return ""; // Placeholder for error handling
}