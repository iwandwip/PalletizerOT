#include "HttpClient.h"
#include "CommandStorage.h"
#include "MSLParser.h"
#include <LittleFS.h>
#include <WiFi.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "silenceAndSleep";
const char* WIFI_PASSWORD = "11111111";
const char* SERVER_HOST = "palletizer.local";
const int SERVER_PORT = 3006;

HttpClient* httpClient;
CommandStorage* commandStorage;
MSLParser* mslParser;

bool isRunning = false;
unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL = 2000;
unsigned long lastCommandTime = 0;
const unsigned long COMMAND_INTERVAL = 500;
String currentScript = "";  // Faster processing for hybrid executor

void setup() {
  Serial.begin(115200);
  Serial2.begin(115200);

  if (!LittleFS.begin()) {
    Serial.println("LittleFS Mount Failed");
    return;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected");

  httpClient = new HttpClient(SERVER_HOST, SERVER_PORT);
  commandStorage = new CommandStorage();
  mslParser = new MSLParser();

  Serial.println("ESP32 Master ready (MSL Mode)");
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastPollTime >= POLL_INTERVAL) {
    pollForScript();
    lastPollTime = currentTime;
  }

  if (isRunning && (currentTime - lastCommandTime >= COMMAND_INTERVAL)) {
    processNextCommand();
    lastCommandTime = currentTime;
  }

  handleSerialResponse();
  delay(10);
}

void pollForScript() {
  String response = httpClient->get("/get_commands");
  if (response.length() > 0 && response != currentScript) {
    currentScript = response;
    Serial.println("New MSL script received: " + currentScript.substring(0, 50) + "...");

    mslParser->parseScript(currentScript);
    Serial.println("MSL script parsed successfully");

    commandStorage->saveScriptText(currentScript);
  }

  response = httpClient->get("/status");
  if (response.length() > 0) {
    DynamicJsonDocument doc(512);
    deserializeJson(doc, response);

    String status = doc["status"].as<String>();
    bool shouldStart = (status == "RUNNING");

    if (shouldStart && !isRunning) {
      isRunning = true;
      mslParser->reset();
      Serial.println("Starting script execution");
    } else if (!shouldStart && isRunning) {
      isRunning = false;
      Serial.println("Stopping script execution");
    }
  }
}

void processNextCommand() {
  if (!mslParser->hasMoreCommands()) {
    isRunning = false;
    Serial.println("All commands completed");
    return;
  }

  String command = mslParser->getNextCommand();
  if (command.length() > 0) {
    Serial.println("Executing: " + command);
    Serial2.println(command);
  }
}

void handleSerialResponse() {
  if (Serial2.available()) {
    String response = Serial2.readStringUntil('\n');
    response.trim();

    if (response == "OK" || response == "DONE") {
      Serial.println("Command acknowledged: " + response);
    } else if (response.startsWith("ERROR")) {
      Serial.println("Command failed: " + response);
      isRunning = false;
    }
  }
}