#include "PalletizerServer.h"
#include "PalletizerMaster.h"
#include "FlashManager.h"

PalletizerServer::PalletizerServer(PalletizerMaster *master, WiFiMode mode, const char *ap_ssid, const char *ap_password)
  : palletizerMaster(master), server(80), wifiMode(mode), ssid(ap_ssid), password(ap_password) {
}

void PalletizerServer::begin() {
  if (wifiMode == MODE_AP) {
    IPAddress apIP(192, 168, 4, 1);
    IPAddress netMsk(255, 255, 255, 0);
    WiFi.softAPConfig(apIP, apIP, netMsk);
    WiFi.softAP(ssid, password);
    IPAddress IP = WiFi.softAPIP();
    DEBUG_SERIAL_PRINT("AP Mode - IP address: ");
    DEBUG_SERIAL_PRINTLN(IP);
  } else {
    WiFi.setSleep(false);
    WiFi.setTxPower(WIFI_POWER_19_5dBm);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(true);

    WiFi.begin(ssid, password);
    int attempts = 0;
    DEBUG_SERIAL_PRINT("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      DEBUG_SERIAL_PRINT(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      DEBUG_SERIAL_PRINTLN();
      DEBUG_SERIAL_PRINT("STA Mode - Connected to WiFi. IP address: ");
      DEBUG_SERIAL_PRINTLN(WiFi.localIP());
    } else {
      DEBUG_SERIAL_PRINTLN();
      DEBUG_SERIAL_PRINTLN("Failed to connect to WiFi. Falling back to AP mode.");
      WiFi.disconnect();

      IPAddress apIP(192, 168, 4, 1);
      IPAddress netMsk(255, 255, 255, 0);
      WiFi.softAPConfig(apIP, apIP, netMsk);
      WiFi.softAP("ESP32_Palletizer_Fallback", "palletizer123");
      IPAddress IP = WiFi.softAPIP();
      DEBUG_SERIAL_PRINT("Fallback AP Mode - IP address: ");
      DEBUG_SERIAL_PRINTLN(IP);
    }
  }

  if (MDNS.begin("palletizer")) {
    DEBUG_SERIAL_PRINTLN("mDNS responder started. Access at: http://palletizer.local");
    MDNS.addService("http", "tcp", 80);
  }

  setupRoutes();
  server.begin();
  DEBUG_SERIAL_PRINTLN("HTTP server started with batch processing endpoints");
}

void PalletizerServer::update() {
}

void PalletizerServer::setupRoutes() {
  server.serveStatic("/", LittleFS, "/")
    .setDefaultFile("index.html")
    .setCacheControl("max-age=600");

  server.on("/command", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleCommand(request);
  });

  server.on(
    "/upload_commands", HTTP_POST,
    [](AsyncWebServerRequest *request) {
      request->send(200, "application/json", "{\"status\":\"uploaded\",\"message\":\"Commands uploaded successfully\"}");
    },
    [this](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
      this->handleUploadCommands(request, data, len, index, len);
    });

  server.on("/execution_status", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetExecutionStatus(request);
  });

  server.on("/upload_status", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetUploadStatus(request);
  });

  server.on("/clear_commands", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleClearCommands(request);
  });

  server.on("/ping", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handlePing(request);
  });

  server.on("/status", HTTP_GET, [this](AsyncWebServerRequest *request) {
    String statusStr = getStatusString((int)palletizerMaster->getSystemState());
    String response = "{\"status\":\"" + statusStr + "\"}";
    request->send(200, "application/json", response);
  });

  server.onNotFound([](AsyncWebServerRequest *request) {
    if (request->method() == HTTP_OPTIONS) {
      request->send(200);
    } else {
      request->send(404, "text/plain", "Not found");
    }
  });
}

void PalletizerServer::handleCommand(AsyncWebServerRequest *request) {
  String command = "";

  if (request->hasParam("cmd", true)) {
    command = request->getParam("cmd", true)->value();
  }

  if (command.length() > 0) {
    DEBUG_SERIAL_PRINTLN("SERVER: Received command: " + command);
    palletizerMaster->processCommand(command);
    request->send(200, "text/plain", "Command sent: " + command);
  } else {
    request->send(400, "text/plain", "No command provided");
  }
}

void PalletizerServer::handleUploadCommands(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
  static String commandBuffer = "";

  if (index == 0) {
    commandBuffer = "";
    DEBUG_SERIAL_PRINTLN("SERVER: Starting command upload");
  }

  String dataStr = String((char *)data, len);
  commandBuffer += dataStr;

  if (index + len == total) {
    DEBUG_SERIAL_PRINTLN("SERVER: Upload completed, storing to flash");
    bool success = palletizerMaster->uploadCommands(commandBuffer);

    if (success) {
      String response = "{";
      response += "\"status\":\"uploaded\",";
      response += "\"lines\":" + String(palletizerMaster->getFlashManager()->getTotalLines()) + ",";
      response += "\"size\":\"" + String(commandBuffer.length()) + " bytes\",";
      response += "\"timestamp\":" + String(millis());
      response += "}";

      DEBUG_SERIAL_PRINTLN("SERVER: Upload successful");
    } else {
      DEBUG_SERIAL_PRINTLN("SERVER: Upload failed");
    }

    commandBuffer = "";
  }
}

void PalletizerServer::handleGetExecutionStatus(AsyncWebServerRequest *request) {
  String status = palletizerMaster->getExecutionStatus();
  request->send(200, "application/json", status);
}

void PalletizerServer::handleGetUploadStatus(AsyncWebServerRequest *request) {
  FlashManager *flashManager = palletizerMaster->getFlashManager();
  bool hasCommands = flashManager ? flashManager->hasCommands() : false;

  String response = "{";
  response += "\"hasCommands\":" + String(hasCommands ? "true" : "false") + ",";

  if (hasCommands) {
    response += "\"info\":\"" + flashManager->getStorageInfo() + "\"";
  } else {
    response += "\"info\":\"No commands uploaded\"";
  }

  response += "}";

  request->send(200, "application/json", response);
}

void PalletizerServer::handleClearCommands(AsyncWebServerRequest *request) {
  FlashManager *flashManager = palletizerMaster->getFlashManager();
  bool success = flashManager ? flashManager->clearCommands() : false;

  if (success) {
    request->send(200, "application/json", "{\"status\":\"cleared\",\"message\":\"Commands cleared successfully\"}");
    DEBUG_SERIAL_PRINTLN("SERVER: Commands cleared");
  } else {
    request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Failed to clear commands\"}");
    DEBUG_SERIAL_PRINTLN("SERVER: Failed to clear commands");
  }
}

void PalletizerServer::handlePing(AsyncWebServerRequest *request) {
  request->send(200, "text/plain", "pong");
}

void PalletizerServer::safeFileWrite(const String &path, const String &content) {
  if (LittleFS.exists(path)) {
    LittleFS.remove(path);
    delay(10);
  }

  File file = LittleFS.open(path, "w");
  if (file) {
    file.print(content);
    file.close();
  }
}

String PalletizerServer::getStatusString(int state) {
  switch (state) {
    case 0:  // PalletizerMaster::STATE_IDLE
      return "IDLE";
    case 1:  // PalletizerMaster::STATE_RUNNING
      return "RUNNING";
    case 2:  // PalletizerMaster::STATE_PAUSED
      return "PAUSED";
    case 3:  // PalletizerMaster::STATE_STOPPING
      return "STOPPING";
    default:
      return "UNKNOWN";
  }
}