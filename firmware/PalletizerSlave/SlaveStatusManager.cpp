#include "SlaveStatusManager.h"

SlaveStatusManager::SlaveStatusManager(MotorController* motorController)
  : motorController(motorController), lastLoopTime(0), loopCount(0),
    loopTimeSum(0), lastHealthCheck(0), healthChangeCallback(nullptr),
    metricsUpdateCallback(nullptr) {

  metrics.uptime = 0;
  metrics.freeRAM = 0;
  metrics.commandsProcessed = 0;
  metrics.errorsCount = 0;
  metrics.loopFrequency = 0.0;
  metrics.lastCommandTime = 0;

  diagnosticInfo.healthStatus = HEALTH_GOOD;
  diagnosticInfo.lastError = "";
  diagnosticInfo.errorTimestamp = 0;
  diagnosticInfo.motorsInitialized = false;
  diagnosticInfo.communicationActive = false;
}

SlaveStatusManager::~SlaveStatusManager() {
}

void SlaveStatusManager::updateStatus() {
  updateMetrics();
  updateHealthStatus();

  HealthStatus newHealth = determineOverallHealth();
  if (newHealth != diagnosticInfo.healthStatus) {
    diagnosticInfo.healthStatus = newHealth;
    notifyHealthChange(newHealth);
  }

  notifyMetricsUpdate();
}

void SlaveStatusManager::updateMetrics() {
  metrics.uptime = millis();
  metrics.freeRAM = getFreeRAM();

  diagnosticInfo.communicationActive = (millis() - metrics.lastCommandTime) < COMMUNICATION_TIMEOUT;

  diagnosticInfo.motorsInitialized = (motorController != nullptr);
}

void SlaveStatusManager::updateHealthStatus() {
  checkCommunicationHealth();
  checkMotorHealth();
  checkMemoryHealth();
}

void SlaveStatusManager::checkCommunicationHealth() {
  unsigned long timeSinceLastCommand = millis() - metrics.lastCommandTime;

  if (timeSinceLastCommand > COMMUNICATION_TIMEOUT) {
    diagnosticInfo.communicationActive = false;
  } else {
    diagnosticInfo.communicationActive = true;
  }
}

void SlaveStatusManager::checkMotorHealth() {
  if (motorController) {
    diagnosticInfo.motorsInitialized = true;
  } else {
    diagnosticInfo.motorsInitialized = false;
  }
}

void SlaveStatusManager::checkMemoryHealth() {
  unsigned long freeRAM = getFreeRAM();
  metrics.freeRAM = freeRAM;
}

SlaveStatusManager::HealthStatus SlaveStatusManager::determineOverallHealth() const {
  if (!diagnosticInfo.motorsInitialized) {
    return HEALTH_CRITICAL;
  }

  if (metrics.freeRAM < MIN_FREE_RAM) {
    return HEALTH_CRITICAL;
  }

  if (metrics.errorsCount > MAX_ERROR_COUNT) {
    return HEALTH_ERROR;
  }

  if (!diagnosticInfo.communicationActive) {
    return HEALTH_WARNING;
  }

  if (metrics.loopFrequency < MIN_LOOP_FREQUENCY && metrics.loopFrequency > 0) {
    return HEALTH_WARNING;
  }

  return HEALTH_GOOD;
}

void SlaveStatusManager::recordCommandProcessed() {
  metrics.commandsProcessed++;
  metrics.lastCommandTime = millis();
}

void SlaveStatusManager::recordCommandError(const String& error) {
  metrics.errorsCount++;
  diagnosticInfo.lastError = error;
  diagnosticInfo.errorTimestamp = millis();
}

void SlaveStatusManager::recordResponseTime(unsigned long responseTime) {
}

String SlaveStatusManager::generateStatusMessage() const {
  return "STATUS " + healthStatusToString(diagnosticInfo.healthStatus) + " CMD:" + String(metrics.commandsProcessed) + " ERR:" + String(metrics.errorsCount) + " RAM:" + String(metrics.freeRAM) + " FREQ:" + String(metrics.loopFrequency, 1);
}

String SlaveStatusManager::generatePositionMessage() const {
  if (motorController) {
    MotorController::Position pos = motorController->getCurrentPosition();
    return "P X" + String(pos.X) + " Y" + String(pos.Y) + " Z" + String(pos.Z) + " T" + String(pos.T) + " G" + String(pos.G);
  }
  return "P X0 Y0 Z0 T0 G0";
}

String SlaveStatusManager::generateDiagnosticMessage() const {
  return "DIAG HEALTH:" + healthStatusToString(diagnosticInfo.healthStatus) + " MOTORS:" + (diagnosticInfo.motorsInitialized ? "OK" : "FAIL") + " COMM:" + (diagnosticInfo.communicationActive ? "OK" : "TIMEOUT") + " UPTIME:" + String(metrics.uptime);
}

String SlaveStatusManager::generateReadyMessage() const {
  return "READY";
}

String SlaveStatusManager::generateBusyMessage() const {
  return "B";
}

String SlaveStatusManager::generateDoneMessage() const {
  return "D";
}

String SlaveStatusManager::generateErrorMessage(const String& error) const {
  return "E " + error;
}

void SlaveStatusManager::performHealthCheck() {
  unsigned long currentTime = millis();

  if (currentTime - lastHealthCheck >= HEALTH_CHECK_INTERVAL) {
    updateStatus();
    lastHealthCheck = currentTime;
  }
}

bool SlaveStatusManager::isSystemHealthy() const {
  return diagnosticInfo.healthStatus == HEALTH_GOOD || diagnosticInfo.healthStatus == HEALTH_WARNING;
}

void SlaveStatusManager::clearErrors() {
  metrics.errorsCount = 0;
  diagnosticInfo.lastError = "";
  diagnosticInfo.errorTimestamp = 0;
}

void SlaveStatusManager::updateLoopTiming() {
  unsigned long currentTime = micros();

  if (lastLoopTime > 0) {
    unsigned long loopTime = currentTime - lastLoopTime;
    loopTimeSum += loopTime;
    loopCount++;

    if (loopCount >= 100) {
      float avgLoopTime = loopTimeSum / float(loopCount);
      metrics.loopFrequency = 1000000.0 / avgLoopTime;

      loopCount = 0;
      loopTimeSum = 0;
    }
  }

  lastLoopTime = currentTime;
}

unsigned long SlaveStatusManager::getFreeRAM() const {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
}

void SlaveStatusManager::setHealthChangeCallback(void (*callback)(HealthStatus status)) {
  healthChangeCallback = callback;
}

void SlaveStatusManager::setMetricsUpdateCallback(void (*callback)(const SystemMetrics& metrics)) {
  metricsUpdateCallback = callback;
}

void SlaveStatusManager::notifyHealthChange(HealthStatus status) {
  if (healthChangeCallback) {
    healthChangeCallback(status);
  }
}

void SlaveStatusManager::notifyMetricsUpdate() {
  if (metricsUpdateCallback) {
    metricsUpdateCallback(metrics);
  }
}

String SlaveStatusManager::healthStatusToString(HealthStatus status) const {
  switch (status) {
    case HEALTH_GOOD: return "GOOD";
    case HEALTH_WARNING: return "WARNING";
    case HEALTH_CRITICAL: return "CRITICAL";
    case HEALTH_ERROR: return "ERROR";
    default: return "UNKNOWN";
  }
}