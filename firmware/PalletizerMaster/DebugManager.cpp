#include "DebugManager.h"
#include "PalletizerServer.h"

DebugPrint::DebugPrint()
  : hwSerial(nullptr), palletizerServer(nullptr), currentSource("SYSTEM"), enabled(true), lastMessageTime(0), duplicateCount(0) {
}

void DebugPrint::begin(HardwareSerial* serial, PalletizerServer* server) {
  hwSerial = serial;
  palletizerServer = server;
}

void DebugPrint::setServer(PalletizerServer* server) {
  palletizerServer = server;
}

void DebugPrint::setEnabled(bool enabled) {
  this->enabled = enabled;
}

void DebugPrint::setSource(const String& source) {
  currentSource = source;
}

PalletizerServer* DebugPrint::getServer() {
  return palletizerServer;
}

size_t DebugPrint::write(uint8_t c) {
  if (!enabled || !hwSerial) return 0;

#if SERIAL_DEBUG == 1
  size_t result = hwSerial->write(c);
#else
  size_t result = 1;
#endif

#if WEB_DEBUG == 1
  if (c == '\n') {
    processLine();
  } else if (c != '\r') {
    lineBuffer += (char)c;
  }
#endif

  return result;
}

size_t DebugPrint::write(const uint8_t* buffer, size_t size) {
  if (!enabled || !hwSerial) return 0;

#if SERIAL_DEBUG == 1
  size_t result = hwSerial->write(buffer, size);
#else
  size_t result = size;
#endif

#if WEB_DEBUG == 1
  for (size_t i = 0; i < size; i++) {
    if (buffer[i] == '\n') {
      processLine();
    } else if (buffer[i] != '\r') {
      lineBuffer += (char)buffer[i];
    }
  }
#endif

  return result;
}

void DebugPrint::processLine() {
#if WEB_DEBUG == 1
  if (lineBuffer.length() > 0 && palletizerServer) {
    String level = detectLevel(lineBuffer);

    if (!isDuplicateMessage(level, currentSource, lineBuffer)) {
      palletizerServer->sendDebugMessage(level, currentSource, lineBuffer);
    }

    lineBuffer = "";
  }
#endif
}

String DebugPrint::detectLevel(const String& line) {
  String upperLine = line;
  upperLine.toUpperCase();

  if (upperLine.indexOf("ERROR") != -1 || upperLine.indexOf("FAIL") != -1 || upperLine.indexOf("❌") != -1) {
    return "ERROR";
  } else if (upperLine.indexOf("WARN") != -1 || upperLine.indexOf("WARNING") != -1 || upperLine.indexOf("⚠️") != -1) {
    return "WARNING";
  } else if (upperLine.indexOf("DEBUG") != -1) {
    return "DEBUG";
  } else {
    return "INFO";
  }
}

bool DebugPrint::isDuplicateMessage(const String& level, const String& source, const String& message) {
#if WEB_DEBUG == 1
  unsigned long currentTime = millis();
  String messageKey = level + ":" + source + ":" + message;

  if (lastMessageKey == messageKey && (currentTime - lastMessageTime) < 100) {
    duplicateCount++;
    if (duplicateCount == 3 && palletizerServer) {
      String warningMsg = "Duplicate message suppressed (" + String(duplicateCount) + "x): " + message;
      palletizerServer->sendDebugMessage("WARNING", "DEBUG_MGR", warningMsg);
    }
    return true;
  }

  lastMessageKey = messageKey;
  lastMessageTime = currentTime;
  duplicateCount = 0;
#endif
  return false;
}

DebugManager& DebugManager::getInstance() {
  static DebugManager instance;
  return instance;
}

void DebugManager::begin(HardwareSerial* serial, PalletizerServer* server) {
  debugPrint.begin(serial, server);
  initialized = true;
}

void DebugManager::setServer(PalletizerServer* server) {
  debugPrint.setServer(server);
}

void DebugManager::setEnabled(bool enabled) {
  debugPrint.setEnabled(enabled);
}

void DebugManager::print(const String& message) {
#if SERIAL_DEBUG == 1 || WEB_DEBUG == 1
  debugPrint.print(message);
#endif
}

void DebugManager::println(const String& message) {
#if SERIAL_DEBUG == 1 || WEB_DEBUG == 1
  debugPrint.println(message);
#endif
}

void DebugManager::print(const String& source, const String& message) {
#if SERIAL_DEBUG == 1 || WEB_DEBUG == 1
  debugPrint.setSource(source);
  debugPrint.print(message);
#endif
}

void DebugManager::println(const String& source, const String& message) {
#if SERIAL_DEBUG == 1 || WEB_DEBUG == 1
  debugPrint.setSource(source);
  debugPrint.println(message);
#endif
}

void DebugManager::info(const String& source, const String& message) {
#if DEBUG_LEVEL_INFO == 1
  if (shouldProcessMessage("INFO")) {
    sendFormattedMessage("INFO", source, message);
  }
#endif
}

void DebugManager::warning(const String& source, const String& message) {
#if DEBUG_LEVEL_WARNING == 1
  if (shouldProcessMessage("WARNING")) {
    sendFormattedMessage("WARNING", source, message);
  }
#endif
}

void DebugManager::error(const String& source, const String& message) {
#if DEBUG_LEVEL_ERROR == 1
  if (shouldProcessMessage("ERROR")) {
    sendFormattedMessage("ERROR", source, message);
  }
#endif
}

void DebugManager::debug(const String& source, const String& message) {
#if DEBUG_LEVEL_DEBUG == 1
  if (shouldProcessMessage("DEBUG")) {
    sendFormattedMessage("DEBUG", source, message);
  }
#endif
}

void DebugManager::sequence(const String& source, int current, int total, const String& message) {
#if DEBUG_LEVEL_INFO == 1
  static String lastSequenceMsg = "";
  static unsigned long lastSequenceTime = 0;

  String currentMsg = "🔄 [" + String(current) + "/" + String(total) + "] " + message;
  unsigned long currentTime = millis();

  if (lastSequenceMsg == currentMsg && (currentTime - lastSequenceTime) < 200) {
    return;
  }

  lastSequenceMsg = currentMsg;
  lastSequenceTime = currentTime;

  if (shouldProcessMessage("INFO")) {
    sendFormattedMessage("INFO", source, currentMsg);
  }
#endif
}

void DebugManager::motion(const String& axis, long position, float speed, unsigned long delay) {
#if DEBUG_LEVEL_INFO == 1
  String msg = "🎯 " + axis + "(" + String(position);
  if (delay > 0) {
    msg += ",d" + String(delay);
  }
  if (speed > 0) {
    msg += "," + String(speed, 0);
  }
  msg += ")";

  if (shouldProcessMessage("INFO")) {
    sendFormattedMessage("INFO", "MOTION", msg);
  }
#endif
}

void DebugManager::sync(const String& type, const String& message) {
#if DEBUG_LEVEL_INFO == 1
  String msg = "🔄 " + type + " - " + message;
  if (shouldProcessMessage("INFO")) {
    sendFormattedMessage("INFO", "SYNC", msg);
  }
#endif
}

void DebugManager::function(const String& funcName, bool entering, int commandCount) {
#if DEBUG_LEVEL_INFO == 1
  if (entering) {
    String msg = "└─ Entering function " + funcName;
    if (commandCount > 0) {
      msg += " (" + String(commandCount) + " commands)";
    }
    if (shouldProcessMessage("INFO")) {
      sendFormattedMessage("INFO", "FUNCTION", msg);
    }
  } else {
    String msg = "✅ Function " + funcName + " completed";
    if (shouldProcessMessage("INFO")) {
      sendFormattedMessage("INFO", "FUNCTION", msg);
    }
  }
#endif
}

void DebugManager::progress(int current, int total, const String& task) {
#if DEBUG_LEVEL_INFO == 1
  static String lastProgressMsg = "";
  static unsigned long lastProgressTime = 0;

  int percentage = (total > 0) ? (current * 100 / total) : 0;
  String progressBar = "[";

  for (int i = 0; i < 20; i++) {
    if (i < (percentage / 5)) {
      progressBar += "█";
    } else {
      progressBar += "░";
    }
  }

  progressBar += "] " + String(current) + "/" + String(total) + " (" + String(percentage) + "%) - " + task;

  unsigned long currentTime = millis();
  if (lastProgressMsg == progressBar && (currentTime - lastProgressTime) < 500) {
    return;
  }

  lastProgressMsg = progressBar;
  lastProgressTime = currentTime;

  if (shouldProcessMessage("INFO")) {
    sendFormattedMessage("INFO", "PROGRESS", progressBar);
  }
#endif
}

void DebugManager::separator() {
#if DEBUG_LEVEL_INFO == 1
  static unsigned long lastSeparatorTime = 0;
  unsigned long currentTime = millis();

  if ((currentTime - lastSeparatorTime) < 200) {
    return;
  }

  lastSeparatorTime = currentTime;
  if (shouldProcessMessage("INFO")) {
    sendFormattedMessage("INFO", "SYSTEM", "════════════════════════════════════════");
  }
#endif
}

DebugPrint& DebugManager::getDebugPrint() {
  return debugPrint;
}

DebugManager::DebugManager()
  : initialized(false) {
}

void DebugManager::sendFormattedMessage(const String& level, const String& source, const String& message) {
  static String lastManagerMsg = "";
  static unsigned long lastManagerTime = 0;

  String messageKey = level + ":" + source + ":" + message;
  unsigned long currentTime = millis();

  if (lastManagerMsg == messageKey && (currentTime - lastManagerTime) < 50) {
    return;
  }

  lastManagerMsg = messageKey;
  lastManagerTime = currentTime;

#if WEB_DEBUG == 1
  if (debugPrint.getServer()) {
    debugPrint.getServer()->sendDebugMessage(level, source, message);
  }
#endif

  debugPrint.setSource(source);

#if SERIAL_DEBUG == 1
  if (level == "ERROR") {
    debugPrint.println("[ERROR] " + message);
  } else if (level == "WARNING") {
    debugPrint.println("[WARNING] " + message);
  } else if (level == "DEBUG") {
    debugPrint.println("[DEBUG] " + message);
  } else {
    debugPrint.println(message);
  }
#endif
}

bool DebugManager::shouldProcessMessage(const String& level) {
#if WEB_DEBUG == 0 && SERIAL_DEBUG == 0
  if (level == "ERROR") return true;
  return false;
#else
  return true;
#endif
}