#include "CommandForwarder.h"

CommandForwarder::CommandForwarder() {
  httpClient = nullptr;
  serialBridge = nullptr;
  isRunning = false;
  lastPollTime = 0;
  lastCommandTime = 0;
  commandCount = 0;
  currentCommandIndex = 0;
}

CommandForwarder::~CommandForwarder() {
  if (httpClient) delete httpClient;
  if (serialBridge) delete serialBridge;
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
  serialBridge = new SerialBridge(&Serial2);
  serialBridge->begin(115200);

  Serial.println("ESP32 Command Forwarder ready");
}

void CommandForwarder::update() {
  unsigned long currentTime = millis();

  if (currentTime - lastPollTime >= 2000) {
    pollForCommands();
    lastPollTime = currentTime;
  }

  if (isRunning && serialBridge->isReady() && (currentTime - lastCommandTime >= 500)) {
    processNextCommand();
    lastCommandTime = currentTime;
  }

  handleSerialResponse();
  delay(10);
}

void CommandForwarder::pollForCommands() {
  String response = httpClient->get("/api/script/poll");
  if (response.length() > 0) {
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, response);

    if (doc["hasNewScript"].as<bool>()) {
      commandCount = 0;
      currentCommandIndex = 0;

      JsonArray commandArray = doc["commands"];
      for (int i = 0; i < commandArray.size() && i < 100; i++) {
        commands[i] = commandArray[i].as<String>();
        commandCount++;
      }

      Serial.println("New commands received: " + String(commandCount));
    }
  }

  response = httpClient->get("/api/status");
  if (response.length() > 0) {
    DynamicJsonDocument doc(512);
    deserializeJson(doc, response);

    String status = doc["status"].as<String>();
    bool shouldStart = (status == "RUNNING");

    if (shouldStart && !isRunning) {
      isRunning = true;
      currentCommandIndex = 0;
      Serial.println("Starting command execution");
    } else if (!shouldStart && isRunning) {
      isRunning = false;
      Serial.println("Stopping command execution");
    }
  }
}

void CommandForwarder::processNextCommand() {
  if (currentCommandIndex >= commandCount) {
    isRunning = false;
    Serial.println("All commands completed");
    return;
  }

  String webCommand = commands[currentCommandIndex];
  String serialCommand = convertToSerial(webCommand);

  if (serialCommand.length() > 0) {
    Serial.println("Converting: " + webCommand + " -> " + serialCommand);
    if (serialBridge->sendCommandAndWait(serialCommand, "DONE", 5000)) {
      Serial.println("Command completed: " + serialCommand);
      currentCommandIndex++;
    } else {
      Serial.println("Command failed or timeout: " + serialCommand);
      isRunning = false;
    }
  }
}

void CommandForwarder::handleSerialResponse() {
  if (serialBridge->hasResponse()) {
    String response = serialBridge->readResponse();
    Serial.println("MEGA response: " + response);

    if (response.startsWith("ERROR")) {
      Serial.println("MEGA error detected: " + response);
      isRunning = false;
    }
  }
}

String CommandForwarder::convertToSerial(String webCommand) {
  if (webCommand.startsWith("MOVE:X")) {
    return "x;1;" + webCommand.substring(6) + ";";
  } else if (webCommand.startsWith("MOVE:Y")) {
    return "y;1;" + webCommand.substring(6) + ";";
  } else if (webCommand.startsWith("MOVE:Z")) {
    return "z;1;" + webCommand.substring(6) + ";";
  } else if (webCommand.startsWith("MOVE:T")) {
    return "t;1;" + webCommand.substring(6) + ";";
  } else if (webCommand.startsWith("MOVE:G")) {
    return "g;1;" + webCommand.substring(6) + ";";
  } else if (webCommand.startsWith("GROUP:")) {
    return "group;" + webCommand.substring(6) + ";";
  } else if (webCommand.startsWith("WAIT:")) {
    return "w;" + webCommand.substring(5) + ";";
  } else if (webCommand.startsWith("ZERO")) {
    return "zero;";
  }
  return "";
}

bool CommandForwarder::isWifiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void CommandForwarder::printStatus() {
  Serial.println("WiFi: " + String(isWifiConnected() ? "Connected" : "Disconnected"));
  Serial.println("Commands: " + String(commandCount));
  Serial.println("Running: " + String(isRunning ? "Yes" : "No"));
}