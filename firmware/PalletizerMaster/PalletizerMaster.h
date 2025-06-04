#ifndef PALLETIZER_MASTER_H
#define PALLETIZER_MASTER_H

#define ENABLE_MODULE_NODEF_SERIAL_ENHANCED
#define ENABLE_MODULE_NODEF_DIGITAL_OUTPUT

#define DEBUG 1

#if DEBUG
#define DEBUG_PRINT(x) Serial.print(x)
#define DEBUG_PRINTLN(x) Serial.println(x)
#else
#define DEBUG_PRINT(x)
#define DEBUG_PRINTLN(x)
#endif

#define SYNC_SET_PIN 25
#define SYNC_WAIT_PIN 27

#include "Kinematrix.h"
#include "FS.h"
#include "LittleFS.h"
#include "QueueManager.h"
#include "CommandProcessor.h"
#include "PalletizerScriptParser.h"

class PalletizerMaster {
public:
  enum SystemState {
    STATE_IDLE = 0,
    STATE_RUNNING = 1,
    STATE_PAUSED = 2,
    STATE_STOPPING = 3
  };

  enum LedIndicator {
    LED_GREEN = 0,
    LED_YELLOW = 1,
    LED_RED = 2,
    LED_OFF = 3,
  };

  struct TimeoutStats {
    int totalTimeouts = 0;
    int successfulWaits = 0;
    unsigned long lastTimeoutTime = 0;
    unsigned long totalWaitTime = 0;
    int currentRetryCount = 0;
  };

  struct MessageTracker {
    String lastMessage;
    unsigned long lastTimestamp;
    int duplicateCount;
  };

  typedef void (*DataCallback)(const String& data);

  PalletizerMaster(int rxPin, int txPin, int indicatorPin = -1);
  void begin();
  void update();
  void sendToSlave(const String& data);
  void setSlaveDataCallback(DataCallback callback);
  static void processCommand(const String& data);
  SystemState getSystemState();
  void setSystemState(SystemState newState);
  void setSyncPin(bool high);
  void setWaitingForSync(bool waiting);
  bool isSequenceRunning();
  bool isWaitingForCompletion();
  void startSequence();
  void processNextCommand();
  void setGroupExecutionActive(bool active);
  void startGroupDelay();
  void setTimeoutConfig(const QueueManager::TimeoutConfig& config);
  QueueManager::TimeoutConfig getTimeoutConfig();
  void setWaitTimeout(unsigned long timeoutMs);
  void setTimeoutStrategy(QueueManager::WaitTimeoutStrategy strategy);
  void setMaxTimeoutWarning(int maxWarning);
  TimeoutStats getTimeoutStats();
  void clearTimeoutStats();
  float getTimeoutSuccessRate();
  QueueManager& getQueueManager();
  CommandProcessor& getCommandProcessor();
  PalletizerScriptParser* getScriptParser();

private:
  static PalletizerMaster* instance;
  static const int MAX_LED_INDICATOR_SIZE = 3;

  int rxPin, txPin;
  HardwareSerial& slaveCommSerial = Serial2;
  DigitalOut rxIndicatorLed;
  EnhancedSerial slaveSerial;
  String slavePartialBuffer = "";
  DataCallback slaveDataCallback = nullptr;

  DigitalOut ledIndicator[MAX_LED_INDICATOR_SIZE];

  SystemState systemState = STATE_IDLE;
  bool sequenceRunning = false;
  bool waitingForCompletion = false;
  bool groupExecutionActive = false;

  int indicatorPin;
  bool indicatorEnabled;
  unsigned long lastCheckTime = 0;

  int syncSetPin;
  int syncWaitPin;
  bool waitingForSync;
  unsigned long waitStartTime;

  TimeoutStats timeoutStats;
  unsigned long waitStartTimeForStats;

  QueueManager queueManager;
  CommandProcessor commandProcessor;
  PalletizerScriptParser scriptParser;

  MessageTracker debugTracker;
  bool executionInfoActive = false;
  bool progressLoggingActive = false;

  unsigned long groupCommandTimer = 0;
  bool waitingForGroupDelay = false;

  void checkSlaveData();
  void onSlaveData(const String& data);
  bool checkAllSlavesCompleted();
  bool checkSyncTimeout();
  void setOnLedIndicator(LedIndicator index);
  void sendStateUpdate();
  void handleWaitTimeout();
  void resetTimeoutCounter();
  void updateTimeoutStats(bool success);
  void updateExecutionInfo(bool start);
  void logExecutionProgress();
  bool isDuplicateMessage(const String& message);
};

#endif