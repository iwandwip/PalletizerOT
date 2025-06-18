#ifndef STATUS_MANAGER_H
#define STATUS_MANAGER_H

#include "Arduino.h"
#include "ArduinoJson.h"

class StatusManager {
public:
  enum SystemStatus {
    STATUS_OFFLINE,
    STATUS_INITIALIZING,
    STATUS_READY,
    STATUS_BUSY,
    STATUS_ERROR,
    STATUS_EMERGENCY_STOP
  };

  struct SystemMetrics {
    unsigned long uptime;
    unsigned long freeHeap;
    int commandsProcessed;
    int errorsCount;
    float averageResponseTime;
    int queueLength;
  };

  struct Position {
    long X, Y, Z, T, G;
    unsigned long timestamp;
  };

  StatusManager();
  ~StatusManager();

  void setSystemStatus(SystemStatus status);
  SystemStatus getSystemStatus() const {
    return systemStatus;
  }
  String getSystemStatusString() const;

  void updatePosition(long X, long Y, long Z, long T, long G);
  void updatePosition(const String& positionString);
  Position getCurrentPosition() const {
    return currentPosition;
  }

  void updateMetrics(int queueLength, int commandsProcessed, int errorsCount);
  void recordResponseTime(unsigned long responseTime);
  SystemMetrics getMetrics() const;

  String generateStatusReport() const;
  String generatePositionReport() const;
  String generateMetricsReport() const;
  JsonDocument generateStatusJSON() const;
  JsonDocument generatePositionJSON() const;

  void performHealthCheck();
  bool isSystemHealthy() const {
    return systemHealthy;
  }
  String getLastError() const {
    return lastError;
  }
  void recordError(const String& error);
  void clearErrors();

  void setStatusChangeCallback(void (*callback)(SystemStatus status));
  void setPositionChangeCallback(void (*callback)(const Position& position));
  void setHealthChangeCallback(void (*callback)(bool healthy));

private:
  SystemStatus systemStatus;
  Position currentPosition;
  SystemMetrics metrics;

  bool systemHealthy;
  String lastError;
  unsigned long lastHealthCheck;

  unsigned long responseTimeSum;
  int responseTimeCount;

  void (*statusChangeCallback)(SystemStatus status);
  void (*positionChangeCallback)(const Position& position);
  void (*healthChangeCallback)(bool healthy);

  void notifyStatusChange(SystemStatus status);
  void notifyPositionChange(const Position& position);
  void notifyHealthChange(bool healthy);
  void updateSystemHealth();

  String statusToString(SystemStatus status) const;
  void parsePositionString(const String& positionString);
  unsigned long getFreeHeap() const;

  static const unsigned long HEALTH_CHECK_INTERVAL = 10000;
  static const int MAX_ERROR_COUNT = 10;
  static const unsigned long MAX_RESPONSE_TIME = 5000;
};

#endif