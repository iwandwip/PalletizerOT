#include "CommandForwarder.h"

CommandForwarder::CommandForwarder() {
  httpClient = nullptr;
  arm1Master = nullptr;
  arm2Master = nullptr;
  isRunning = false;
  lastPollTime = 0;
  lastCommandTime = 0;
  
  resetArmScript(arm1Script);
  resetArmScript(arm2Script);
  arm1Script.armId = "arm1";
  arm2Script.armId = "arm2";
}

CommandForwarder::~CommandForwarder() {
  if (httpClient) delete httpClient;
  if (arm1Master) delete arm1Master;
  if (arm2Master) delete arm2Master;
}

void CommandForwarder::initialize(const char* ssid, const char* password, const char* serverHost, int serverPort) {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected");

  httpClient = new HttpClient(serverHost, serverPort);
  
  arm1Master = new SerialBridge(&Serial1);
  arm2Master = new SerialBridge(&Serial2);
  
  Serial1.begin(115200, SERIAL_8N1, 16, 17);
  Serial2.begin(115200, SERIAL_8N1, 18, 19);
  
  arm1Master->begin(115200);
  arm2Master->begin(115200);

  Serial.println("ESP32 Dual-UART Command Forwarder ready");
  Serial.println("ARM1 Master: Serial1 (GPIO16/17)");
  Serial.println("ARM2 Master: Serial2 (GPIO18/19)");
}

void CommandForwarder::update() {
  unsigned long currentTime = millis();

  if (currentTime - lastPollTime >= 2000) {
    pollForCommands();
    lastPollTime = currentTime;
  }

  if (isRunning && (currentTime - lastCommandTime >= 500)) {
    processNextCommand();
    lastCommandTime = currentTime;
  }

  handleSerialResponse();
  delay(10);
}

void CommandForwarder::pollForCommands() {
  String response = httpClient->get("/api/script/poll");
  if (response.length() > 0) {
    DynamicJsonDocument doc(4096);
    deserializeJson(doc, response);

    if (doc["arm1"]["hasNewScript"].as<bool>()) {
      resetArmScript(arm1Script);
      arm1Script.armId = "arm1";
      arm1Script.format = doc["arm1"]["format"].as<String>();
      
      JsonArray commandArray = doc["arm1"]["commands"];
      for (int i = 0; i < commandArray.size() && i < 50; i++) {
        arm1Script.commands[i] = commandArray[i].as<String>();
        arm1Script.commandCount++;
      }
      
      arm1Script.isActive = true;
      logArmActivity("arm1", "New script loaded: " + String(arm1Script.commandCount) + " commands");
    }

    if (doc["arm2"]["hasNewScript"].as<bool>()) {
      resetArmScript(arm2Script);
      arm2Script.armId = "arm2";
      arm2Script.format = doc["arm2"]["format"].as<String>();
      
      JsonArray commandArray = doc["arm2"]["commands"];
      for (int i = 0; i < commandArray.size() && i < 50; i++) {
        arm2Script.commands[i] = commandArray[i].as<String>();
        arm2Script.commandCount++;
      }
      
      arm2Script.isActive = true;
      logArmActivity("arm2", "New script loaded: " + String(arm2Script.commandCount) + " commands");
    }

    bool shouldStart = doc["shouldStart"].as<bool>();
    if (shouldStart && !isRunning) {
      isRunning = true;
      Serial.println("Starting dual-arm execution");
    } else if (!shouldStart && isRunning) {
      isRunning = false;
      Serial.println("Stopping dual-arm execution");
    }
  }
}

void CommandForwarder::processNextCommand() {
  if (!isRunning) return;
  
  bool arm1Active = arm1Script.isActive && arm1Script.currentIndex < arm1Script.commandCount;
  bool arm2Active = arm2Script.isActive && arm2Script.currentIndex < arm2Script.commandCount;
  
  if (arm1Active) {
    processArmCommands(arm1Script, arm1Master);
  }
  
  if (arm2Active) {
    processArmCommands(arm2Script, arm2Master);
  }
  
  if (!arm1Active && !arm2Active) {
    isRunning = false;
    Serial.println("All dual-arm commands completed");
  }
}

void CommandForwarder::processArmCommands(ArmScript& arm, SerialBridge* serialBridge) {
  if (!arm.isActive || arm.currentIndex >= arm.commandCount) {
    return;
  }
  
  if (arm.status.isExecuting) {
    if (millis() - arm.status.startTime > arm.status.timeout) {
      arm.status.hasError = true;
      arm.status.errorMessage = "Command timeout";
      arm.status.isExecuting = false;
      logArmActivity(arm.armId, "Command timeout at index " + String(arm.currentIndex));
    } else {
      if (serialBridge->hasResponse()) {
        String response = serialBridge->readResponse();
        if (response.startsWith("OK") || response.startsWith("DONE")) {
          arm.status.isExecuting = false;
          arm.status.isComplete = true;
          arm.currentIndex++;
          logArmActivity(arm.armId, "Command completed: " + response);
        } else if (response.startsWith("ERROR")) {
          arm.status.isExecuting = false;
          arm.status.hasError = true;
          arm.status.errorMessage = response;
          logArmActivity(arm.armId, "Command failed: " + response);
        }
      }
    }
    return;
  }
  
  String webCommand = arm.commands[arm.currentIndex];
  String uartCommand = convertToUARTProtocol(webCommand, arm.armId);
  
  if (uartCommand.length() > 0) {
    Serial.println("Converting: " + webCommand + " -> " + uartCommand);
    if (serialBridge->sendCommand(uartCommand)) {
      arm.status.isExecuting = true;
      arm.status.isComplete = false;
      arm.status.hasError = false;
      arm.status.startTime = millis();
      arm.status.timeout = 10000;
      
      logArmActivity(arm.armId, "Started command " + String(arm.currentIndex + 1) + "/" + String(arm.commandCount) + ": " + webCommand);
    } else {
      arm.status.hasError = true;
      arm.status.errorMessage = "UART send failed";
      logArmActivity(arm.armId, "UART send failed for: " + webCommand);
    }
  }
}

void CommandForwarder::handleSerialResponse() {
  if (arm1Master->hasResponse()) {
    String response = arm1Master->readResponse();
    logArmActivity("arm1", "Response: " + response);
  }
  
  if (arm2Master->hasResponse()) {
    String response = arm2Master->readResponse();
    logArmActivity("arm2", "Response: " + response);
  }
}

String CommandForwarder::convertToUARTProtocol(String webCommand, String armId) {
  String uartCommand = armId + ":";
  
  if (webCommand.startsWith("MOVE:X")) {
    uartCommand += "X:" + webCommand.substring(6);
  } else if (webCommand.startsWith("MOVE:Y")) {
    uartCommand += "Y:" + webCommand.substring(6);
  } else if (webCommand.startsWith("MOVE:Z")) {
    uartCommand += "Z:" + webCommand.substring(6);
  } else if (webCommand.startsWith("MOVE:T")) {
    uartCommand += "T:" + webCommand.substring(6);
  } else if (webCommand.startsWith("MOVE:G")) {
    uartCommand += "G:" + webCommand.substring(6);
  } else if (webCommand.startsWith("GROUP:")) {
    uartCommand += "GROUP:" + webCommand.substring(6);
  } else if (webCommand.startsWith("WAIT:")) {
    uartCommand += "WAIT:" + webCommand.substring(5);
  } else if (webCommand.startsWith("ZERO")) {
    uartCommand += "ZERO";
  } else if (webCommand.startsWith("HOME")) {
    uartCommand += "HOME";
  } else if (webCommand.startsWith("SPEED:")) {
    uartCommand += "SPEED:" + webCommand.substring(6);
  } else {
    uartCommand += "RAW:" + webCommand;
  }
  
  return uartCommand;
}

void CommandForwarder::resetArmScript(ArmScript& arm) {
  arm.commandCount = 0;
  arm.currentIndex = 0;
  arm.format = "";
  arm.isActive = false;
  arm.status.isExecuting = false;
  arm.status.isComplete = false;
  arm.status.hasError = false;
  arm.status.errorMessage = "";
  arm.status.startTime = 0;
  arm.status.timeout = 5000;
}

void CommandForwarder::logArmActivity(const String& armId, const String& message) {
  Serial.println("[" + armId.toUpperCase() + "] " + message);
}

bool CommandForwarder::isWifiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void CommandForwarder::printStatus() {
  Serial.println("WiFi: " + String(isWifiConnected() ? "Connected" : "Disconnected"));
  Serial.println("System: " + String(isRunning ? "Running" : "Idle"));
  Serial.println("Arm1: " + String(arm1Script.commandCount) + " commands, Index: " + String(arm1Script.currentIndex));
  Serial.println("Arm2: " + String(arm2Script.commandCount) + " commands, Index: " + String(arm2Script.currentIndex));
}

void CommandForwarder::printDetailedStatus() {
  Serial.println("=== ESP32 Dual-Arm UART Status ===");
  Serial.println("WiFi: " + String(isWifiConnected() ? "Connected" : "Disconnected"));
  Serial.println("System: " + String(isRunning ? "Running" : "Idle"));
  
  Serial.println("--- ARM1 Status ---");
  Serial.println("  Commands: " + String(arm1Script.commandCount));
  Serial.println("  Progress: " + String(arm1Script.currentIndex) + "/" + String(arm1Script.commandCount));
  Serial.println("  Active: " + String(arm1Script.isActive ? "Yes" : "No"));
  Serial.println("  Executing: " + String(arm1Script.status.isExecuting ? "Yes" : "No"));
  if (arm1Script.status.hasError) {
    Serial.println("  Error: " + arm1Script.status.errorMessage);
  }
  
  Serial.println("--- ARM2 Status ---");
  Serial.println("  Commands: " + String(arm2Script.commandCount));
  Serial.println("  Progress: " + String(arm2Script.currentIndex) + "/" + String(arm2Script.commandCount));
  Serial.println("  Active: " + String(arm2Script.isActive ? "Yes" : "No"));
  Serial.println("  Executing: " + String(arm2Script.status.isExecuting ? "Yes" : "No"));
  if (arm2Script.status.hasError) {
    Serial.println("  Error: " + arm2Script.status.errorMessage);
  }
  
  Serial.println("========================");
}

bool CommandForwarder::isArmActive(const String& armId) {
  if (armId == "arm1") {
    return arm1Script.isActive;
  } else if (armId == "arm2") {
    return arm2Script.isActive;
  }
  return false;
}

int CommandForwarder::getArmProgress(const String& armId) {
  ArmScript* arm = nullptr;
  if (armId == "arm1") {
    arm = &arm1Script;
  } else if (armId == "arm2") {
    arm = &arm2Script;
  }
  
  if (arm && arm->commandCount > 0) {
    return (arm->currentIndex * 100) / arm->commandCount;
  }
  return 0;
}

String CommandForwarder::getArmStatus(const String& armId) {
  ArmScript* arm = nullptr;
  if (armId == "arm1") {
    arm = &arm1Script;
  } else if (armId == "arm2") {
    arm = &arm2Script;
  }
  
  if (!arm) return "UNKNOWN";
  
  if (arm->status.hasError) {
    return "ERROR: " + arm->status.errorMessage;
  } else if (arm->status.isExecuting) {
    return "EXECUTING";
  } else if (arm->isActive && arm->currentIndex < arm->commandCount) {
    return "READY";
  } else if (arm->currentIndex >= arm->commandCount) {
    return "COMPLETED";
  } else {
    return "IDLE";
  }
}