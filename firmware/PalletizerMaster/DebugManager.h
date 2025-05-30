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
  void debug(const String& source, const String& message);

  void sequence(const String& source, int current, int total, const String& message);
  void motion(const String& axis, long position, float speed = 0, unsigned long delay = 0);
  void sync(const String& type, const String& message);
  void function(const String& funcName, bool entering, int commandCount = 0);
  void progress(int current, int total, const String& task);
  void separator();

  DebugPrint& getDebugPrint();

private:
  DebugManager();
  DebugManager(const DebugManager&) = delete;
  DebugManager& operator=(const DebugManager&) = delete;

  DebugPrint debugPrint;
  bool initialized;

  void sendFormattedMessage(const String& level, const String& source, const String& message);
};

#define DEBUG_SERIAL DebugManager::getInstance().getDebugPrint()
#define DEBUG_MGR DebugManager::getInstance()

#endif