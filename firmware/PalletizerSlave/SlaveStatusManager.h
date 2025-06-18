#ifndef SLAVE_STATUS_MANAGER_H
#define SLAVE_STATUS_MANAGER_H

#include <Arduino.h>
#include "MotorController.h"

/**
 * SlaveStatusManager - Manages Arduino Mega slave status and diagnostics
 * 
 * Responsibilities:
 * - System health monitoring
 * - Performance metrics collection
 * - Error tracking and reporting
 * - Status message generation
 */
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

    // Constructor
    SlaveStatusManager(MotorController* motorController);
    ~SlaveStatusManager();
    
    // Status management
    void updateStatus();
    HealthStatus getHealthStatus() const { return diagnosticInfo.healthStatus; }
    SystemMetrics getMetrics() const { return metrics; }
    DiagnosticInfo getDiagnosticInfo() const { return diagnosticInfo; }
    
    // Command tracking
    void recordCommandProcessed();
    void recordCommandError(const String& error);
    void recordResponseTime(unsigned long responseTime);
    
    // Status reporting
    String generateStatusMessage() const;
    String generatePositionMessage() const;
    String generateDiagnosticMessage() const;
    String generateReadyMessage() const;
    String generateBusyMessage() const;
    String generateDoneMessage() const;
    String generateErrorMessage(const String& error) const;
    
    // Health monitoring
    void performHealthCheck();
    bool isSystemHealthy() const;
    void clearErrors();
    
    // Performance monitoring
    void updateLoopTiming();
    float getLoopFrequency() const { return metrics.loopFrequency; }
    unsigned long getFreeRAM() const;
    
    // Callback registration (Observer Pattern)
    void setHealthChangeCallback(void (*callback)(HealthStatus status));
    void setMetricsUpdateCallback(void (*callback)(const SystemMetrics& metrics));

private:
    // Dependencies
    MotorController* motorController;
    
    // Status tracking
    SystemMetrics metrics;
    DiagnosticInfo diagnosticInfo;
    
    // Performance tracking
    unsigned long lastLoopTime;
    unsigned long loopCount;
    unsigned long loopTimeSum;
    unsigned long lastHealthCheck;
    
    // Callbacks (Observer Pattern)
    void (*healthChangeCallback)(HealthStatus status);
    void (*metricsUpdateCallback)(const SystemMetrics& metrics);
    
    // Internal methods
    void updateHealthStatus();
    void updateMetrics();
    void checkCommunicationHealth();
    void checkMotorHealth();
    void checkMemoryHealth();
    
    // Utility methods
    void notifyHealthChange(HealthStatus status);
    void notifyMetricsUpdate();
    HealthStatus determineOverallHealth() const;
    String healthStatusToString(HealthStatus status) const;
    
    // Constants
    static const unsigned long HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
    static const unsigned long COMMUNICATION_TIMEOUT = 10000; // 10 seconds
    static const unsigned long MIN_FREE_RAM = 1024; // 1KB minimum
    static const float MIN_LOOP_FREQUENCY = 100.0; // 100 Hz minimum
    static const int MAX_ERROR_COUNT = 10;
};

#endif // SLAVE_STATUS_MANAGER_H