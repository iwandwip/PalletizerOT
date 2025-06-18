# Command Flow Documentation

## Overview

Dokumentasi lengkap alur perintah dari web interface melalui Node.js server ke ESP32 Master dan kemudian ke Arduino slaves dalam sistem Palletizer Control.

## Arsitektur Sistem

```
Web Interface (React) → Node.js Server → ESP32 Master → Arduino Slaves (X,Y,Z,T,G)
                             ↓              ↓
                        Script Compiler   Command Queue
                        Motion Planner    WebSocket
```

## 1. Tiga Jenis Command dari Web Interface

### 1.1 Script Commands
**Endpoint**: `POST /api/script/execute`
**Deskripsi**: Script kompleks dalam Modern Script Language yang dikompilasi di server

```javascript
// Contoh pengiriman dari web
fetch('/api/script/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
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
fetch('/api/control/play', { method: 'POST' });   // Resume eksekusi
fetch('/api/control/pause', { method: 'POST' });  // Pause
fetch('/api/control/stop', { method: 'POST' });   // Stop dan clear queue
fetch('/api/control/home', { method: 'POST' });   // Homing semua axis
fetch('/api/control/zero', { method: 'POST' });   // Set posisi current = 0
```

### 1.3 Movement Commands
**Endpoint**: `POST /api/move`, `POST /api/group-move`, `POST /api/speed`
**Deskripsi**: Perintah gerakan langsung

```javascript
// Gerakan single axis
fetch('/api/move', {
  method: 'POST',
  body: JSON.stringify({ 
    axes: { X: 1000 }, 
    speed: 1500,
    accel: 500 
  })
});

// Gerakan simultan multi-axis
fetch('/api/group-move', {
  method: 'POST', 
  body: JSON.stringify({
    axes: { X: 1000, Y: 2000, Z: 500 },
    speed: 1000,
    accel: 500
  })
});

// Set kecepatan per axis
fetch('/api/speed', {
  method: 'POST',
  body: JSON.stringify({ 
    axes: { X: 1500, Y: 2000, Z: 1000 } 
  })
});
```

## 2. Pemrosesan di Node.js Server

### 2.1 Script Processing (src/server/index.ts)

**Script Compilation**:
```typescript
// ScriptCompiler mengkonversi Modern Script Language ke command array
const commands = await scriptCompiler.parse(script);

// MotionPlanner mengoptimalkan gerakan
const optimizedCommands = await motionPlanner.plan(commands);

// CommandQueue mengelola urutan eksekusi
commandQueue.enqueue(optimizedCommands);

// ESP32Manager mengirim via WebSocket
esp32Manager.executeCommands(optimizedCommands);
```

**Control Commands**:
```typescript
app.post('/api/control/:action', (req, res) => {
  const { action } = req.params;
  
  switch (action) {
    case 'play':
      esp32Manager.sendCommand({ cmd: 'RESUME' });
      break;
    case 'pause':
      esp32Manager.sendCommand({ cmd: 'PAUSE' });
      break;
    case 'stop':
      esp32Manager.sendCommand({ cmd: 'STOP' });
      commandQueue.clear();
      break;
    case 'home':
      esp32Manager.sendCommand({ cmd: 'HOME' });
      break;
    case 'zero':
      esp32Manager.sendCommand({ cmd: 'ZERO' });
      break;
  }
});
```

**Movement Commands**:
```typescript
app.post('/api/move', (req, res) => {
  const { axes, speed, accel } = req.body;
  
  esp32Manager.sendCommand({
    cmd: 'MOVE',
    data: {
      ...axes,
      speed: speed || 1000,
      accel: accel || 500
    }
  });
});
```

## 3. Pemrosesan di ESP32 Master (firmware/PalletizerMaster/)

### 3.1 WebSocket Communication (WebSocketClient.cpp)

**Koneksi ke Node.js Server**:
```cpp
// ESP32 terhubung ke Node.js server via WebSocket
const char* SERVER_IP = "192.168.1.100";
const int SERVER_PORT = 3001;

PalletizerBridge* palletizerBridge = PalletizerBridge::getInstance();
palletizerBridge->begin();
```

**Message Handling**:
```cpp
void PalletizerBridge::handleServerCommand(const String& message) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, message);

  String cmdType = doc["cmd"];
  JsonObject data = doc["data"];

  if (cmdType == "STOP") {
    queue->clear();
    serial->sendCommand("E");
  } else {
    convertAndQueueCommand(cmdType, data);
  }
}
```

### 3.2 Command Conversion (PalletizerBridge.cpp)

**JSON to Serial Command Conversion**:
```cpp
void PalletizerBridge::convertAndQueueCommand(const String& cmdType, JsonObject data) {
  String arduinoCmd = "";

  if (cmdType == "MOVE") {
    arduinoCmd = "M";
  } else if (cmdType == "GROUP") {
    arduinoCmd = "G";
  } else if (cmdType == "HOME") {
    arduinoCmd = "H";
    queue->enqueue(arduinoCmd);
    return;
  } else if (cmdType == "ZERO") {
    arduinoCmd = "Z";
    queue->enqueue(arduinoCmd);
    return;
  }

  // Tambahkan parameter axis
  if (data.containsKey("X")) arduinoCmd += " X" + String((int)data["X"]);
  if (data.containsKey("Y")) arduinoCmd += " Y" + String((int)data["Y"]);
  if (data.containsKey("Z")) arduinoCmd += " Z" + String((int)data["Z"]);
  if (data.containsKey("T")) arduinoCmd += " T" + String((int)data["T"]);
  if (data.containsKey("G")) arduinoCmd += " G" + String((int)data["G"]);
  if (data.containsKey("speed")) arduinoCmd += " S" + String((int)data["speed"]);

  queue->enqueue(arduinoCmd);
}
```

### 3.3 Serial Communication (SerialBridge.cpp)

**ESP32 ke Arduino Communication**:
```cpp
// Pin configuration untuk Serial2
const int RX2_PIN = 16;
const int TX2_PIN = 17;

bool SerialBridge::sendCommand(const String& command) {
  serialPort->println(command);
  Serial.println("Sent to Arduino: " + command);
  return true;
}
```

## 4. Protocol Komunikasi ESP32 ke Arduino

### 4.1 Format Command Serial

**Pin Configuration**:
- ESP32 Serial2 (GPIO 16, 17) → Arduino Serial

**Format Perintah**:
```
M X1000 Y2000 S1500\n    // Move command
G X1000 Y2000 Z500\n     // Group move (simultan)
H\n                      // Home
Z\n                      // Zero
V X1500 Y2000\n         // Set velocity
A X500 Y500\n           // Set acceleration
E\n                     // Emergency stop
S\n                     // Status request
```

### 4.2 Response Protocol dari Arduino

```
B\n                     // Busy (sedang bergerak)
D\n                     // Done/Idle (gerakan selesai)
E error_message\n       // Error dengan pesan
P X1000 Y2000 Z500 T0 G1\n  // Position report semua axis
SLAVE_READY\n           // Initialization complete
OK\n                    // Command acknowledged
```

### 4.3 Response Handling di ESP32

**PalletizerBridge.cpp**:
```cpp
void PalletizerBridge::handleArduinoResponse(const String& response) {
  String trimmed = response;
  trimmed.trim();

  if (trimmed == "B") {
    sendStatusToServer("BUSY", queue->size());
  } else if (trimmed == "D") {
    sendStatusToServer("IDLE", queue->size());
  } else if (trimmed.startsWith("P")) {
    sendPositionToServer(trimmed);
  } else if (trimmed.startsWith("E")) {
    sendErrorToServer(trimmed.substring(2));
  } else if (trimmed == "SLAVE_READY") {
    sendStatusToServer("SLAVE_READY");
  }
}
```

## 5. Gerakan Motor: Single vs Simultan

### 5.1 Gerakan Single Motor

**Web Request**:
```javascript
fetch('/api/move', {
  method: 'POST',
  body: JSON.stringify({ 
    axes: { X: 1000 }, 
    speed: 1500 
  })
});
```

**Node.js Processing**:
```typescript
esp32Manager.sendCommand({
  cmd: 'MOVE',
  data: {
    X: 1000,
    speed: 1500
  }
});
```

**ESP32 Conversion**:
```cpp
// convertAndQueueCommand() di PalletizerBridge.cpp
String arduinoCmd = "M";
if (data.containsKey("X")) arduinoCmd += " X" + String((int)data["X"]);
if (data.containsKey("speed")) arduinoCmd += " S" + String((int)data["speed"]);
// Result: "M X1000 S1500"
```

**Arduino Processing**:
```cpp
// MotorController.cpp
void MotorController::parseMove(const String& cmd) {
  int speed = parseParameter(cmd, 'S');
  if (speed == 0) speed = DEFAULT_SPEED;

  for (int i = 0; i < AXIS_COUNT; i++) {
    long pos = parseAxisValue(cmd, motorNames[i]);
    if (pos != LONG_MIN) {
      motors[i]->setMaxSpeed(speed);
      motors[i]->moveTo(pos);
    }
  }
  Serial.println("B");  // Report busy
}
```

### 5.2 Gerakan Simultan (Group Movement)

**Web Request**:
```javascript
fetch('/api/group-move', {
  method: 'POST',
  body: JSON.stringify({ 
    axes: { X: 1000, Y: 2000, Z: 500 }, 
    speed: 1000 
  })
});
```

**Node.js Processing**:
```typescript
esp32Manager.sendCommand({
  cmd: 'GROUP',
  data: {
    X: 1000,
    Y: 2000, 
    Z: 500,
    speed: 1000
  }
});
```

**ESP32 Conversion**:
```cpp
String arduinoCmd = "G";
if (data.containsKey("X")) arduinoCmd += " X" + String((int)data["X"]);
if (data.containsKey("Y")) arduinoCmd += " Y" + String((int)data["Y"]);
if (data.containsKey("Z")) arduinoCmd += " Z" + String((int)data["Z"]);
if (data.containsKey("speed")) arduinoCmd += " S" + String((int)data["speed"]);
// Result: "G X1000 Y2000 Z500 S1000"
```

**Arduino Execution**:
```cpp
// MotorController.cpp  
void MotorController::parseGroupMove(const String& cmd) {
  parseMove(cmd);  // Sama dengan single move, tapi semua axis bergerak bersamaan
}

// Semua motor yang memiliki target akan bergerak simultan
// AccelStepper library menangani koordinasi timing secara otomatis
bool MotorController::anyMotorMoving() {
  for (int i = 0; i < AXIS_COUNT; i++) {
    if (motors[i]->run()) return true;  // run() menjalankan satu step
  }
  return false;
}
```

## 6. Modern Script Language Compilation

### 6.1 Server-Side Compilation (ScriptCompiler.ts)

**Input Script**:
```javascript
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
```

**Server Processing**:
```typescript
// src/server/index.ts
app.post('/api/script/execute', async (req, res) => {
  const { script } = req.body;
  
  // Parse script menjadi commands
  const commands = await scriptCompiler.parse(script);
  
  // Optimize dengan motion planner  
  const optimizedCommands = await motionPlanner.plan(commands);
  
  // Queue untuk eksekusi
  commandQueue.enqueue(optimizedCommands);
  
  // Kirim ke ESP32 via WebSocket
  esp32Manager.executeCommands(optimizedCommands);
});
```

**Compiled Commands**:
```json
[
  { "cmd": "GROUP", "data": { "X": 1000, "Y": 2000, "Z": 500, "speed": 1500 }},
  { "cmd": "SYNC" },
  { "cmd": "MOVE", "data": { "Z": -100 }},
  { "cmd": "MOVE", "data": { "G": 1 }},
  { "cmd": "MOVE", "data": { "Z": 100 }}
]
```

### 6.2 Command Execution Flow

```typescript
// ESP32Manager.ts
executeCommands(commands) {
  commands.forEach(cmd => {
    this.sendCommand(cmd);
  });
}

sendCommand(command) {
  // Kirim via WebSocket ke ESP32
  this.ws.send(JSON.stringify(command));
}
```

## 7. Real-time Communication & Status Updates

### 7.1 WebSocket Communication

**Web Client to Node.js**:
```javascript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateStatusDisplay(data);
};

// Subscribe untuk real-time updates
ws.send(JSON.stringify({ type: 'subscribe' }));
```

**Node.js to ESP32**:
```typescript
// src/server/index.ts - WebSocket server untuk web clients
wss.on('connection', (ws) => {
  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    data: {
      esp32Connected: esp32Manager.isConnected(),
      queueLength: commandQueue.length(),
      currentPosition: esp32Manager.getCurrentPosition()
    }
  }));
});
```

### 7.2 Status Updates dari ESP32 ke Server

**ESP32 Status Updates**:
```cpp
// PalletizerBridge.cpp
void PalletizerBridge::sendStatusToServer(const String& status, int queueSize) {
  StaticJsonDocument<256> doc;
  doc["type"] = "status";
  doc["status"] = status;
  doc["queue"] = queueSize;

  String output;
  serializeJson(doc, output);
  webSocket->sendMessage(output);
}

void PalletizerBridge::sendPositionToServer(const String& position) {
  StaticJsonDocument<256> doc;
  doc["type"] = "position";
  JsonObject pos = doc.createNestedObject("position");
  
  // Parse "P X1000 Y2000 Z500 T0 G1" format
  // dan kirim ke server sebagai JSON
}
```

### 7.3 Status Monitoring & Polling

**API Status Endpoint**:
```typescript
app.get('/api/status', (req, res) => {
  res.json({
    esp32Connected: esp32Manager.isConnected(),
    queueLength: commandQueue.length(),
    currentPosition: esp32Manager.getCurrentPosition(),
    systemStatus: esp32Manager.getStatus()
  });
});
```

**Frontend Polling**:
```javascript
// Status polling setiap detik
setInterval(async () => {
  const response = await fetch('/api/status');
  const status = await response.json();
  updateStatusDisplay(status);
}, 1000);
```

## 8. Error Handling dan Recovery

### 8.1 Arduino Command Validation

```cpp
// CommandParser.cpp
bool CommandParser::validateCommand(const ParsedCommand& cmd) {
  return validateAxisValues(cmd);
}

bool CommandParser::validateAxisValues(const ParsedCommand& cmd) {
  for (int i = 0; i < MotorController::AXIS_COUNT; i++) {
    if (cmd.hasAxis[i]) {
      if (cmd.axisValues[i] < MIN_POSITION || cmd.axisValues[i] > MAX_POSITION) {
        return false;
      }
    }
  }
  return true;
}
```

### 8.2 ESP32 Error Handling

```cpp
// PalletizerBridge.cpp
void PalletizerBridge::handleArduinoResponse(const String& response) {
  if (response.startsWith("E")) {
    sendErrorToServer(response.substring(2));
    // Handle error recovery
  }
}

void PalletizerBridge::sendErrorToServer(const String& error) {
  StaticJsonDocument<256> doc;
  doc["type"] = "error";
  doc["error"] = error;
  
  String output;
  serializeJson(doc, output);
  webSocket->sendMessage(output);
}
```

### 8.3 Server Error Handling

```typescript
// src/server/index.ts
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error', success: false });
});
```

## 9. Konfigurasi dan Setup

### 9.1 Network Configuration

```cpp
// PalletizerMaster.ino
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  
const char* SERVER_IP = "192.168.1.100";
const int SERVER_PORT = 3001;

// ESP32 connect ke Node.js server, bukan standalone
```

### 9.2 Hardware Pin Mapping

```cpp
// ESP32 Master pins
const int RX2_PIN = 16;  // Serial2 RX untuk komunikasi ke Arduino
const int TX2_PIN = 17;  // Serial2 TX untuk komunikasi ke Arduino

// Arduino pins (MotorController.cpp)
motors[0] = new AccelStepper(AccelStepper::DRIVER, 2, 3);   // X axis
motors[1] = new AccelStepper(AccelStepper::DRIVER, 4, 5);   // Y axis  
motors[2] = new AccelStepper(AccelStepper::DRIVER, 6, 7);   // Z axis
motors[3] = new AccelStepper(AccelStepper::DRIVER, 8, 9);   // T axis
motors[4] = new AccelStepper(AccelStepper::DRIVER, 10, 11); // G axis
```

### 9.3 Software Architecture

```
Browser ←→ Node.js Server ←→ ESP32 Master ←→ Arduino
  │              │               │             │
React UI    Express API    WebSocket     AccelStepper
             ScriptCompiler   CommandQueue   MotorController
             MotionPlanner    SerialBridge   CommandParser
```

## 10. Performance dan Optimasi

### 10.1 Memory Usage Comparison

- **Old Architecture**: ESP32 parsing scripts (~250KB/320KB RAM)
- **Current Architecture**: Server parsing, ESP32 execution (~50KB/320KB RAM)

### 10.2 Command Queue Implementation  

```cpp
// CommandQueue.cpp (ESP32)
class CommandQueue {
private:
  String commands[MAX_COMMANDS];
  int head = 0;
  int tail = 0;
  int count = 0;
  
public:
  bool enqueue(const String& cmd) {
    if (count >= MAX_COMMANDS) return false;
    commands[tail] = cmd;
    tail = (tail + 1) % MAX_COMMANDS;
    count++;
    return true;
  }
  
  String dequeue() {
    if (count == 0) return "";
    String cmd = commands[head];
    head = (head + 1) % MAX_COMMANDS;
    count--;
    return cmd;
  }
};
```

## 11. Testing dan Debugging

### 11.1 API Testing Commands

```bash
# Test single axis movement
curl -X POST http://localhost:3001/api/move \
  -H "Content-Type: application/json" \
  -d '{"axes": {"X": 1000}, "speed": 1500}'

# Test group movement  
curl -X POST http://localhost:3001/api/group-move \
  -H "Content-Type: application/json" \
  -d '{"axes": {"X": 1000, "Y": 2000, "Z": 500}, "speed": 1000}'

# Test control commands
curl -X POST http://localhost:3001/api/control/home
curl -X POST http://localhost:3001/api/control/stop

# Get system status
curl http://localhost:3001/api/status

# Test script execution
curl -X POST http://localhost:3001/api/script/execute \
  -H "Content-Type: application/json" \
  -d '{"script": "X1000 Y2000\nSYNC\nZ-100"}'
```

### 11.2 Debug Output Examples

**Node.js Server Debug**:
```
🚀 Palletizer Server running on port 3001
📡 WebSocket endpoint: ws://localhost:3001/ws
ESP32 connected: true
Command sent: {"cmd":"MOVE","data":{"X":1000,"speed":1500}}
```

**ESP32 Serial Monitor**:
```
PalletizerMaster Starting...
NEW OOP Architecture
System state changed to: CONNECTED
WebSocket message received: {"cmd":"MOVE","data":{"X":1000,"speed":1500}}
Sent to Arduino: M X1000 S1500
Arduino response: B
Arduino response: D
```

**Arduino Serial Monitor**:
```
SLAVE_READY
Command received: M X1000 S1500
Setting X motor speed: 1500
Moving X motor to: 1000
B
Movement completed
D
```

### 11.3 Frontend Development

```bash
# Start development server  
npm run dev          # Frontend development di http://localhost:3000

# Start Node.js backend
npm run server       # Backend server di http://localhost:3001

# Build untuk ESP32
npm run build        # Generate static files di /out folder
```

### 11.4 Troubleshooting Common Issues

**ESP32 tidak connect ke server**:
- Check WiFi credentials di PalletizerMaster.ino
- Verify SERVER_IP dan SERVER_PORT
- Check network connectivity

**Arduino tidak merespon**:
- Verify serial connection (pins 16,17)
- Check baud rate (115200)
- Monitor serial output untuk error messages

**Command tidak dieksekusi**:
- Check command format dan validation
- Verify axis limits dan bounds
- Monitor error responses dari Arduino

## Rangkuman

Dokumentasi ini menjelaskan arsitektur lengkap sistem Palletizer Control dengan **3 jenis command**:

1. **Script Commands**: Modern Script Language yang dikompilasi di Node.js server
2. **Control Commands**: PLAY/PAUSE/STOP/HOME/ZERO untuk kontrol sistem  
3. **Movement Commands**: Single axis dan group movement untuk gerakan motor

**Alur processing**:
- Web interface → Node.js server (compilation & optimization)
- Node.js server → ESP32 Master (via WebSocket)  
- ESP32 Master → Arduino slave (via Serial)
- Arduino slave → Motor controllers (AccelStepper)

**Real-time updates** melalui WebSocket untuk status monitoring dan error handling di semua level.