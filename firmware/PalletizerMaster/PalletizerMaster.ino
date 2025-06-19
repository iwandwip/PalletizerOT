#include "HttpClient.h"
#include "CommandStorage.h"

const char* WIFI_SSID = "silenceAndSleep";
const char* WIFI_PASSWORD = "11111111";
const char* SERVER_HOST = "palletizer.local";
const int SERVER_PORT = 3006;

HttpClient* httpClient;
CommandStorage* commandStorage;

bool isRunning = false;
unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL = 2000;
unsigned long lastCommandTime = 0;
const unsigned long COMMAND_INTERVAL = 1000;

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

  Serial.println("ESP32 Master ready");
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
  String response = httpClient->get("/api/script/poll");
  if (response.length() > 0) {
    DynamicJsonDocument doc(4096);
    deserializeJson(doc, response);

    if (doc["hasNewScript"].as<bool>()) {
      String scriptId = doc["scriptId"].as<String>();
      JsonArray commands = doc["commands"];

      Serial.println("New script received: " + scriptId);
      commandStorage->saveScript(scriptId, commands);
      Serial.println("Script saved to LittleFS");
    }

    isRunning = doc["shouldStart"].as<bool>();
  }
}

void processNextCommand() {
  String response = httpClient->get("/api/command/next");
  if (response.length() > 0) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);

    if (doc["hasCommand"].as<bool>()) {
      String command = doc["command"].as<String>();
      Serial.println("Executing: " + command);

      Serial2.println(command);

    } else if (doc["isComplete"].as<bool>()) {
      isRunning = false;
      Serial.println("All commands completed");
    }
  }
}

void handleSerialResponse() {
  if (Serial2.available()) {
    String response = Serial2.readStringUntil('\n');
    response.trim();

    if (response == "OK" || response == "DONE") {
      Serial.println("Command acknowledged: " + response);

      DynamicJsonDocument doc(256);
      doc["success"] = true;
      String jsonString;
      serializeJson(doc, jsonString);

      httpClient->post("/api/command/ack", jsonString);

    } else if (response.startsWith("ERROR")) {
      Serial.println("Command failed: " + response);

      DynamicJsonDocument doc(256);
      doc["success"] = false;
      doc["error"] = response;
      String jsonString;
      serializeJson(doc, jsonString);

      httpClient->post("/api/command/ack", jsonString);
      isRunning = false;
    }
  }
}