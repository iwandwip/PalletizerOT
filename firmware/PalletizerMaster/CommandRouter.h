#ifndef COMMAND_ROUTER_H
#define COMMAND_ROUTER_H

#include "Arduino.h"
#include "PalletizerProtocol.h"

class CommandRouter {
public:
  CommandRouter(PalletizerProtocol* protocol);
  bool routeCommand(const String& command);
  void setCompletionCallback(void (*callback)());

private:
  PalletizerProtocol* protocol;
  void (*completionCallback)();

  bool isSystemCommand(const String& command);
  bool isBroadcastCommand(const String& command);
  bool isDetectCommand(const String& command);
  bool isSyncCommand(const String& command);
  bool isSpeedCommand(const String& command);
  bool isAxisCommand(const String& command);

  void processSystemCommand(const String& command);
  void processBroadcastCommand(const String& command);
  void processDetectCommand();
  void processSyncCommand(const String& command);
  void processSpeedCommand(const String& command);
  void processAxisCommand(const String& command);
};

#endif