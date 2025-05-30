#ifndef DEBUG_MANAGER_H
#define DEBUG_MANAGER_H

#include <Arduino.h>
#include <Print.h>

class PalletizerServer;

class DebugPrint : public Print {
public:
  DebugPrint();
  void begin(HardwareSerial* serial, PalletizerServer* server = nullptr);
  void setServer(PalletizerServer* server);
  void setEnabled(bool enabled);
  void setSource(const String& source);
  PalletizerServer* getServer() {
    return palletizerServer;
  }

  virtual size_t write(uint8_t c) override;
  virtual size_t write(const uint8_t* buffer, size_t size) override;

  using Print::write;

private:
  HardwareSerial* hwSerial;
  PalletizerServer* palletizerServer;
  String currentSource;
  String lineBuffer;
  bool enabled;

  void processLine();
  String detectLevel(const String& line);
};

class DebugManager {
public:
  static DebugManager& getInstance();

  void begin(HardwareSerial* serial, PalletizerServer* server = nullptr);
  void setServer(PalletizerServer* server);
  void setEnabled(bool enabled);
  void print(const String& message);
  void println(const String& message);
  void print(const String& source, const String& message);
  void println(const String& source, const String& message);
  void info(const String& source, const String& message);
  void warning(const String& source, const String& message);
  void error(const String& source, const String& message);

  DebugPrint& getDebugPrint();

private:
  DebugManager();
  DebugManager(const DebugManager&) = delete;
  DebugManager& operator=(const DebugManager&) = delete;

  DebugPrint debugPrint;
  bool initialized;
};

#define DEBUG_SERIAL DebugManager::getInstance().getDebugPrint()
#define DEBUG_MGR DebugManager::getInstance()

#endif