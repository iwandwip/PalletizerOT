#ifndef STATUS_MANAGER_H
#define STATUS_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>

/**
 * StatusManager - Manages system status and health monitoring
 * 
 * Responsibilities:
 * - System status aggregation
 * - Health monitoring and reporting
 * - Performance metrics collection
 * - Status broadcasting
 */
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

    // Constructor
    StatusManager();
    ~StatusManager();
    
    // Status management
    void setSystemStatus(SystemStatus status);
    SystemStatus getSystemStatus() const { return systemStatus; }
    String getSystemStatusString() const;
    
    // Position management
    void updatePosition(long X, long Y, long Z, long T, long G);
    void updatePosition(const String& positionString);
    Position getCurrentPosition() const { return currentPosition; }
    
    // Metrics management
    void updateMetrics(int queueLength, int commandsProcessed, int errorsCount);
    void recordResponseTime(unsigned long responseTime);
    SystemMetrics getMetrics() const;
    
    // Status reporting
    String generateStatusReport() const;
    String generatePositionReport() const;
    String generateMetricsReport() const;
    JsonDocument generateStatusJSON() const;
    JsonDocument generatePositionJSON() const;
    
    // Health monitoring
    void performHealthCheck();
    bool isSystemHealthy() const { return systemHealthy; }
    String getLastError() const { return lastError; }
    void recordError(const String& error);
    void clearErrors();
    
    // Callback registration (Observer Pattern)
    void setStatusChangeCallback(void (*callback)(SystemStatus status));
    void setPositionChangeCallback(void (*callback)(const Position& position));
    void setHealthChangeCallback(void (*callback)(bool healthy));

private:
    // Status tracking
    SystemStatus systemStatus;
    Position currentPosition;
    SystemMetrics metrics;
    
    // Health monitoring
    bool systemHealthy;
    String lastError;
    unsigned long lastHealthCheck;
    
    // Performance tracking
    unsigned long responseTimeSum;
    int responseTimeCount;
    
    // Callbacks (Observer Pattern)
    void (*statusChangeCallback)(SystemStatus status);
    void (*positionChangeCallback)(const Position& position);
    void (*healthChangeCallback)(bool healthy);
    
    // Internal methods
    void notifyStatusChange(SystemStatus status);
    void notifyPositionChange(const Position& position);
    void notifyHealthChange(bool healthy);
    void updateSystemHealth();
    
    // Utility methods
    String statusToString(SystemStatus status) const;
    void parsePositionString(const String& positionString);
    unsigned long getFreeHeap() const;
    
    // Constants
    static const unsigned long HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
    static const int MAX_ERROR_COUNT = 10;
    static const unsigned long MAX_RESPONSE_TIME = 5000; // 5 seconds
};

#endif // STATUS_MANAGER_H