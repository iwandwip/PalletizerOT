#ifndef PALLETIZER_MASTER_H
#define PALLETIZER_MASTER_H

#define ENABLE_MODULE_NODEF_DIGITAL_OUTPUT

#include "DebugConfig.h"
#include "Kinematrix.h"

class PalletizerProtocol;
class FlashManager;
class CommandRouter;
class SimpleExecutor;

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

  PalletizerMaster(int rxPin, int txPin);
  ~PalletizerMaster();

  void begin();
  void update();
  void setSlaveDataCallback(DataCallback callback);

  static void processCommand(const String& data);
  SystemState getSystemState();

  bool uploadCommands(const String& commands);
  bool startExecution();
  void pauseExecution();
  void stopExecution();

  String getExecutionStatus();
  FlashManager* getFlashManager();

private:
  static PalletizerMaster* instance;

  PalletizerProtocol* protocol;
  FlashManager* flashManager;
  CommandRouter* commandRouter;
  SimpleExecutor* executor;

  SystemState systemState;
  DataCallback slaveDataCallback;

  static const int MAX_LED_INDICATOR_SIZE = 3;
  DigitalOut ledIndicator[MAX_LED_INDICATOR_SIZE];

  void onCommandReceived(const String& data);
  void onSlaveData(const String& data);
  void onExecutionStateChange(SimpleExecutor::ExecutionState state);

  void setSystemState(SystemState newState);
  void sendStateUpdate();
  void setOnLedIndicator(LedIndicator index);

  static void onSlaveDataWrapper(const String& data);
  static void onExecutionStateWrapper(SimpleExecutor::ExecutionState state);
};

#endif