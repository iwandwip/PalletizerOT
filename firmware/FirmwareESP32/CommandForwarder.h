#ifndef COMMAND_FORWARDER_H
#define COMMAND_FORWARDER_H

#include "HttpClient.h"
#include "SerialBridge.h"
#include <WiFi.h>
#include <ArduinoJson.h>

struct CommandStatus {
  bool isExecuting;
  bool isComplete;
  bool hasError;
  String errorMessage;
  unsigned long startTime;
  unsigned long timeout;
};

struct ArmScript {
  String commands[50];
  int commandCount;
  int currentIndex;
  String armId;
  String format;
  bool isActive;
  CommandStatus status;
};

class CommandForwarder {
private:
  HttpClient* httpClient;
  SerialBridge* arm1Master;
  SerialBridge* arm2Master;
  
  bool isRunning;
  unsigned long lastPollTime;
  unsigned long lastCommandTime;
  
  ArmScript arm1Script;
  ArmScript arm2Script;
  
  void pollForCommands();
  void processNextCommand();
  void processArmCommands(ArmScript& arm, SerialBridge* serialBridge);
  void handleSerialResponse();
  
  String convertToUARTProtocol(String webCommand, String armId);
  void resetArmScript(ArmScript& arm);
  void logArmActivity(const String& armId, const String& message);

public:
  CommandForwarder();
  ~CommandForwarder();
  
  void initialize(const char* ssid, const char* password, const char* serverHost, int serverPort);
  void update();
  bool isWifiConnected();
  void printStatus();
  void printDetailedStatus();
  bool isArmActive(const String& armId);
  int getArmProgress(const String& armId);
  String getArmStatus(const String& armId);
};

#endif