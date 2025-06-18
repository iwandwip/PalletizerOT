# Command Flow Documentation

## Overview

Dokumentasi lengkap alur perintah dari web interface ke ESP32 Master dan kemudian ke Arduino Mega slaves dalam sistem Palletizer Control.

## Arsitektur Sistem

```
Web Interface (React) → ESP32 Master → Arduino Mega Slaves (X,Y,Z,T,G)
                            ↓
                        LittleFS
                    (Script Storage)
```

## 1. Tiga Jenis Command dari Web Interface

### 1.1 Script Commands
**Endpoint**: `POST /api/script`
**Deskripsi**: Script kompleks dalam Modern Script Language

```javascript
// Contoh pengiriman dari web
fetch('/api/script', {
  method: 'POST',
  body: JSON.stringify({
    script: `
      GROUP X1000 Y2000 Z500 F1500
      SYNC
      FUNC pickup
        Z-100
        G1
        Z100
      ENDFUNC
      CALL pickup
    `
  })
});
```

### 1.2 Control Commands
**Endpoint**: `POST /api/control/:action`
**Deskripsi**: Perintah kontrol sistem langsung

```javascript
// Kontrol sistem
api.sendControl('PLAY');   // Mulai eksekusi
api.sendControl('PAUSE');  // Jeda
api.sendControl('STOP');   // Stop
api.sendControl('HOME');   // Homing semua axis
api.sendControl('ZERO');   // Set posisi current = 0
```

### 1.3 Movement Commands
**Endpoint**: `POST /api/move`, `POST /api/group-move`
**Deskripsi**: Perintah gerakan langsung

```javascript
// Gerakan single axis
api.move({ X: 1000, speed: 1500 });

// Gerakan simultan multi-axis
api.groupMove({ 
  X: 1000, 
  Y: 2000, 
  Z: 500, 
  speed: 1000 
});

// Set kecepatan per axis
api.setSpeed({ X: 1500, Y: 2000, Z: 1000 });
```

## 2. Pemrosesan di ESP32 Master

### 2.1 Arsitektur Lama (firmware/OldFirmware/)

**PalletizerServer.cpp**: Menerima HTTP requests
```cpp
// Handler untuk command endpoint
server.on("/command", HTTP_POST, [](AsyncWebServerRequest *request) {
  String command = request->getParam("command")->value();
  commandRouter.routeCommand(command);
});
```

**CommandRouter.cpp**: Routing berdasarkan tipe command
```cpp
void CommandRouter::routeCommand(String command) {
  if (command.startsWith("ZERO")) {
    handleSystemCommand(CMD_ZERO);
  }
  else if (command.startsWith("X;")) {
    handleAxisCommand(AXIS_X, command);
  }
  else if (command.startsWith("BROADCAST;")) {
    handleBroadcastCommand(command);
  }
  else if (command.startsWith("SPEED;")) {
    handleSpeedCommand(command);
  }
}
```

**FlashManager.cpp**: Penyimpanan script di LittleFS
```cpp
bool FlashManager::saveScript(String script) {
  File file = LittleFS.open("/script.txt", "w");
  file.print(script);
  file.close();
  return true;
}
```

### 2.2 Arsitektur Baru (firmware/PalletizerMaster/)

**WebSocketClient.cpp**: Komunikasi real-time dengan server Node.js
```cpp
void WebSocketClient::onMessage(String message) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, message);
  
  String type = doc["type"];
  if (type == "MOVE") {
    commandQueue.addCommand(message);
  }
}
```

**CommandQueue.cpp**: Buffer perintah untuk eksekusi berurutan
```cpp
struct Command {
  CommandType type;
  JsonObject data;
  unsigned long timestamp;
};

void CommandQueue::addCommand(String jsonCommand) {
  commands.push(parseCommand(jsonCommand));
}
```

## 3. Protocol Komunikasi ESP32 ke Arduino Mega

### 3.1 Format Command Serial

**Pin Configuration**:
- ESP32 Serial2 (GPIO 16, 17) → Arduino Mega Serial1

**Format Perintah**:
```
M X1000 Y2000 S1500\n    // Move command
G X1000 Y2000 Z500\n     // Group move
H\n                      // Home
Z\n                      // Zero
V X1500 Y2000\n         // Set velocity
A X500 Y500\n           // Set acceleration
E\n                     // Emergency stop
```

### 3.2 Response Protocol dari Arduino

```
B\n                     // Busy
D\n                     // Done/Idle  
E error_code\n          // Error
P X1000 Y2000 Z500\n    // Position report
SLAVE_READY\n           // Initialization complete
```

### 3.3 Implementation di ESP32

**PalletizerBridge.cpp**:
```cpp
void PalletizerBridge::sendToSlave(String command) {
  Serial2.println(command);
  
  // Wait for response
  while (!Serial2.available()) {
    delay(10);
  }
  
  String response = Serial2.readStringUntil('\n');
  handleSlaveResponse(response);
}
```

## 4. Gerakan Motor: Single vs Simultan

### 4.1 Gerakan Single Motor

**Web Request**:
```javascript
api.move({ X: 1000, speed: 1500 });
```

**ESP32 Processing**:
```cpp
// Di CommandRouter.cpp
void handleSingleMove(JsonObject data) {
  String command = "M ";
  if (data.containsKey("X")) {
    command += "X" + String(data["X"].as<int>()) + " ";
  }
  command += "S" + String(data["speed"].as<int>());
  
  bridgeManager.sendToSlave(command);
}
```

**Arduino Mega Parsing**:
```cpp
// Di CommandParser.cpp
void CommandParser::parseMove(String cmd) {
  int xPos = cmd.indexOf("X");
  int sPos = cmd.indexOf("S");
  
  if (xPos >= 0) {
    int value = cmd.substring(xPos+1, sPos).toInt();
    motorController.moveTo(AXIS_X, value);
  }
  
  if (sPos >= 0) {
    int speed = cmd.substring(sPos+1).toInt();
    motorController.setMaxSpeed(AXIS_X, speed);
  }
}
```

### 4.2 Gerakan Simultan (Group Movement)

**Web Request**:
```javascript
api.groupMove({ X: 1000, Y: 2000, Z: 500, speed: 1000 });
```

**ESP32 Processing**:
```cpp
void handleGroupMove(JsonObject data) {
  String command = "G ";
  if (data.containsKey("X")) command += "X" + String(data["X"].as<int>()) + " ";
  if (data.containsKey("Y")) command += "Y" + String(data["Y"].as<int>()) + " ";
  if (data.containsKey("Z")) command += "Z" + String(data["Z"].as<int>()) + " ";
  command += "S" + String(data["speed"].as<int>());
  
  bridgeManager.sendToSlave(command);
}
```

**Arduino Mega Execution**:
```cpp
void CommandParser::parseGroupMove(String cmd) {
  // Parse semua axis dari command
  MotorTarget targets[MAX_AXES];
  int targetCount = 0;
  
  // Extract X, Y, Z positions
  extractAxisTargets(cmd, targets, targetCount);
  
  // Hitung timing untuk gerakan sinkron
  motorController.executeCoordinatedMove(targets, targetCount);
}

void MotorController::executeCoordinatedMove(MotorTarget* targets, int count) {
  // Hitung durasi terpanjang untuk sinkronisasi
  unsigned long maxDuration = calculateMaxDuration(targets, count);
  
  // Adjust speed semua motor untuk finish bersamaan
  for (int i = 0; i < count; i++) {
    float adjustedSpeed = calculateSyncSpeed(targets[i], maxDuration);
    steppers[targets[i].axis].setMaxSpeed(adjustedSpeed);
    steppers[targets[i].axis].moveTo(targets[i].position);
  }
  
  // Jalankan semua motor bersamaan
  runToPosition();
}
```

## 5. Modern Script Language Compilation

### 5.1 Client-Side Compilation (ScriptCompiler.js)

```javascript
// Input script
const script = `
GROUP X1000 Y2000 Z500 F1500
SYNC
FUNC pickup
  Z-100
  G1
  Z100
ENDFUNC
CALL pickup
`;

// Compiled output
const compiled = scriptCompiler.compile(script);
/*
[
  { type: 'GROUP', data: { X: 1000, Y: 2000, Z: 500, speed: 1500 }},
  { type: 'SYNC' },
  { type: 'MOVE', data: { Z: -100 }},
  { type: 'MOVE', data: { G: 1 }},
  { type: 'MOVE', data: { Z: 100 }}
]
*/
```

### 5.2 Batch Upload ke ESP32

```javascript
// CommandUploader.js
class CommandUploader {
  async uploadBatch(commands) {
    for (const cmd of commands) {
      await fetch('/api/command', {
        method: 'POST',
        body: JSON.stringify(cmd)
      });
      
      // Wait for completion
      await this.waitForCompletion();
    }
  }
}
```

## 6. Real-time Communication

### 6.1 Server-Sent Events (SSE)

**Client**:
```javascript
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateDebugTerminal(data);
};
```

**ESP32 Server**:
```cpp
void PalletizerServer::handleSSE(AsyncWebServerRequest *request) {
  AsyncEventSource *events = new AsyncEventSource("/events");
  
  events->onConnect([](AsyncEventSourceClient *client) {
    client->send("connected", NULL, millis(), 1000);
  });
  
  server.addHandler(events);
}
```

### 6.2 Status Monitoring

```javascript
// Status polling
setInterval(async () => {
  const status = await api.getStatus();
  updateStatusDisplay(status);
}, 1000);
```

## 7. Error Handling dan Recovery

### 7.1 Command Validation

```cpp
bool CommandValidator::isValid(String command) {
  // Check format
  if (!command.endsWith("\n")) return false;
  
  // Check axis bounds
  if (hasAxisMovement(command)) {
    return validateAxisLimits(command);
  }
  
  return true;
}
```

### 7.2 Communication Timeout

```cpp
bool PalletizerBridge::sendWithTimeout(String command, int timeout = 5000) {
  Serial2.println(command);
  
  unsigned long start = millis();
  while (!Serial2.available()) {
    if (millis() - start > timeout) {
      handleTimeout();
      return false;
    }
    delay(10);
  }
  
  return true;
}
```

## 8. Konfigurasi dan Setup

### 8.1 Network Configuration

```cpp
// PalletizerMaster.ino
#define DEV_MODE true  // Set false untuk production

void setup() {
  if (DEV_MODE) {
    // Station mode - connect to existing WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  } else {
    // AP mode - create hotspot
    WiFi.softAP("Palletizer_" + String(ESP.getEfuseMac()));
  }
}
```

### 8.2 Hardware Pin Mapping

```cpp
// Pin definitions untuk ESP32 Master
#define SERIAL2_RX_PIN 16
#define SERIAL2_TX_PIN 17
#define STATUS_LED_PIN 2
#define EMERGENCY_STOP_PIN 4

// Pin definitions untuk Arduino Mega Slave
#define STEP_PIN_X 2
#define DIR_PIN_X 3
#define STEP_PIN_Y 4
#define DIR_PIN_Y 5
// ... dan seterusnya untuk Z, T, G axes
```

## 9. Performance dan Optimasi

### 9.1 Memory Usage

- **Arsitektur Lama**: ~250KB/320KB (parsing script di ESP32)
- **Arsitektur Baru**: ~50KB/320KB (hanya eksekusi command)

### 9.2 Command Queue Optimization

```cpp
// Circular buffer untuk efisiensi memory
class CommandQueue {
private:
  Command buffer[MAX_COMMANDS];
  int head = 0;
  int tail = 0;
  int size = 0;
  
public:
  bool enqueue(Command cmd) {
    if (size >= MAX_COMMANDS) return false;
    
    buffer[tail] = cmd;
    tail = (tail + 1) % MAX_COMMANDS;
    size++;
    return true;
  }
};
```

## 10. Testing dan Debugging

### 10.1 Debug Commands

```bash
# Test single axis movement
curl -X POST http://192.168.1.100/api/move \
  -d '{"X": 1000, "speed": 1500}'

# Test group movement  
curl -X POST http://192.168.1.100/api/group-move \
  -d '{"X": 1000, "Y": 2000, "Z": 500, "speed": 1000}'

# Get system status
curl http://192.168.1.100/api/status
```

### 10.2 Serial Monitor Output

```
[DEBUG] Command received: M X1000 S1500
[DEBUG] Sending to slave: M X1000 S1500
[DEBUG] Slave response: B
[DEBUG] Movement started
[DEBUG] Slave response: D
[DEBUG] Movement completed
```

Dokumentasi ini memberikan gambaran lengkap tentang alur perintah dari web interface hingga eksekusi di motor melalui ESP32 Master dan Arduino Mega slaves.