#include "PalletizerServer.h"

PalletizerServer::PalletizerServer(PalletizerMaster* master, WiFiMode mode, const char* ssid, const char* password)
  : palletizerMaster(master), server(80), events("/events"), debugEvents("/debug"),
    wifiMode(mode), ssid(ssid), password(password) {

  cacheMutex = xSemaphoreCreateMutex();
  debugMutex = xSemaphoreCreateMutex();

  for (int i = 0; i < DEBUG_BUFFER_SIZE; i++) {
    debugBuffer[i].timestamp = 0;
    debugBuffer[i].level = "";
    debugBuffer[i].source = "";
    debugBuffer[i].message = "";
  }
}

void PalletizerServer::begin() {
  if (wifiMode == MODE_AP) {
    WiFi.softAP(ssid, password);
    Serial.println("AP Mode - IP: " + WiFi.softAPIP().toString());
  } else {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("STA Mode - IP: " + WiFi.localIP().toString());

      if (MDNS.begin("palletizer")) {
        Serial.println("mDNS responder started: palletizer.local");
      }
    } else {
      Serial.println("WiFi connection failed, switching to AP mode");
      WiFi.softAP(ssid, "palletizer123");
    }
  }

  setupRoutes();

  server.addHandler(&events);
  server.addHandler(&debugEvents);
  server.begin();

  Serial.println("HTTP server started");
}

void PalletizerServer::update() {
  PalletizerMaster::SystemState currentState = palletizerMaster->getSystemState();
  unsigned long currentTime = millis();

  if (currentState != lastReportedState || (currentTime - lastStateUpdate) > STATE_UPDATE_INTERVAL) {
    sendStatusEvent(getStatusString(currentState));
    lastReportedState = currentState;
    lastStateUpdate = currentTime;
  }
}

void PalletizerServer::sendDebugMessage(const String& level, const String& source, const String& message) {
  if (!debugCaptureEnabled) return;

  unsigned long currentTime = millis();
  if (isServerDuplicateMessage(level, source, message, currentTime)) {
    return;
  }

  addDebugMessage(level, source, message);

  DebugMessage msg;
  msg.timestamp = currentTime;
  msg.level = level;
  msg.source = source;
  msg.message = message;

  sendDebugEvent(msg);
}

void PalletizerServer::enableDebugCapture(bool enable) {
  debugCaptureEnabled = enable;
}

void PalletizerServer::setupRoutes() {
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  server.on("/command", HTTP_POST, [this](AsyncWebServerRequest* request) {
    handleCommand(request);
  });

  server.on("/write", HTTP_POST, [this](AsyncWebServerRequest* request) {
    handleWriteCommand(request);
  });

  server.on("/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
    handleGetStatus(request);
  });

  server.on("/commands", HTTP_GET, [this](AsyncWebServerRequest* request) {
    handleGetCommands(request);
  });

  server.on("/download", HTTP_GET, [this](AsyncWebServerRequest* request) {
    handleDownloadCommands(request);
  });

  server.on("/timeout-config", HTTP_GET, [this](AsyncWebServerRequest* request) {
    handleGetTimeoutConfig(request);
  });

  server.on("/timeout-config", HTTP_POST, [this](AsyncWebServerRequest* request) {
    handleSetTimeoutConfig(request);
  });

  server.on("/timeout-stats", HTTP_GET, [this](AsyncWebServerRequest* request) {
    handleGetTimeoutStats(request);
  });

  server.on("/clear-timeout-stats", HTTP_POST, [this](AsyncWebServerRequest* request) {
    handleClearTimeoutStats(request);
  });

  server.on("/debug-buffer", HTTP_GET, [this](AsyncWebServerRequest* request) {
    handleGetDebugBuffer(request);
  });

  server.on("/clear-debug", HTTP_POST, [this](AsyncWebServerRequest* request) {
    handleClearDebugBuffer(request);
  });

  server.on("/toggle-debug", HTTP_POST, [this](AsyncWebServerRequest* request) {
    handleToggleDebugCapture(request);
  });

  server.on(
    "/upload", HTTP_POST, [this](AsyncWebServerRequest* request) {
      request->send(200, "text/plain", "Upload completed");
    },
    [this](AsyncWebServerRequest* request, String filename, size_t index, uint8_t* data, size_t len, bool final) {
      handleUpload(request, filename, index, data, len, final);
    });
}

void PalletizerServer::handleUpload(AsyncWebServerRequest* request, String filename, size_t index, uint8_t* data, size_t len, bool final) {
  static File uploadFile;

  if (!index) {
    String path = "/upload_" + filename;
    uploadFile = LittleFS.open(path, "w");
    if (!uploadFile) {
      request->send(500, "text/plain", "Failed to create file");
      return;
    }
  }

  if (uploadFile && len) {
    uploadFile.write(data, len);
  }

  if (final) {
    if (uploadFile) {
      uploadFile.close();
      sendDebugMessage("INFO", "UPLOAD", "File uploaded: " + filename);
    }
  }
}

void PalletizerServer::handleCommand(AsyncWebServerRequest* request) {
  String command = "";

  if (request->hasParam("cmd", true)) {
    command = request->getParam("cmd", true)->value();
  }

  if (command.length() > 0) {
    palletizerMaster->processCommand(command);
    request->send(200, "text/plain", "Command executed: " + command);
  } else {
    request->send(400, "text/plain", "No command provided");
  }
}

void PalletizerServer::handleWriteCommand(AsyncWebServerRequest* request) {
  String commands = "";

  if (request->hasParam("text", true)) {
    commands = request->getParam("text", true)->value();
  }

  if (commands.length() > 0) {
    safeFileWrite("/queue.txt", commands);
    setCachedCommands(commands);
    sendDebugMessage("INFO", "WRITE", "Saved " + String(commands.length()) + " bytes to queue");
    request->send(200, "text/plain", "Commands saved successfully. Click PLAY to execute.");
  } else {
    request->send(400, "text/plain", "No commands provided");
  }
}

void PalletizerServer::handleGetStatus(AsyncWebServerRequest* request) {
  PalletizerMaster::SystemState state = palletizerMaster->getSystemState();
  QueueManager::ExecutionInfo execInfo = palletizerMaster->getQueueManager().getExecutionInfo();

  String response = "{";
  response += "\"state\":\"" + getStatusString(state) + "\",";
  response += "\"queueSize\":" + String(palletizerMaster->getQueueManager().getQueueSize()) + ",";
  response += "\"currentCommand\":" + String(execInfo.currentCommand) + ",";
  response += "\"totalCommands\":" + String(execInfo.totalCommands) + ",";
  response += "\"isExecuting\":" + String(execInfo.isExecuting ? "true" : "false") + ",";
  response += "\"freeHeap\":" + String(ESP.getFreeHeap());
  response += "}";

  request->send(200, "application/json", response);
}

void PalletizerServer::handleGetCommands(AsyncWebServerRequest* request) {
  String commands = getCachedCommands();

  if (commands.length() == 0 && !commandsCacheValid) {
    if (!LittleFS.exists("/queue.txt")) {
      request->send(404, "text/plain", "File not found");
      return;
    }

    File file = LittleFS.open("/queue.txt", "r");
    if (!file) {
      request->send(404, "text/plain", "Failed to open file");
      return;
    }

    commands = file.readString();
    file.close();
    setCachedCommands(commands);
  }

  request->send(200, "text/plain", commands);
}

void PalletizerServer::handleDownloadCommands(AsyncWebServerRequest* request) {
  String commands = getCachedCommands();

  if (commands.length() == 0 && !commandsCacheValid) {
    if (!LittleFS.exists("/queue.txt")) {
      request->send(404, "text/plain", "File not found");
      return;
    }

    File file = LittleFS.open("/queue.txt", "r");
    if (!file) {
      request->send(404, "text/plain", "Failed to open file");
      return;
    }

    commands = file.readString();
    file.close();
    setCachedCommands(commands);
  }

  AsyncWebServerResponse* response = request->beginResponse(200, "text/plain", commands);
  response->addHeader("Content-Disposition", "attachment; filename=palletizer_commands.txt");
  request->send(response);
}

void PalletizerServer::handleGetTimeoutConfig(AsyncWebServerRequest* request) {
  QueueManager::TimeoutConfig config = palletizerMaster->getQueueManager().getTimeoutConfig();

  String response = "{";
  response += "\"maxWaitTime\":" + String(config.maxWaitTime) + ",";
  response += "\"strategy\":" + String(config.strategy) + ",";
  response += "\"maxTimeoutWarning\":" + String(config.maxTimeoutWarning) + ",";
  response += "\"autoRetryCount\":" + String(config.autoRetryCount) + ",";
  response += "\"saveToFile\":" + String(config.saveToFile ? "true" : "false");
  response += "}";

  request->send(200, "application/json", response);
}

void PalletizerServer::handleSetTimeoutConfig(AsyncWebServerRequest* request) {
  QueueManager::TimeoutConfig config = palletizerMaster->getQueueManager().getTimeoutConfig();
  bool configChanged = false;

  if (request->hasParam("maxWaitTime", true)) {
    unsigned long newTimeout = request->getParam("maxWaitTime", true)->value().toInt();
    if (newTimeout >= 5000 && newTimeout <= 300000) {
      config.maxWaitTime = newTimeout;
      configChanged = true;
    }
  }

  if (request->hasParam("strategy", true)) {
    int newStrategy = request->getParam("strategy", true)->value().toInt();
    if (newStrategy >= 0 && newStrategy <= 3) {
      config.strategy = (QueueManager::WaitTimeoutStrategy)newStrategy;
      configChanged = true;
    }
  }

  if (request->hasParam("maxTimeoutWarning", true)) {
    int newWarning = request->getParam("maxTimeoutWarning", true)->value().toInt();
    if (newWarning >= 1 && newWarning <= 20) {
      config.maxTimeoutWarning = newWarning;
      configChanged = true;
    }
  }

  if (request->hasParam("autoRetryCount", true)) {
    int newRetry = request->getParam("autoRetryCount", true)->value().toInt();
    if (newRetry >= 0 && newRetry <= 5) {
      config.autoRetryCount = newRetry;
      configChanged = true;
    }
  }

  if (request->hasParam("saveToFile", true)) {
    String saveValue = request->getParam("saveToFile", true)->value();
    config.saveToFile = (saveValue == "true" || saveValue == "1");
    configChanged = true;
  }

  if (configChanged) {
    palletizerMaster->getQueueManager().setTimeoutConfig(config);
    sendDebugMessage("INFO", "CONFIG", "Timeout configuration updated");
    request->send(200, "text/plain", "Timeout configuration updated successfully");
  } else {
    request->send(400, "text/plain", "No valid parameters provided");
  }
}

void PalletizerServer::handleGetTimeoutStats(AsyncWebServerRequest* request) {
  PalletizerMaster::TimeoutStats stats = palletizerMaster->getTimeoutStats();
  float successRate = palletizerMaster->getTimeoutSuccessRate();

  String response = "{";
  response += "\"totalTimeouts\":" + String(stats.totalTimeouts) + ",";
  response += "\"successfulWaits\":" + String(stats.successfulWaits) + ",";
  response += "\"lastTimeoutTime\":" + String(stats.lastTimeoutTime) + ",";
  response += "\"totalWaitTime\":" + String(stats.totalWaitTime) + ",";
  response += "\"currentRetryCount\":" + String(stats.currentRetryCount) + ",";
  response += "\"successRate\":" + String(successRate, 2);
  response += "}";

  request->send(200, "application/json", response);
}

void PalletizerServer::handleClearTimeoutStats(AsyncWebServerRequest* request) {
  palletizerMaster->clearTimeoutStats();
  sendDebugMessage("INFO", "STATS", "Timeout statistics cleared");
  request->send(200, "text/plain", "Timeout statistics cleared successfully");
}

void PalletizerServer::handleGetDebugBuffer(AsyncWebServerRequest* request) {
  int startIndex = 0;
  if (request->hasParam("start")) {
    startIndex = request->getParam("start")->value().toInt();
  }

  String response = getDebugBufferJSON(startIndex);
  request->send(200, "application/json", response);
}

void PalletizerServer::handleClearDebugBuffer(AsyncWebServerRequest* request) {
  if (xSemaphoreTake(debugMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    debugBufferHead = 0;
    debugBufferTail = 0;
    debugMessageCount = 0;
    xSemaphoreGive(debugMutex);
  }

  sendDebugMessage("INFO", "DEBUG", "Debug buffer cleared");
  request->send(200, "text/plain", "Debug buffer cleared successfully");
}

void PalletizerServer::handleToggleDebugCapture(AsyncWebServerRequest* request) {
  debugCaptureEnabled = !debugCaptureEnabled;
  String status = debugCaptureEnabled ? "enabled" : "disabled";
  sendDebugMessage("INFO", "DEBUG", "Debug capture " + status);
  request->send(200, "text/plain", "Debug capture " + status);
}

void PalletizerServer::sendStatusEvent(const String& status) {
  events.send(status.c_str(), "status", millis());
}

void PalletizerServer::sendTimeoutEvent(int count, const String& type) {
  String data = "{\"count\":" + String(count) + ",\"type\":\"" + type + "\"}";
  events.send(data.c_str(), "timeout", millis());
}

void PalletizerServer::sendDebugEvent(const DebugMessage& msg) {
  String data = formatDebugMessage(msg);
  debugEvents.send(data.c_str(), "debug", millis());
}

void PalletizerServer::safeFileWrite(const String& path, const String& content) {
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

bool PalletizerServer::ensureFileExists(const String& path) {
  if (!LittleFS.exists(path)) {
    File file = LittleFS.open(path, "w");
    if (file) {
      file.close();
      return true;
    }
    return false;
  }
  return true;
}

String PalletizerServer::getStatusString(PalletizerMaster::SystemState state) {
  switch (state) {
    case PalletizerMaster::STATE_IDLE: return "IDLE";
    case PalletizerMaster::STATE_RUNNING: return "RUNNING";
    case PalletizerMaster::STATE_PAUSED: return "PAUSED";
    case PalletizerMaster::STATE_STOPPING: return "STOPPING";
    default: return "UNKNOWN";
  }
}

void PalletizerServer::invalidateCache() {
  if (xSemaphoreTake(cacheMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    commandsCacheValid = false;
    cachedCommands = "";
    xSemaphoreGive(cacheMutex);
  }
}

String PalletizerServer::getCachedCommands() {
  String result = "";
  if (xSemaphoreTake(cacheMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    if (commandsCacheValid) {
      result = cachedCommands;
    }
    xSemaphoreGive(cacheMutex);
  }
  return result;
}

void PalletizerServer::setCachedCommands(const String& commands) {
  if (xSemaphoreTake(cacheMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    cachedCommands = commands;
    commandsCacheValid = true;
    xSemaphoreGive(cacheMutex);
  }
}

void PalletizerServer::addDebugMessage(const String& level, const String& source, const String& message) {
  if (xSemaphoreTake(debugMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
    addDebugMessageInternal(level, source, message);
    xSemaphoreGive(debugMutex);
  }
}

void PalletizerServer::addDebugMessageInternal(const String& level, const String& source, const String& message) {
  debugBuffer[debugBufferTail].timestamp = millis();
  debugBuffer[debugBufferTail].level = level;
  debugBuffer[debugBufferTail].source = source;
  debugBuffer[debugBufferTail].message = message;

  debugBufferTail = (debugBufferTail + 1) % DEBUG_BUFFER_SIZE;

  if (debugMessageCount < DEBUG_BUFFER_SIZE) {
    debugMessageCount++;
  } else {
    debugBufferHead = (debugBufferHead + 1) % DEBUG_BUFFER_SIZE;
  }
}

String PalletizerServer::getDebugBufferJSON(int startIndex) {
  String json = "{\"messages\":[";

  if (xSemaphoreTake(debugMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    int currentIndex = debugBufferHead;
    int count = 0;
    bool first = true;

    while (count < debugMessageCount && count < 100) {
      if (count >= startIndex) {
        if (!first) json += ",";
        json += formatDebugMessage(debugBuffer[currentIndex]);
        first = false;
      }

      currentIndex = (currentIndex + 1) % DEBUG_BUFFER_SIZE;
      count++;
    }

    xSemaphoreGive(debugMutex);
  }

  json += "],\"total\":" + String(debugMessageCount) + "}";
  return json;
}

String PalletizerServer::formatDebugMessage(const DebugMessage& msg) {
  String json = "{";
  json += "\"timestamp\":" + String(msg.timestamp) + ",";
  json += "\"level\":\"" + msg.level + "\",";
  json += "\"source\":\"" + msg.source + "\",";
  json += "\"message\":\"" + msg.message + "\"";
  json += "}";
  return json;
}

bool PalletizerServer::isServerDuplicateMessage(const String& level, const String& source, const String& message, unsigned long currentTime) {
  String messageKey = level + ":" + source + ":" + message;

  if (serverDebugTracker.lastMessage == messageKey && (currentTime - serverDebugTracker.lastTimestamp) < 100) {
    serverDebugTracker.duplicateCount++;
    return true;
  }

  serverDebugTracker.lastMessage = messageKey;
  serverDebugTracker.lastLevel = level;
  serverDebugTracker.lastSource = source;
  serverDebugTracker.lastTimestamp = currentTime;
  serverDebugTracker.duplicateCount = 0;
  return false;
}