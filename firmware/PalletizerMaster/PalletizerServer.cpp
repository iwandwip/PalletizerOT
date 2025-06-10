#include "PalletizerServer.h"

PalletizerServer::PalletizerServer(PalletizerMaster *master, WiFiMode mode, const char *ap_ssid, const char *ap_password)
  : palletizerMaster(master), server(80), events("/events")
#if WEB_DEBUG == 1
    ,
    debugEvents("/debug")
#endif
    ,
    wifiMode(mode), ssid(ap_ssid), password(ap_password) {
  cacheMutex = xSemaphoreCreateMutex();
#if WEB_DEBUG == 1
  debugMutex = xSemaphoreCreateMutex();
#endif
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
  DEBUG_SERIAL_PRINTLN("HTTP server started");

  sendDebugMessage("INFO", "SERVER", "System initialized");
}

void PalletizerServer::update() {
}

void PalletizerServer::sendDebugMessage(const String &level, const String &source, const String &message) {
#if WEB_DEBUG == 1
  if (xSemaphoreTake(debugMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
    if (debugCaptureEnabled && debugEvents.count() > 0) {
      unsigned long currentTime = millis();

      if (isServerDuplicateMessage(level, source, message, currentTime)) {
        xSemaphoreGive(debugMutex);
        return;
      }

      addDebugMessageInternal(level, source, message);
    }
    xSemaphoreGive(debugMutex);
  }
#endif
}

void PalletizerServer::enableDebugCapture(bool enable) {
#if WEB_DEBUG == 1
  debugCaptureEnabled = enable;
#endif
}

void PalletizerServer::setupRoutes() {
  server.serveStatic("/", LittleFS, "/")
    .setDefaultFile("index.html")
    .setCacheControl("max-age=600");

  server.on("/command", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleCommand(request);
  });

  server.on("/write", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleWriteCommand(request);
  });

  server.on("/status", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetStatus(request);
  });

  server.on("/get_commands", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetCommands(request);
  });

  server.on("/download_commands", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleDownloadCommands(request);
  });

  server.on("/timeout_config", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetTimeoutConfig(request);
  });

  server.on("/timeout_config", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleSetTimeoutConfig(request);
  });

  server.on("/timeout_stats", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetTimeoutStats(request);
  });

  server.on("/clear_timeout_stats", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleClearTimeoutStats(request);
  });

#if WEB_DEBUG == 1
  server.on("/debug/buffer", HTTP_GET, [this](AsyncWebServerRequest *request) {
    this->handleGetDebugBuffer(request);
  });

  server.on("/debug/clear", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleClearDebugBuffer(request);
  });

  server.on("/debug/toggle", HTTP_POST, [this](AsyncWebServerRequest *request) {
    this->handleToggleDebugCapture(request);
  });
#endif

  server.on(
    "/upload", HTTP_POST,
    [](AsyncWebServerRequest *request) {
      request->send(200, "text/plain", "File uploaded successfully. Click PLAY to execute.");
    },
    [this](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
      this->handleUpload(request, filename, index, data, len, final);
    });

  events.onConnect([this](AsyncEventSourceClient *client) {
    String statusStr = getStatusString(palletizerMaster->getSystemState());
    sendStatusEvent(statusStr);
  });

#if WEB_DEBUG == 1
  debugEvents.onConnect([this](AsyncEventSourceClient *client) {
    sendDebugMessage("INFO", "DEBUG", "Client connected to debug stream");
  });

  server.addHandler(&debugEvents);
#endif

  server.addHandler(&events);

  server.on("/wifi_info", HTTP_GET, [this](AsyncWebServerRequest *request) {
    String info = "{";
    if (wifiMode == MODE_AP) {
      info += "\"mode\":\"AP\",";
      info += "\"ssid\":\"" + String(ssid) + "\",";
      info += "\"ip\":\"" + WiFi.softAPIP().toString() + "\"";
    } else {
      info += "\"mode\":\"STA\",";
      info += "\"ssid\":\"" + String(ssid) + "\",";
      info += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
      info += "\"connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false");
    }
    info += "}";
    request->send(200, "application/json", info);
  });

  server.onNotFound([](AsyncWebServerRequest *request) {
    if (request->method() == HTTP_OPTIONS) {
      request->send(200);
    } else {
      request->send(404, "text/plain", "Not found");
    }
  });
}

void PalletizerServer::handleUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
  static String tempBuffer = "";

  if (!index) {
    tempBuffer = "";
    ensureFileExists("/queue.txt");
    sendDebugMessage("INFO", "UPLOAD", "Started receiving file: " + filename);
  }

  String dataStr = String((char *)data, len);
  tempBuffer += dataStr;

  if (final) {
    safeFileWrite("/queue.txt", tempBuffer);
    invalidateCache();
    sendDebugMessage("INFO", "UPLOAD", "File saved: " + String(tempBuffer.length()) + " bytes");
    tempBuffer = "";
  }
}

void PalletizerServer::handleCommand(AsyncWebServerRequest *request) {
  String command = "";

  if (request->hasParam("cmd", true)) {
    command = request->getParam("cmd", true)->value();
  }

  if (command.length() > 0) {
    sendDebugMessage("INFO", "COMMAND", "Received: " + command);

    String upperCommand = command;
    upperCommand.toUpperCase();

    String commandType = "UNKNOWN";
    if (command.indexOf("FUNC(") != -1) {
      commandType = "SCRIPT_WITH_FUNCTIONS";
    } else if (command.indexOf("CALL(") != -1) {
      commandType = "SCRIPT_WITH_CALLS";
    } else if (upperCommand == "PLAY" || upperCommand == "PAUSE" || upperCommand == "STOP" || upperCommand == "IDLE") {
      commandType = "SYSTEM_CONTROL";
    } else if (upperCommand == "ZERO") {
      commandType = "HOMING";
    } else if (upperCommand.startsWith("SPEED;")) {
      commandType = "SPEED_CONTROL";
    } else if (upperCommand.startsWith("SET(") || upperCommand == "WAIT") {
      commandType = "SYNC_COMMAND";
    } else if (upperCommand == "DETECT") {
      commandType = "DETECT_COMMAND";
    } else if (command.indexOf("NEXT") != -1) {
      commandType = "LEGACY_BATCH";
    } else if (command.indexOf('(') != -1 && command.indexOf(',') != -1) {
      commandType = "LEGACY_COORDINATES";
    }

    sendDebugMessage("INFO", "PARSER", "Command type: " + commandType);

    unsigned long startTime = millis();
    palletizerMaster->processCommand(command);
    unsigned long parseTime = millis() - startTime;

    sendDebugMessage("INFO", "PARSER", "Parse completed in " + String(parseTime) + "ms");

    request->send(200, "text/plain", "Command sent: " + command);
  } else {
    request->send(400, "text/plain", "No command provided");
  }
}

void PalletizerServer::handleWriteCommand(AsyncWebServerRequest *request) {
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

void PalletizerServer::handleGetStatus(AsyncWebServerRequest *request) {
  String statusStr = getStatusString(palletizerMaster->getSystemState());
  String response = "{\"status\":\"" + statusStr + "\"}";
  request->send(200, "application/json", response);
}

void PalletizerServer::handleGetCommands(AsyncWebServerRequest *request) {
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

void PalletizerServer::handleDownloadCommands(AsyncWebServerRequest *request) {
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

  AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", commands);
  response->addHeader("Content-Disposition", "attachment; filename=palletizer_commands.txt");
  request->send(response);
}

void PalletizerServer::handleGetTimeoutConfig(AsyncWebServerRequest *request) {
  PalletizerRuntime::TimeoutConfig config = palletizerMaster->getTimeoutConfig();

  String response = "{";
  response += "\"maxWaitTime\":" + String(config.maxWaitTime) + ",";
  response += "\"strategy\":" + String(config.strategy) + ",";
  response += "\"maxTimeoutWarning\":" + String(config.maxTimeoutWarning) + ",";
  response += "\"autoRetryCount\":" + String(config.autoRetryCount) + ",";
  response += "\"saveToFile\":" + String(config.saveToFile ? "true" : "false");
  response += "}";

  request->send(200, "application/json", response);
}

void PalletizerServer::handleSetTimeoutConfig(AsyncWebServerRequest *request) {
  PalletizerRuntime::TimeoutConfig config = palletizerMaster->getTimeoutConfig();
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
      config.strategy = (PalletizerRuntime::WaitTimeoutStrategy)newStrategy;
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
    palletizerMaster->setTimeoutConfig(config);
    sendDebugMessage("INFO", "CONFIG", "Timeout configuration updated");
    request->send(200, "text/plain", "Timeout configuration updated successfully");
  } else {
    request->send(400, "text/plain", "No valid parameters provided");
  }
}

void PalletizerServer::handleGetTimeoutStats(AsyncWebServerRequest *request) {
  PalletizerRuntime::TimeoutStats stats = palletizerMaster->getTimeoutStats();
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

void PalletizerServer::handleClearTimeoutStats(AsyncWebServerRequest *request) {
  palletizerMaster->clearTimeoutStats();
  sendDebugMessage("INFO", "STATS", "Timeout statistics cleared");
  request->send(200, "text/plain", "Timeout statistics cleared successfully");
}

#if WEB_DEBUG == 1
void PalletizerServer::handleGetDebugBuffer(AsyncWebServerRequest *request) {
  int startIndex = 0;
  if (request->hasParam("start")) {
    startIndex = request->getParam("start")->value().toInt();
  }

  String response = getDebugBufferJSON(startIndex);
  request->send(200, "application/json", response);
}

void PalletizerServer::handleClearDebugBuffer(AsyncWebServerRequest *request) {
  xSemaphoreTake(debugMutex, portMAX_DELAY);
  debugBufferHead = 0;
  debugBufferTail = 0;
  debugMessageCount = 0;
  xSemaphoreGive(debugMutex);

  request->send(200, "text/plain", "Debug buffer cleared");
}

void PalletizerServer::handleToggleDebugCapture(AsyncWebServerRequest *request) {
  debugCaptureEnabled = !debugCaptureEnabled;
  String response = "{\"enabled\":" + String(debugCaptureEnabled ? "true" : "false") + "}";
  request->send(200, "application/json", response);
}
#endif

void PalletizerServer::sendStatusEvent(const String &status) {
  String eventData = "{\"type\":\"status\",\"value\":\"" + status + "\"}";
  events.send(eventData.c_str(), "message", millis());
}

void PalletizerServer::sendTimeoutEvent(int count, const String &type) {
  String eventData = "{\"type\":\"timeout\",\"count\":" + String(count) + ",\"eventType\":\"" + type + "\",\"time\":" + String(millis()) + "}";
  events.send(eventData.c_str(), "timeout", millis());
}

#if WEB_DEBUG == 1
void PalletizerServer::sendDebugEvent(const DebugMessage &msg) {
  String eventData = formatDebugMessage(msg);
  debugEvents.send(eventData.c_str(), "debug", millis());
}
#endif

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

bool PalletizerServer::ensureFileExists(const String &path) {
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
    case PalletizerMaster::STATE_IDLE:
      return "IDLE";
    case PalletizerMaster::STATE_RUNNING:
      return "RUNNING";
    case PalletizerMaster::STATE_PAUSED:
      return "PAUSED";
    case PalletizerMaster::STATE_STOPPING:
      return "STOPPING";
    default:
      return "UNKNOWN";
  }
}

void PalletizerServer::invalidateCache() {
  xSemaphoreTake(cacheMutex, portMAX_DELAY);
  commandsCacheValid = false;
  cachedCommands = "";
  xSemaphoreGive(cacheMutex);
}

String PalletizerServer::getCachedCommands() {
  String result;
  xSemaphoreTake(cacheMutex, portMAX_DELAY);
  result = cachedCommands;
  xSemaphoreGive(cacheMutex);
  return result;
}

void PalletizerServer::setCachedCommands(const String &commands) {
  xSemaphoreTake(cacheMutex, portMAX_DELAY);
  cachedCommands = commands;
  commandsCacheValid = true;
  xSemaphoreGive(cacheMutex);
}

#if WEB_DEBUG == 1
void PalletizerServer::addDebugMessage(const String &level, const String &source, const String &message) {
  addDebugMessageInternal(level, source, message);
}

void PalletizerServer::addDebugMessageInternal(const String &level, const String &source, const String &message) {
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

  DebugMessage msg = debugBuffer[(debugBufferTail - 1 + DEBUG_BUFFER_SIZE) % DEBUG_BUFFER_SIZE];
  sendDebugEvent(msg);
}

String PalletizerServer::getDebugBufferJSON(int startIndex) {
  xSemaphoreTake(debugMutex, portMAX_DELAY);

  String json = "{\"messages\":[";
  int count = 0;
  int index = debugBufferHead;

  for (int i = 0; i < debugMessageCount && i < startIndex + 100; i++) {
    if (i >= startIndex) {
      if (count > 0) json += ",";
      json += formatDebugMessage(debugBuffer[index]);
      count++;
    }
    index = (index + 1) % DEBUG_BUFFER_SIZE;
  }

  json += "],\"total\":" + String(debugMessageCount) + ",\"start\":" + String(startIndex) + ",\"count\":" + String(count) + "}";

  xSemaphoreGive(debugMutex);

  return json;
}

String PalletizerServer::formatDebugMessage(const DebugMessage &msg) {
  String json = "{";
  json += "\"timestamp\":" + String(msg.timestamp) + ",";
  json += "\"level\":\"" + msg.level + "\",";
  json += "\"source\":\"" + msg.source + "\",";
  json += "\"message\":\"" + msg.message + "\"";
  json += "}";
  return json;
}

bool PalletizerServer::isServerDuplicateMessage(const String &level, const String &source, const String &message, unsigned long currentTime) {
  if (serverDebugTracker.lastMessage == message && serverDebugTracker.lastLevel == level && serverDebugTracker.lastSource == source && (currentTime - serverDebugTracker.lastTimestamp) < 100) {
    serverDebugTracker.duplicateCount++;
    return true;
  }

  if (message.indexOf("▶️ EXECUTION STARTED") != -1) {
    static unsigned long lastExecutionStart = 0;
    if ((currentTime - lastExecutionStart) < 500) {
      return true;
    }
    lastExecutionStart = currentTime;
  }

  if (message.indexOf("📊 Execution Summary:") != -1 || message.indexOf("════════════════════════════════════════") != -1) {
    static unsigned long lastPerformanceMsg = 0;
    if ((currentTime - lastPerformanceMsg) < 1000) {
      return true;
    }
    lastPerformanceMsg = currentTime;
  }

  if (message.indexOf("[████████████████████]") != -1) {
    static unsigned long lastProgressMsg = 0;
    if ((currentTime - lastProgressMsg) < 300) {
      return true;
    }
    lastProgressMsg = currentTime;
  }

  if (message.indexOf("🔄 [") != -1 && message.indexOf("] Executing:") != -1) {
    static String lastSequenceMsg = "";
    if (message == lastSequenceMsg) {
      return true;
    }
    lastSequenceMsg = message;
  }

  serverDebugTracker.lastMessage = message;
  serverDebugTracker.lastLevel = level;
  serverDebugTracker.lastSource = source;
  serverDebugTracker.lastTimestamp = currentTime;
  serverDebugTracker.duplicateCount = 0;

  return false;
}
#endif