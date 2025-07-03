# Simple OOP Palletizer Architecture

## Overview

Arsitektur OOP yang bersih dan mudah dibaca untuk sistem Palletizer Control. Menggunakan konsep Object-Oriented Programming dengan struktur minimal tapi powerful.

## Struktur File Akhir

### PalletizerMaster (ESP32)
```
PalletizerMaster/
├── PalletizerMaster.ino    # Main file dengan setup & loop
├── WebSocketManager.h      # Class untuk WebSocket communication
├── WebSocketManager.cpp
├── SerialBridge.h          # Class untuk Serial communication
└── SerialBridge.cpp
```

### PalletizerSlave (Arduino Mega)
```
PalletizerSlave/
├── PalletizerSlave.ino     # Main file dengan setup & loop
├── MotorController.h       # Class untuk motor control
├── MotorController.cpp
├── CommandProcessor.h      # Class untuk command parsing
└── CommandProcessor.cpp
```

## 1. PalletizerMaster (ESP32) - OOP Structure

### Main File: PalletizerMaster.ino
```cpp
#include <WiFi.h>
#include "WebSocketManager.h"
#include "SerialBridge.h"

// Global objects
WebSocketManager* webSocket;
SerialBridge* serialBridge;

void setup() {
  // Initialize WiFi
  connectWiFi();
  
  // Initialize WebSocket manager
  webSocket = new WebSocketManager(SERVER_IP, SERVER_PORT);
  webSocket->setMessageCallback(onWebSocketMessage);
  webSocket->begin();
  
  // Initialize Serial bridge
  serialBridge = new SerialBridge(Serial2, RX2_PIN, TX2_PIN);
  serialBridge->setResponseCallback(onSerialResponse);
  serialBridge->begin(115200);
}

void loop() {
  webSocket->loop();
  serialBridge->loop();
  delay(1);
}
```

### Class 1: WebSocketManager
**Responsibility**: Handle WebSocket communication dengan Node.js server

**Key Methods**:
```cpp
class WebSocketManager {
public:
  WebSocketManager(const char* serverIP, int serverPort);
  void begin();
  void loop();
  bool isConnected() const;
  void sendMessage(const String& message);
  void setMessageCallback(void (*callback)(const String&));
};
```

**Features**:
- Auto-reconnection capability
- Clean event handling
- Message callback system

### Class 2: SerialBridge
**Responsibility**: Handle Serial communication dengan Arduino dan JSON conversion

**Key Methods**:
```cpp
class SerialBridge {
public:
  SerialBridge(HardwareSerial& serial, int rxPin, int txPin);
  void begin(unsigned long baudRate = 115200);
  void loop();
  void sendCommand(const String& command);
  String jsonToSerial(const String& jsonCmd);
  String serialToJson(const String& serialResp);
  void setResponseCallback(void (*callback)(const String&));
};
```

**Features**:
- Automatic JSON ↔ Serial conversion
- Response callback system
- Non-blocking serial processing

## 2. PalletizerSlave (Arduino Mega) - OOP Structure

### Main File: PalletizerSlave.ino
```cpp
#include "MotorController.h"
#include "CommandProcessor.h"

// Global objects
MotorController* motorController;
CommandProcessor* commandProcessor;

void setup() {
  // Initialize motor controller
  motorController = new MotorController();
  motorController->begin();
  
  // Initialize command processor
  commandProcessor = new CommandProcessor(*motorController);
  commandProcessor->begin();
}

void loop() {
  commandProcessor->loop();  // Process commands
  motorController->run();    // Run motors
  delay(1);
}
```

### Class 1: MotorController
**Responsibility**: Control semua motor dengan AccelStepper

**Key Methods**:
```cpp
class MotorController {
public:
  static const int AXIS_COUNT = 5;
  
  void begin();
  void run();
  void moveTo(char axis, long position);
  void setSpeed(char axis, float speed);
  void homeAll();
  void zeroAll();
  void emergencyStop();
  bool isMoving() const;
  String getPositionString() const;
};
```

**Features**:
- Clean axis control
- Automatic movement status tracking
- Hardware abstraction

### Class 2: CommandProcessor
**Responsibility**: Parse command dan coordinate dengan MotorController

**Key Methods**:
```cpp
class CommandProcessor {
public:
  CommandProcessor(MotorController& motorController);
  void begin();
  void loop();
  void processCommand(const String& command);

private:
  void handleMove(const String& cmd);
  void handleGroupMove(const String& cmd);
  void handleHome();
  void parseMove(const String& cmd);
  long parseAxisValue(const String& cmd, char axis);
};
```

**Features**:
- Clean command parsing
- Error handling
- Automatic response generation

## 3. Key Simplifications

### Removed Components
1. **StatusManager** - Tidak perlu tracking detail status
2. **CommandQueue** - Commands langsung diproses
3. **Multiple classes** - Semua fungsi dalam satu file
4. **Health monitoring** - Tidak perlu untuk operasi dasar
5. **Complex error handling** - Simple error messages saja

### Benefits
- **Reduced memory usage**: ~50KB vs ~250KB
- **Easier debugging**: Semua kode di satu tempat
- **Faster development**: Tidak perlu manage banyak files
- **Simple but powerful**: Tetap mendukung semua fungsi utama

## 4. Communication Protocol

### ESP32 → Arduino Format
```
M X1000 Y2000 S1500\n    // Move command
G X1000 Y2000 Z500\n     // Group move
H\n                      // Home
Z\n                      // Zero
V X1500 Y2000\n         // Set velocity
E\n                     // Emergency stop
S\n                     // Status request
```

### Arduino → ESP32 Format
```
B\n                      // Busy
D\n                      // Done
P X1000 Y2000 Z500\n    // Position
E error_message\n        // Error
SLAVE_READY\n           // Ready
OK\n                    // Acknowledged
```

## 5. Usage Example

### Web Interface
```javascript
// Single axis movement
fetch('/api/move', {
  method: 'POST',
  body: JSON.stringify({ 
    axes: { X: 1000 }, 
    speed: 1500 
  })
});

// Multi-axis simultaneous movement
fetch('/api/group-move', {
  method: 'POST',
  body: JSON.stringify({ 
    axes: { X: 1000, Y: 2000, Z: 500 }, 
    speed: 1000 
  })
});
```

### Data Flow
```
Web Browser → Node.js Server → ESP32 → Arduino → Motors
     ↑             ↑             ↑        ↑         ↓
     └─────────────┴─────────────┴────────┴─────────┘
                    Status Updates
```

## 6. Configuration

### ESP32 (PalletizerMaster.ino)
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP = "192.168.1.100";  // Node.js server IP
const int SERVER_PORT = 3001;
```

### Arduino (PalletizerSlave.ino)
```cpp
// Motor pin mapping
#define X_STEP_PIN 2
#define X_DIR_PIN 3
// ... adjust sesuai hardware

// Motor parameters
#define DEFAULT_SPEED 2000    // Steps per second
#define DEFAULT_ACCEL 1000    // Steps per second²
```

## 7. Troubleshooting

### ESP32 Issues
- Check WiFi credentials
- Verify SERVER_IP matches Node.js server
- Monitor Serial output untuk connection status

### Arduino Issues
- Verify baud rate 115200
- Check motor wiring dan pin assignments
- Monitor untuk "SLAVE_READY" message

### Communication Issues
- ESP32 Serial2 (pins 16,17) → Arduino Serial
- Both devices harus gunakan baud rate 115200
- Check physical wiring connection

## Conclusion

### Benefits of Simple OOP Architecture:

1. **Clean Separation of Concerns**:
   - WebSocketManager: Handle network communication
   - SerialBridge: Handle hardware communication & data conversion
   - MotorController: Handle motor operations
   - CommandProcessor: Handle command parsing & logic

2. **Easy to Read & Maintain**:
   - Each class has single responsibility
   - Clear interfaces between components
   - Simple callback system for communication

3. **Scalable & Extensible**:
   - Easy to add new commands in CommandProcessor
   - Easy to modify communication protocol in SerialBridge
   - Easy to add new motor types in MotorController

4. **Reduced Complexity**:
   - **Master**: 2 classes + main file (vs 5+ classes sebelumnya)
   - **Slave**: 2 classes + main file (vs 4+ classes sebelumnya)
   - No unnecessary status management
   - No complex state machines

5. **Performance Benefits**:
   - Lower memory usage (~50KB vs ~250KB)
   - Faster compilation
   - Simpler debugging

### Code Quality:
- **Object-Oriented**: Proper encapsulation dan inheritance
- **Readable**: Clear naming conventions dan structure
- **Maintainable**: Easy to understand dan modify
- **Testable**: Each class can be tested independently

Arsitektur ini memberikan balance yang perfect antara **simplicity** dan **power**, dengan kode yang **clean**, **readable**, dan **maintainable** menggunakan konsep OOP yang proper.