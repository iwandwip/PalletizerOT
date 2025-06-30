#ifndef COMMAND_FORWARDER_H
#define COMMAND_FORWARDER_H

#include "HttpClient.h"
#include "SerialBridge.h"
#include <WiFi.h>
#include <ArduinoJson.h>

class CommandForwarder {
private:
  HttpClient* httpClient;
  SerialBridge* serialBridge;
  
  bool isRunning;
  unsigned long lastPollTime;
  unsigned long lastCommandTime;
  
  String commands[100];
  int commandCount;
  int currentCommandIndex;
  
  void pollForCommands();
  void processNextCommand();
  void handleSerialResponse();
  String convertToSerial(String webCommand);

public:
  CommandForwarder();
  ~CommandForwarder();
  
  void initialize(const char* ssid, const char* password, const char* serverHost, int serverPort);
  void update();
  bool isWifiConnected();
  void printStatus();
};

#endif