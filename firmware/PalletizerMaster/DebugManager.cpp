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

  size_t result = hwSerial->write(c);

  if (c == '\n') {
    processLine();
  } else if (c != '\r') {
    lineBuffer += (char)c;
  }

  return result;
}

size_t DebugPrint::write(const uint8_t* buffer, size_t size) {
  if (!enabled || !hwSerial) return 0;

  size_t result = hwSerial->write(buffer, size);

  for (size_t i = 0; i < size; i++) {
    if (buffer[i] == '\n') {
      processLine();
    } else if (buffer[i] != '\r') {
      lineBuffer += (char)buffer[i];
    }
  }

  return result;
}

void DebugPrint::processLine() {
  if (lineBuffer.length() > 0 && palletizerServer) {
    String level = detectLevel(lineBuffer);

    if (!isDuplicateMessage(level, currentSource, lineBuffer)) {
      palletizerServer->sendDebugMessage(level, currentSource, lineBuffer);
    }

    lineBuffer = "";
  }
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
  debugPrint.print(message);
}

void DebugManager::println(const String& message) {
  debugPrint.println(message);
}

void DebugManager::print(const String& source, const String& message) {
  debugPrint.setSource(source);
  debugPrint.print(message);
}

void DebugManager::println(const String& source, const String& message) {
  debugPrint.setSource(source);
  debugPrint.println(message);
}

void DebugManager::info(const String& source, const String& message) {
  sendFormattedMessage("INFO", source, message);
}

void DebugManager::warning(const String& source, const String& message) {
  sendFormattedMessage("WARNING", source, message);
}

void DebugManager::error(const String& source, const String& message) {
  sendFormattedMessage("ERROR", source, message);
}

void DebugManager::debug(const String& source, const String& message) {
  sendFormattedMessage("DEBUG", source, message);
}

void DebugManager::sequence(const String& source, int current, int total, const String& message) {
  static String lastSequenceMsg = "";
  static unsigned long lastSequenceTime = 0;

  String currentMsg = "🔄 [" + String(current) + "/" + String(total) + "] " + message;
  unsigned long currentTime = millis();

  if (lastSequenceMsg == currentMsg && (currentTime - lastSequenceTime) < 200) {
    return;
  }

  lastSequenceMsg = currentMsg;
  lastSequenceTime = currentTime;

  sendFormattedMessage("INFO", source, currentMsg);
}

void DebugManager::motion(const String& axis, long position, float speed, unsigned long delay) {
  String msg = "🎯 " + axis + "(" + String(position);
  if (delay > 0) {
    msg += ",d" + String(delay);
  }
  if (speed > 0) {
    msg += "," + String(speed, 0);
  }
  msg += ")";
  sendFormattedMessage("INFO", "MOTION", msg);
}

void DebugManager::sync(const String& type, const String& message) {
  String msg = "🔄 " + type + " - " + message;
  sendFormattedMessage("INFO", "SYNC", msg);
}

void DebugManager::function(const String& funcName, bool entering, int commandCount) {
  if (entering) {
    String msg = "└─ Entering function " + funcName;
    if (commandCount > 0) {
      msg += " (" + String(commandCount) + " commands)";
    }
    sendFormattedMessage("INFO", "FUNCTION", msg);
  } else {
    String msg = "✅ Function " + funcName + " completed";
    sendFormattedMessage("INFO", "FUNCTION", msg);
  }
}

void DebugManager::progress(int current, int total, const String& task) {
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

  sendFormattedMessage("INFO", "PROGRESS", progressBar);
}

void DebugManager::separator() {
  static unsigned long lastSeparatorTime = 0;
  unsigned long currentTime = millis();

  if ((currentTime - lastSeparatorTime) < 200) {
    return;
  }

  lastSeparatorTime = currentTime;
  sendFormattedMessage("INFO", "SYSTEM", "════════════════════════════════════════");
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

  if (debugPrint.getServer()) {
    debugPrint.getServer()->sendDebugMessage(level, source, message);
  }
  debugPrint.setSource(source);

  if (level == "ERROR") {
    debugPrint.println("[ERROR] " + message);
  } else if (level == "WARNING") {
    debugPrint.println("[WARNING] " + message);
  } else if (level == "DEBUG") {
    debugPrint.println("[DEBUG] " + message);
  } else {
    debugPrint.println(message);
  }
}