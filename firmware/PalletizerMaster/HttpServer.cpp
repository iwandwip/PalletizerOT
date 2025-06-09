#include "HttpServer.h"

HttpServer::HttpServer()
  : server(80), commandCallback(nullptr), currentState("IDLE"), lastResponseTime(0) {
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
  server.onNotFound([this]() {
    handleNotFound();
  });

  server.begin();
  Serial.println("HTTP server started on port 80");
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

  if (response.indexOf("SEQUENCE COMPLETED") != -1 || response.indexOf("ZERO DONE") != -1 || response.indexOf("POSITION REACHED") != -1) {
    currentState = "IDLE";
  } else if (response.indexOf("MOVING") != -1) {
    currentState = "RUNNING";
  }
}

void HttpServer::handleExecute() {
  sendCORSHeaders();

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

  if (commandCallback) {
    commandCallback(command);
    currentState = "RUNNING";
    server.send(200, "application/json", createSuccessJSON("Command executed"));
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
  server.send(200, "application/json", "{\"status\":\"ok\",\"time\":" + String(millis()) + "}");
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

String HttpServer::createStatusJSON() {
  String json = "{";
  json += "\"state\":\"" + currentState + "\",";
  json += "\"connected\":true,";
  json += "\"slaves\":[\"x\",\"y\",\"z\",\"t\",\"g\"],";
  json += "\"lastUpdate\":" + String(millis()) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"uptime\":" + String(millis());

  if (lastSlaveResponse.length() > 0) {
    json += ",\"lastResponse\":\"" + lastSlaveResponse + "\"";
    json += ",\"lastResponseTime\":" + String(lastResponseTime);
  }

  json += "}";
  return json;
}

String HttpServer::createErrorJSON(const String& error) {
  return "{\"success\":false,\"message\":\"" + error + "\",\"time\":" + String(millis()) + "}";
}

String HttpServer::createSuccessJSON(const String& message) {
  return "{\"success\":true,\"message\":\"" + message + "\",\"time\":" + String(millis()) + "}";
}