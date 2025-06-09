#ifndef PALLETIZER_MASTER_H
#define PALLETIZER_MASTER_H

#define ENABLE_MODULE_NODEF_DIGITAL_OUTPUT

#include "DebugConfig.h"
#include "PalletizerProtocol.h"
#include "PalletizerRuntime.h"
#include "PalletizerScriptParser.h"
#include "Kinematrix.h"

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

  typedef void (*DataCallback)(const String& data);

  PalletizerMaster(int rxPin, int txPin, int indicatorPin = -1);
  ~PalletizerMaster();
  void begin();
  void update();
  void setSlaveDataCallback(DataCallback callback);
  static void processCommand(const String& data);
  SystemState getSystemState();
  void setTimeoutConfig(const PalletizerRuntime::TimeoutConfig& config);
  PalletizerRuntime::TimeoutConfig getTimeoutConfig();
  void setWaitTimeout(unsigned long timeoutMs);
  void setTimeoutStrategy(PalletizerRuntime::WaitTimeoutStrategy strategy);
  void setMaxTimeoutWarning(int maxWarning);
  PalletizerRuntime::TimeoutStats getTimeoutStats();
  void clearTimeoutStats();
  float getTimeoutSuccessRate();
  bool saveTimeoutConfig();
  bool loadTimeoutConfig();
  PalletizerRuntime::ExecutionInfo getExecutionInfo();
  PalletizerScriptParser* getScriptParser();
  PalletizerRuntime* getRuntime();
  void processGroupCommand(const String& groupCommands);
  void addCommandToQueue(const String& command);
  bool canProcessNextCommand();

private:
  static PalletizerMaster* instance;

  PalletizerProtocol* protocol;
  PalletizerRuntime* runtime;
  PalletizerScriptParser scriptParser;

  SystemState systemState;
  DataCallback slaveDataCallback;

  int indicatorPin;
  bool indicatorEnabled;
  bool sequenceRunning;
  bool waitingForCompletion;
  bool groupExecutionActive;
  unsigned long lastCheckTime;
  unsigned long groupCommandTimer;
  bool waitingForGroupDelay;

  static const int MAX_LED_INDICATOR_SIZE = 3;
  DigitalOut ledIndicator[MAX_LED_INDICATOR_SIZE];

  void onCommandReceived(const String& data);
  void onSlaveData(const String& data);
  void onSystemStateChange(const String& newState);
  void onGroupCommand(const String& groupCommands);
  void processSystemStateCommand(const String& command);
  void setSystemState(SystemState newState);
  void sendStateUpdate();
  void setOnLedIndicator(LedIndicator index);
  bool checkAllSlavesCompleted();
  void handleIndicatorBasedCompletion();
  void handleSequenceCompletion();
  void resetExecutionFlags();
  void handleGroupExecution(const String& groupCommands);
  bool shouldClearQueue(const String& data);
  bool isRealScriptCommand(const String& command);
  void parseInlineCommands(const String& commands);
  static void onSlaveDataWrapper(const String& data);
  static void onSystemStateChangeWrapper(const String& newState);
  static void onGroupCommandWrapper(const String& groupCommands);
};

#endif