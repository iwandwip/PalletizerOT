#ifndef PALLETIZER_RUNTIME_H
#define PALLETIZER_RUNTIME_H

#include "Arduino.h"
#include "FS.h"
#include "LittleFS.h"
#include "DebugConfig.h"
#include "PalletizerProtocol.h"

const int DETECT_PINS[] = { 36 };
const int DETECT_PIN_COUNT = sizeof(DETECT_PINS) / sizeof(DETECT_PINS[0]);
#define DETECT_DEBOUNCE_MS 1000
#define DETECT_TIMEOUT_MS 10000

#define SYNC_SET_PIN 25
#define SYNC_WAIT_PIN 27

class PalletizerScriptParser;

class PalletizerRuntime {
public:
  enum WaitTimeoutStrategy {
    TIMEOUT_SKIP_CONTINUE = 0,
    TIMEOUT_PAUSE_SYSTEM = 1,
    TIMEOUT_ABORT_RESET = 2,
    TIMEOUT_RETRY_BACKOFF = 3
  };

  struct TimeoutConfig {
    unsigned long maxWaitTime = 30000;
    WaitTimeoutStrategy strategy = TIMEOUT_SKIP_CONTINUE;
    int maxTimeoutWarning = 5;
    int autoRetryCount = 0;
    bool saveToFile = true;
  };

  struct TimeoutStats {
    int totalTimeouts = 0;
    int successfulWaits = 0;
    unsigned long lastTimeoutTime = 0;
    unsigned long totalWaitTime = 0;
    int currentRetryCount = 0;
  };

  struct ExecutionInfo {
    int totalCommands = 0;
    int currentCommand = 0;
    String currentFunction = "";
    int functionDepth = 0;
    unsigned long executionStartTime = 0;
    bool isExecuting = false;
  };

  typedef void (*SystemStateCallback)(const String& newState);
  typedef void (*GroupCommandCallback)(const String& groupCommands);

  PalletizerRuntime(PalletizerProtocol* protocol);
  void begin();
  void update();
  void addCommandToQueue(const String& command);
  String getFromQueue();
  bool isQueueEmpty();
  bool isQueueFull();
  void clearQueue();
  void processNextCommand();
  void processScriptCommand(const String& script);
  void processInlineCommands(const String& commands);
  void loadCommandsFromFile();
  void processWaitCommand();
  void processDetectCommand();
  void processSetCommand(const String& data);
  bool canProcessNextCommand();
  void setSystemRunning(bool running);
  bool isSystemRunning();
  ExecutionInfo getExecutionInfo();
  void updateExecutionInfo(bool start = false);
  void setTimeoutConfig(const TimeoutConfig& config);
  TimeoutConfig getTimeoutConfig();
  TimeoutStats getTimeoutStats();
  void clearTimeoutStats();
  float getTimeoutSuccessRate();
  bool isWaitingForSync();
  bool isWaitingForDetect();
  void setScriptParser(PalletizerScriptParser* parser);
  void setSystemStateCallback(SystemStateCallback callback);
  void setGroupCommandCallback(GroupCommandCallback callback);
  void setSingleCommandFlags();
  void notifySingleCommandComplete();
  bool isSingleCommandExecuting();

private:
  PalletizerProtocol* protocol;
  PalletizerScriptParser* scriptParser;
  SystemStateCallback systemStateCallback;
  GroupCommandCallback groupCommandCallback;

  const String queueFilePath = "/queue.txt";
  const String queueIndexPath = "/queue_index.txt";
  const String timeoutConfigPath = "/timeout_config.json";
  int queueSize = 0;
  int queueHead = 0;

  int syncSetPin;
  int syncWaitPin;
  bool waitingForSync;
  unsigned long waitStartTime;
  unsigned long waitStartTimeForStats;

  bool waitingForDetect;
  unsigned long detectStartTime;
  unsigned long debounceStartTime;
  bool inDebouncePhase;
  bool currentPinStates[5];
  bool lastPinStates[5];

  ExecutionInfo executionInfo;
  bool executionInfoActive;
  bool progressLoggingActive;
  bool systemRunning;
  bool scriptProcessing;
  bool singleCommandExecuting;

  TimeoutConfig timeoutConfig;
  TimeoutStats timeoutStats;

  bool initFileSystem();
  bool writeQueueIndex();
  bool readQueueIndex();
  bool appendToQueueFile(const String& command);
  String readQueueCommandAt(int index);
  void ensureFileIsClosed(File& file);
  void initSyncPins();
  void initDetectPins();
  bool checkSyncTimeout();
  bool checkDetectTimeout();
  bool checkAllPinsLow();
  void resetDetectionState();
  void handleWaitTimeout();
  void updateTimeoutStats(bool success);
  void resetTimeoutCounter();
  void logExecutionProgress();
  void parseInlineCommands(const String& input, String* statements, int& count);
  bool saveTimeoutConfig();
  bool loadTimeoutConfig();
  bool isRealScriptCommand(const String& command);
  bool isCoordinateCommand(const String& command);
  bool isInvalidSpeedFragment(const String& command);
  bool isNumeric(const String& str);
  bool shouldClearQueue(const String& data);
};

#endif