#ifndef HYBRID_EXECUTOR_H
#define HYBRID_EXECUTOR_H

#include <ArduinoJson.h>
#include <String.h>

struct HybridStep {
  int id;
  String action;
  String axis;
  int position;
  int speed;
  String serial_cmd;
  String expect_response;
  int timeout;
  bool parallel;
  String command;
  int duration;
  // For group commands
  JsonArray commands;
  JsonArray expect_responses;
};

class HybridExecutor {
private:
  HybridStep* steps;
  int stepCount;
  int currentStepIndex;
  bool isExecuting;
  unsigned long stepStartTime;
  unsigned long lastSlaveResponse;
  
  bool parseStep(JsonObject stepObj, HybridStep& step);
  bool executeStep(const HybridStep& step);
  bool executeSingleCommand(const HybridStep& step);
  bool executeGroupCommand(const HybridStep& step);
  bool executeSystemCommand(const HybridStep& step);
  bool executeWaitCommand(const HybridStep& step);
  bool waitForSlaveResponse(const String& expectedResponse, unsigned long timeout);
  bool waitForMultipleResponses(JsonArray expectedResponses, unsigned long timeout);

public:
  HybridExecutor();
  ~HybridExecutor();
  
  bool loadScript(const String& hybridJson);
  bool startExecution();
  bool pauseExecution();
  bool stopExecution();
  bool processExecution();
  
  bool isRunning();
  int getCurrentStep();
  int getTotalSteps();
  float getProgress();
  
  void clearScript();
  void sendSlaveCommand(const String& command);
  String getLastError();
};

#endif