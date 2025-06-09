#include "HttpServer.h"

HttpServer::HttpServer()
  : server(80), commandCallback(nullptr), currentState("IDLE"), lastResponseTime(0),
    connectionCount(0), requestCount(0), lastErrorTime(0), consecutiveErrors(0) {
}

void HttpServer::begin() {
  server.on("/execute", HTTP_POST, [this]() {
    handleExecute();
  });
  server.on("/status", HTTP_GET, [this]() {
    handleStatus();
  });
  server.on("/ping", HTTP_GET, [this]() {
    handlePing();
  });
  server.on("/sync_status", HTTP_GET, [this]() {
    handleSyncStatus();
  });
  server.on("/reset_errors", HTTP_POST, [this]() {
    handleResetErrors();
  });
  server.onNotFound([this]() {
    handleNotFound();
  });

  server.begin();
  Serial.println("HTTP server started on port 80");
  Serial.println("Available endpoints: /execute, /status, /ping, /sync_status, /reset_errors");
}

void HttpServer::handleClient() {
  server.handleClient();
}

void HttpServer::setCommandCallback(CommandCallback callback) {
  commandCallback = callback;
}

void HttpServer::setLastSlaveResponse(const String& response) {
  lastSlaveResponse = response;
  lastResponseTime = millis();

  if (response.indexOf("SEQUENCE COMPLETED") != -1 || response.indexOf("ZERO DONE") != -1 || response.indexOf("POSITION REACHED") != -1 || response.indexOf("SET;") != -1 && response.indexOf("COMPLETE") != -1 || response.indexOf("DETECT;TRIGGERED") != -1 || response.indexOf("WAIT;STARTED") != -1) {
    currentState = "IDLE";
  } else if (response.indexOf("MOVING") != -1 || response.indexOf("EXECUTING") != -1) {
    currentState = "RUNNING";
  } else if (response.indexOf("TIMEOUT") != -1 || response.indexOf("ERROR") != -1) {
    currentState = "ERROR";
    lastErrorTime = millis();
    consecutiveErrors++;
  } else if (response.indexOf("PAUSED") != -1) {
    currentState = "PAUSED";
  }

  if (response.indexOf("ERROR") == -1 && response.indexOf("TIMEOUT") == -1) {
    consecutiveErrors = 0;
  }
}

void HttpServer::incrementConnectionCount() {
  connectionCount++;
}

void HttpServer::handleExecute() {
  sendCORSHeaders();
  requestCount++;

  if (server.method() == HTTP_OPTIONS) {
    server.send(200);
    return;
  }

  if (!server.hasArg("plain")) {
    server.send(400, "application/json", createErrorJSON("No command data"));
    return;
  }

  String body = server.arg("plain");

  int commandStart = body.indexOf("\"command\":");
  if (commandStart == -1) {
    server.send(400, "application/json", createErrorJSON("Invalid JSON format"));
    return;
  }

  int valueStart = body.indexOf("\"", commandStart + 10) + 1;
  int valueEnd = body.indexOf("\"", valueStart);

  if (valueStart == 0 || valueEnd == -1) {
    server.send(400, "application/json", createErrorJSON("Invalid command format"));
    return;
  }

  String command = body.substring(valueStart, valueEnd);
  command.trim();

  if (command.length() == 0) {
    server.send(400, "application/json", createErrorJSON("Empty command"));
    return;
  }

  if (consecutiveErrors >= 5) {
    server.send(503, "application/json", createErrorJSON("Too many consecutive errors. Use /reset_errors to clear."));
    return;
  }

  if (commandCallback) {
    commandCallback(command);
    updateStateFromCommand(command);

    String response = createSuccessJSON("Command executed: " + command);
    server.send(200, "application/json", response);
  } else {
    server.send(500, "application/json", createErrorJSON("Command handler not available"));
  }
}

void HttpServer::handleStatus() {
  sendCORSHeaders();
  server.send(200, "application/json", createStatusJSON());
}

void HttpServer::handlePing() {
  sendCORSHeaders();
  server.send(200, "application/json", createPingJSON());
}

void HttpServer::handleSyncStatus() {
  sendCORSHeaders();
  server.send(200, "application/json", createSyncStatusJSON());
}

void HttpServer::handleResetErrors() {
  sendCORSHeaders();
  consecutiveErrors = 0;
  lastErrorTime = 0;
  currentState = "IDLE";

  server.send(200, "application/json", createSuccessJSON("Error count reset"));
}

void HttpServer::handleNotFound() {
  sendCORSHeaders();
  server.send(404, "application/json", createErrorJSON("Endpoint not found"));
}

void HttpServer::sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void HttpServer::updateStateFromCommand(const String& command) {
  String upperCommand = command;
  upperCommand.toUpperCase();

  if (upperCommand == "PLAY" || upperCommand.startsWith("X(") || upperCommand.startsWith("Y(") || upperCommand.startsWith("Z(") || upperCommand.startsWith("T(") || upperCommand.startsWith("G(") || upperCommand.startsWith("GROUP(")) {
    currentState = "RUNNING";
  } else if (upperCommand == "PAUSE") {
    currentState = "PAUSED";
  } else if (upperCommand == "STOP" || upperCommand == "IDLE") {
    currentState = "IDLE";
  }
}

String HttpServer::createStatusJSON() {
  String json = "{";
  json += "\"state\":\"" + currentState + "\",";
  json += "\"connected\":true,";
  json += "\"slaves\":[\"x\",\"y\",\"z\",\"t\",\"g\"],";
  json += "\"lastUpdate\":" + String(millis()) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"uptime\":" + String(millis()) + ",";
  json += "\"connectionCount\":" + String(connectionCount) + ",";
  json += "\"requestCount\":" + String(requestCount) + ",";
  json += "\"consecutiveErrors\":" + String(consecutiveErrors);

  if (lastSlaveResponse.length() > 0) {
    json += ",\"lastResponse\":\"" + lastSlaveResponse + "\"";
    json += ",\"lastResponseTime\":" + String(lastResponseTime);
  }

  if (lastErrorTime > 0) {
    json += ",\"lastErrorTime\":" + String(lastErrorTime);
  }

  json += "}";
  return json;
}

String HttpServer::createSyncStatusJSON() {
  String json = "{";
  json += "\"syncSetPin\":" + String(SYNC_SET_PIN) + ",";
  json += "\"syncWaitPin\":" + String(SYNC_WAIT_PIN) + ",";
  json += "\"detectPin\":" + String(DETECT_PIN) + ",";
  json += "\"syncSetState\":" + String(digitalRead(SYNC_SET_PIN)) + ",";
  json += "\"syncWaitState\":" + String(digitalRead(SYNC_WAIT_PIN)) + ",";
  json += "\"detectState\":" + String(digitalRead(DETECT_PIN)) + ",";
  json += "\"time\":" + String(millis());
  json += "}";
  return json;
}

String HttpServer::createPingJSON() {
  String json = "{";
  json += "\"status\":\"ok\",";
  json += "\"state\":\"" + currentState + "\",";
  json += "\"time\":" + String(millis()) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"requestCount\":" + String(requestCount);
  json += "}";
  return json;
}

String HttpServer::createErrorJSON(const String& error) {
  String json = "{";
  json += "\"success\":false,";
  json += "\"message\":\"" + error + "\",";
  json += "\"time\":" + String(millis()) + ",";
  json += "\"consecutiveErrors\":" + String(consecutiveErrors);
  json += "}";
  return json;
}

String HttpServer::createSuccessJSON(const String& message) {
  String json = "{";
  json += "\"success\":true,";
  json += "\"message\":\"" + message + "\",";
  json += "\"time\":" + String(millis()) + ",";
  json += "\"state\":\"" + currentState + "\"";
  json += "}";
  return json;
}