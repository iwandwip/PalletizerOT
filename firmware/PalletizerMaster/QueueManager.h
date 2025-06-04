#ifndef QUEUE_MANAGER_H
#define QUEUE_MANAGER_H

#include "Arduino.h"
#include "FS.h"
#include "LittleFS.h"

#define QUEUE_MODE_APPEND 0
#define QUEUE_MODE_OVERWRITE 1
#define QUEUE_OPERATION_MODE QUEUE_MODE_APPEND

class QueueManager {
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

  struct ExecutionInfo {
    int totalCommands = 0;
    int currentCommand = 0;
    String currentFunction = "";
    int functionDepth = 0;
    unsigned long executionStartTime = 0;
    bool isExecuting = false;
  };

  QueueManager();
  bool begin();
  void addToQueue(const String& command);
  String getFromQueue();
  bool isQueueEmpty();
  bool isQueueFull();
  void clearQueue();
  int getQueueSize();
  int getQueueCount();
  void loadCommandsFromFile();
  void processCommandsBatch(const String& commands);
  bool shouldClearQueue(const String& data);
  void setTimeoutConfig(const TimeoutConfig& config);
  TimeoutConfig getTimeoutConfig();
  bool saveTimeoutConfig();
  bool loadTimeoutConfig();
  ExecutionInfo& getExecutionInfo();
  void updateExecutionInfo(bool start);
  void resetExecutionInfo();

private:
  static const int MAX_QUEUE_SIZE = 100;

  const String queueFilePath = "/queue.txt";
  const String queueIndexPath = "/queue_index.txt";
  const String timeoutConfigPath = "/timeout_config.json";

  int queueSize = 0;
  int queueHead = 0;
  TimeoutConfig timeoutConfig;
  ExecutionInfo executionInfo;

  bool initFileSystem();
  bool writeQueueIndex();
  bool readQueueIndex();
  bool appendToQueueFile(const String& command);
  String readQueueCommandAt(int index);
  void ensureFileIsClosed(File& file);
  bool ensureFileExists(const String& path);
  void safeFileWrite(const String& path, const String& content);
  bool isScriptCommand(const String& command);
};

#endif