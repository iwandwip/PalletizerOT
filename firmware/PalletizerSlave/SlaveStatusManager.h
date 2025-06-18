#ifndef SLAVE_STATUS_MANAGER_H
#define SLAVE_STATUS_MANAGER_H

#include "Arduino.h"
#include "MotorController.h"

class SlaveStatusManager {
public:
  enum HealthStatus {
    HEALTH_GOOD,
    HEALTH_WARNING,
    HEALTH_CRITICAL,
    HEALTH_ERROR
  };

  struct SystemMetrics {
    unsigned long uptime;
    unsigned long freeRAM;
    int commandsProcessed;
    int errorsCount;
    float loopFrequency;
    unsigned long lastCommandTime;
  };

  struct DiagnosticInfo {
    HealthStatus healthStatus;
    String lastError;
    unsigned long errorTimestamp;
    bool motorsInitialized;
    bool communicationActive;
  };

  SlaveStatusManager(MotorController* motorController);
  ~SlaveStatusManager();

  void updateStatus();
  HealthStatus getHealthStatus() const {
    return diagnosticInfo.healthStatus;
  }
  SystemMetrics getMetrics() const {
    return metrics;
  }
  DiagnosticInfo getDiagnosticInfo() const {
    return diagnosticInfo;
  }

  void recordCommandProcessed();
  void recordCommandError(const String& error);
  void recordResponseTime(unsigned long responseTime);

  String generateStatusMessage() const;
  String generatePositionMessage() const;
  String generateDiagnosticMessage() const;
  String generateReadyMessage() const;
  String generateBusyMessage() const;
  String generateDoneMessage() const;
  String generateErrorMessage(const String& error) const;

  void performHealthCheck();
  bool isSystemHealthy() const;
  void clearErrors();

  void updateLoopTiming();
  float getLoopFrequency() const {
    return metrics.loopFrequency;
  }
  unsigned long getFreeRAM() const;

  void setHealthChangeCallback(void (*callback)(HealthStatus status));
  void setMetricsUpdateCallback(void (*callback)(const SystemMetrics& metrics));

private:
  MotorController* motorController;

  SystemMetrics metrics;
  DiagnosticInfo diagnosticInfo;

  unsigned long lastLoopTime;
  unsigned long loopCount;
  unsigned long loopTimeSum;
  unsigned long lastHealthCheck;

  void (*healthChangeCallback)(HealthStatus status);
  void (*metricsUpdateCallback)(const SystemMetrics& metrics);

  void updateHealthStatus();
  void updateMetrics();
  void checkCommunicationHealth();
  void checkMotorHealth();
  void checkMemoryHealth();

  void notifyHealthChange(HealthStatus status);
  void notifyMetricsUpdate();
  HealthStatus determineOverallHealth() const;
  String healthStatusToString(HealthStatus status) const;

  static const unsigned long HEALTH_CHECK_INTERVAL = 5000;
  static const unsigned long COMMUNICATION_TIMEOUT = 10000;
  static const unsigned long MIN_FREE_RAM = 1024;
  static const float MIN_LOOP_FREQUENCY = 100.0;
  static const int MAX_ERROR_COUNT = 10;
};

#endif