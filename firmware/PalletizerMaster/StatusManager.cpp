#include "StatusManager.h"

StatusManager::StatusManager()
  : systemStatus(STATUS_INITIALIZING), systemHealthy(true), lastError(""),
    lastHealthCheck(0), responseTimeSum(0), responseTimeCount(0),
    statusChangeCallback(nullptr), positionChangeCallback(nullptr),
    healthChangeCallback(nullptr) {

  currentPosition.X = 0;
  currentPosition.Y = 0;
  currentPosition.Z = 0;
  currentPosition.T = 0;
  currentPosition.G = 0;
  currentPosition.timestamp = millis();

  metrics.uptime = 0;
  metrics.freeHeap = 0;
  metrics.commandsProcessed = 0;
  metrics.errorsCount = 0;
  metrics.averageResponseTime = 0.0;
  metrics.queueLength = 0;
}

StatusManager::~StatusManager() {
}

void StatusManager::setSystemStatus(SystemStatus status) {
  if (systemStatus != status) {
    systemStatus = status;
    notifyStatusChange(status);
  }
}

String StatusManager::getSystemStatusString() const {
  return statusToString(systemStatus);
}

void StatusManager::updatePosition(long X, long Y, long Z, long T, long G) {
  Position newPosition = { X, Y, Z, T, G, millis() };

  if (newPosition.X != currentPosition.X || newPosition.Y != currentPosition.Y || newPosition.Z != currentPosition.Z || newPosition.T != currentPosition.T || newPosition.G != currentPosition.G) {

    currentPosition = newPosition;
    notifyPositionChange(currentPosition);
  }
}

void StatusManager::updatePosition(const String& positionString) {
  parsePositionString(positionString);
}

void StatusManager::updateMetrics(int queueLength, int commandsProcessed, int errorsCount) {
  metrics.uptime = millis();
  metrics.freeHeap = getFreeHeap();
  metrics.queueLength = queueLength;
  metrics.commandsProcessed = commandsProcessed;
  metrics.errorsCount = errorsCount;

  updateSystemHealth();
}

void StatusManager::recordResponseTime(unsigned long responseTime) {
  responseTimeSum += responseTime;
  responseTimeCount++;

  if (responseTimeCount >= 10) {
    metrics.averageResponseTime = responseTimeSum / float(responseTimeCount);
    responseTimeSum = 0;
    responseTimeCount = 0;
  }
}

StatusManager::SystemMetrics StatusManager::getMetrics() const {
  return metrics;
}

String StatusManager::generateStatusReport() const {
  return "STATUS:" + getSystemStatusString() + " QUEUE:" + String(metrics.queueLength) + " CMD:" + String(metrics.commandsProcessed) + " ERR:" + String(metrics.errorsCount) + " HEAP:" + String(metrics.freeHeap);
}

String StatusManager::generatePositionReport() const {
  return "P X" + String(currentPosition.X) + " Y" + String(currentPosition.Y) + " Z" + String(currentPosition.Z) + " T" + String(currentPosition.T) + " G" + String(currentPosition.G);
}

String StatusManager::generateMetricsReport() const {
  return "METRICS UPTIME:" + String(metrics.uptime) + " HEAP:" + String(metrics.freeHeap) + " CMD:" + String(metrics.commandsProcessed) + " ERR:" + String(metrics.errorsCount) + " RESP:" + String(metrics.averageResponseTime, 2) + "ms";
}

JsonDocument StatusManager::generateStatusJSON() const {
  JsonDocument doc;

  doc["status"] = getSystemStatusString();
  doc["uptime"] = metrics.uptime;
  doc["queue"] = metrics.queueLength;
  doc["commands"] = metrics.commandsProcessed;
  doc["errors"] = metrics.errorsCount;
  doc["heap"] = metrics.freeHeap;
  doc["healthy"] = systemHealthy;
  doc["lastError"] = lastError;

  return doc;
}

JsonDocument StatusManager::generatePositionJSON() const {
  JsonDocument doc;

  JsonObject position = doc["position"].to<JsonObject>();
  position["X"] = currentPosition.X;
  position["Y"] = currentPosition.Y;
  position["Z"] = currentPosition.Z;
  position["T"] = currentPosition.T;
  position["G"] = currentPosition.G;
  position["timestamp"] = currentPosition.timestamp;

  return doc;
}

void StatusManager::performHealthCheck() {
  unsigned long currentTime = millis();

  if (currentTime - lastHealthCheck >= HEALTH_CHECK_INTERVAL) {
    updateSystemHealth();
    lastHealthCheck = currentTime;
  }
}

void StatusManager::recordError(const String& error) {
  lastError = error;
  metrics.errorsCount++;
  updateSystemHealth();
}

void StatusManager::clearErrors() {
  lastError = "";
  metrics.errorsCount = 0;
  updateSystemHealth();
}

void StatusManager::updateSystemHealth() {
  bool wasHealthy = systemHealthy;

  systemHealthy = true;

  if (metrics.errorsCount > MAX_ERROR_COUNT) {
    systemHealthy = false;
  }

  if (metrics.averageResponseTime > MAX_RESPONSE_TIME) {
    systemHealthy = false;
  }

  if (metrics.freeHeap < 10000) {
    systemHealthy = false;
  }

  if (systemStatus == STATUS_ERROR || systemStatus == STATUS_EMERGENCY_STOP) {
    systemHealthy = false;
  }

  if (wasHealthy != systemHealthy) {
    notifyHealthChange(systemHealthy);
  }
}

void StatusManager::setStatusChangeCallback(void (*callback)(SystemStatus status)) {
  statusChangeCallback = callback;
}

void StatusManager::setPositionChangeCallback(void (*callback)(const Position& position)) {
  positionChangeCallback = callback;
}

void StatusManager::setHealthChangeCallback(void (*callback)(bool healthy)) {
  healthChangeCallback = callback;
}

void StatusManager::notifyStatusChange(SystemStatus status) {
  if (statusChangeCallback) {
    statusChangeCallback(status);
  }
}

void StatusManager::notifyPositionChange(const Position& position) {
  if (positionChangeCallback) {
    positionChangeCallback(position);
  }
}

void StatusManager::notifyHealthChange(bool healthy) {
  if (healthChangeCallback) {
    healthChangeCallback(healthy);
  }
}

String StatusManager::statusToString(SystemStatus status) const {
  switch (status) {
    case STATUS_OFFLINE: return "OFFLINE";
    case STATUS_INITIALIZING: return "INITIALIZING";
    case STATUS_READY: return "READY";
    case STATUS_BUSY: return "BUSY";
    case STATUS_ERROR: return "ERROR";
    case STATUS_EMERGENCY_STOP: return "EMERGENCY_STOP";
    default: return "UNKNOWN";
  }
}

void StatusManager::parsePositionString(const String& positionString) {
  if (!positionString.startsWith("P ")) {
    return;
  }

  long X = 0, Y = 0, Z = 0, T = 0, G = 0;

  int xIndex = positionString.indexOf("X");
  if (xIndex != -1) {
    X = positionString.substring(xIndex + 1).toInt();
  }

  int yIndex = positionString.indexOf("Y");
  if (yIndex != -1) {
    Y = positionString.substring(yIndex + 1).toInt();
  }

  int zIndex = positionString.indexOf("Z");
  if (zIndex != -1) {
    Z = positionString.substring(zIndex + 1).toInt();
  }

  int tIndex = positionString.indexOf("T");
  if (tIndex != -1) {
    T = positionString.substring(tIndex + 1).toInt();
  }

  int gIndex = positionString.indexOf("G");
  if (gIndex != -1) {
    G = positionString.substring(gIndex + 1).toInt();
  }

  updatePosition(X, Y, Z, T, G);
}

unsigned long StatusManager::getFreeHeap() const {
  return ESP.getFreeHeap();
}