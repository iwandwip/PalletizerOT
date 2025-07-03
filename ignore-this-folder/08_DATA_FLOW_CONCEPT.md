# New Server-Centric Data Flow Architecture

## 🔄 System Overview

**NEW ARCHITECTURE**: Server-Centric Multi-Layer Communication
```
Client (Web App) ↔ Laptop Server ↔ ESP32 Master ↔ Arduino Mega Slave (5 Motors)
    WebSocket/HTTP      WebSocket         UART Serial
```

**OLD ARCHITECTURE**: ESP32-Centric Direct Communication  
```
Client (Web App) → ESP32 Master → ESP32 Slaves (x,y,z,t,g)
     HTTP              UART Serial
```

---

## 📊 Architecture Comparison

| Aspect | OLD System | NEW System |
|--------|------------|------------|
| **Hardware** | 1 ESP32 Master + 5 ESP32 Slaves | 1 Laptop + 1 ESP32 + 1 Arduino Mega |
| **Processing** | ESP32 Master (limited memory) | Laptop Server (unlimited power) |
| **Communication** | HTTP → UART | WebSocket → WebSocket → UART |
| **Script Parsing** | ESP32 (memory limited) | Server (Node.js with full features) |
| **File Storage** | ESP32 LittleFS (4MB) | Server filesystem (unlimited) |
| **Real-time Updates** | Server-Sent Events | WebSocket bidirectional |
| **Scalability** | Single palletizer only | Multiple palletizers support |

---

## 📡 Data Flow Scenarios

### **Scenario 1: Single Axis Movement**

**User Input:** `X1000 F1500`

```
┌─────────────┐    WebSocket/HTTP     ┌──────────────┐
│   Client    │ ────────────────────→ │    Server    │
│  (Browser)  │                       │  (Node.js)   │
└─────────────┘                       └──────────────┘
                                              │
                                              ▼
                                      ┌──────────────┐
                                      │ ScriptCompiler│
                                      │ Parse: X1000  │
                                      │ Speed: 1500   │
                                      └──────────────┘
                                              │
                                              ▼ WebSocket JSON
                                      ┌──────────────┐
                                      │ ESP32 Master │
                                      │   (Bridge)   │
                                      └──────────────┘
                                              │
                                              ▼ UART Text
                                      ┌──────────────┐
                                      │Arduino Mega  │
                                      │ (5 Motors)   │
                                      └──────────────┘
```

**Detailed Flow:**
```
1. Client → Server (WebSocket)
   Message: {cmd: "X1000 F1500"}

2. Server Processing (ScriptCompiler.ts)
   - Parse: X1000 F1500 → {X: 1000, speed: 1500}
   - Validate command
   - Add to CommandQueue

3. Server → ESP32 Master (WebSocket)
   {"cmd": "MOVE", "data": {"X": 1000, "speed": 1500}}

4. ESP32 Master → Arduino Mega (UART)
   M X1000 S1500

5. Arduino Mega Response (UART)
   B  (Busy - motor moving)
   D  (Done - position reached)

6. ESP32 Master → Server (WebSocket)
   {"type": "status", "data": {"status": "BUSY"}}
   {"type": "position", "data": {"X": 1000, "Y": 0, "Z": 0, "T": 0, "G": 0}}

7. Server → Client (WebSocket)
   Real-time status and position updates
```

---

### **Scenario 2: GROUP Command (Simultaneous Movement)**

**User Input:** `GROUP X1000 Y2000 Z500`

```
1. Client → Server
   Script: "GROUP X1000 Y2000 Z500"

2. Server Processing
   - Parse: GROUP X1000 Y2000 Z500
   - Convert to: {X: 1000, Y: 2000, Z: 500}
   - Generate single group command

3. Server → ESP32 → Arduino
   G X1000 Y2000 Z500

4. Arduino Mega Processing
   - AccelStepper motors[0].moveTo(1000)  // X
   - AccelStepper motors[1].moveTo(2000)  // Y  
   - AccelStepper motors[2].moveTo(500)   // Z
   - Run all motors simultaneously

5. Response Chain
   Arduino → ESP32 → Server → Client
   Status updates for coordinated movement
```

---

### **Scenario 3: Advanced Script Execution**

**User Script:**
```javascript
FUNC pickup
  Z-100
  G1
  Z100
ENDFUNC

LOOP 3
  CALL pickup
  X100
ENDLOOP
```

```
1. Client → Server (HTTP)
   POST /api/script/execute
   Body: {script: "FUNC pickup\n  Z-100\n  G1\n  Z100\nENDFUNC\n\nLOOP 3\n  CALL pickup\n  X100\nENDLOOP"}

2. Server Processing (ScriptCompiler.ts)
   ┌─────────────────┐
   │   TOKENIZER     │ → ["FUNC", "pickup", "Z-100", "G1", "Z100", "ENDFUNC", "LOOP", "3", ...]
   └─────────────────┘
   ┌─────────────────┐
   │     PARSER      │ → {functions: {pickup: ["Z-100", "G1", "Z100"]}, commands: [...]}
   └─────────────────┘
   ┌─────────────────┐
   │   EXPANDER      │ → ["Z-100", "G1", "Z100", "X100", "Z-100", "G1", "Z100", "X100", ...]
   └─────────────────┘

3. Server Command Queue Execution
   Command 1: Z-100 → M Z-100
   Command 2: G1    → Special gripper command
   Command 3: Z100  → M Z100
   Command 4: X100  → M X100
   (Repeat for loop iterations)

4. Real-time WebSocket Updates
   Each command execution sends status to client
```

---

## 📋 Communication Protocols

### **Layer 1: Client ↔ Server**

**WebSocket Messages:**
```javascript
// Client to Server
{type: "command", data: "X1000 Y2000 F1500"}
{type: "control", data: "PLAY"}
{type: "control", data: "PAUSE"}

// Server to Client  
{type: "status", data: {status: "BUSY", queue: 5}}
{type: "position", data: {X: 1000, Y: 2000, Z: 0, T: 0, G: 0}}
{type: "error", data: {error: "Position out of bounds"}}
```

**HTTP API Endpoints:**
```javascript
POST /api/script/execute     // Execute script
POST /api/script/parse       // Parse and validate only
POST /api/control/play       // Play/Resume
POST /api/control/pause      // Pause execution
POST /api/control/stop       // Stop and clear queue
POST /api/control/home       // Home all axes
GET  /api/status            // Get current status
```

### **Layer 2: Server ↔ ESP32 Master**

**WebSocket JSON Commands:**
```javascript
// Server to ESP32
{"cmd": "MOVE", "data": {"X": 1000, "Y": 2000, "speed": 1500, "accel": 500}}
{"cmd": "GROUP", "data": {"X": 1000, "Y": 2000, "Z": 500}}
{"cmd": "HOME"}
{"cmd": "STOP"}
{"cmd": "EMERGENCY_STOP"}

// ESP32 to Server
{"type": "status", "data": {"status": "BUSY"}}
{"type": "position", "data": {"X": 1000, "Y": 2000, "Z": 0, "T": 0, "G": 0}}
{"type": "error", "data": {"error": "Arduino not responding"}}
{"type": "heartbeat", "data": {"uptime": 12345, "heap": 45000}}
```

### **Layer 3: ESP32 Master ↔ Arduino Mega**

**UART Text Protocol:**
```
// ESP32 to Arduino
M X1000 Y2000 S1500 A500    // Move command with speed/accel
G X1000 Y2000 Z500          // Group move command  
H                           // Home all axes
Z                           // Zero all positions
S                           // Status request
E                           // Emergency stop

// Arduino to ESP32
P X1000 Y2000 Z0 T0 G0      // Position report
B                           // Busy (motors moving)
D                           // Done (movement complete)
E Error message             // Error report
```

---

## 🎯 Key Advantages of New Architecture

### **1. Processing Power Distribution**
- **Server**: Heavy lifting (parsing, planning, storage)
- **ESP32**: Lightweight bridge/gateway
- **Arduino**: Dedicated motor control

### **2. Memory Management**
- **Server**: Unlimited script size and complexity
- **ESP32**: Minimal memory usage for bridging
- **Arduino**: Focused on real-time motor control

### **3. Scalability**
- Support multiple palletizers from single server
- Easy to add new devices to network
- Cloud deployment ready

### **4. Real-time Communication**
- WebSocket bidirectional updates
- Instant status and position feedback
- Live debugging and monitoring

### **5. Advanced Features**
- Complex motion planning on server
- Machine learning integration possible
- Data analytics and logging
- Remote monitoring and control

---

## 🔧 Implementation Files

### **Server Components**
```
src/server/
├── index.ts              // Main server with WebSocket
├── ScriptCompiler.ts     // Advanced script parsing
├── MotionPlanner.ts      // Motion planning algorithms
├── CommandQueue.ts       // Command queuing system
└── ESP32Manager.ts       // ESP32 connection management
```

### **ESP32 Master Firmware**
```
firmware/PalletizerMaster/
├── PalletizerMaster.ino  // Main Arduino IDE file
├── PalletizerBridge.h/.cpp  // Main coordinator class
├── WebSocketClient.h/.cpp   // Server communication
├── SerialBridge.h/.cpp      // Arduino communication
├── CommandQueue.h/.cpp      // Local command buffering
└── StatusManager.h/.cpp     // Status and health monitoring
```

### **Arduino Mega Slave Firmware**
```
firmware/PalletizerSlave/
├── PalletizerSlave.ino      // Main Arduino IDE file
├── PalletizerSlave.h/.cpp   // Main controller class
├── MotorController.h/.cpp   // 5-motor AccelStepper control
├── CommandParser.h/.cpp     // UART command parsing
└── SlaveStatusManager.h/.cpp // Health and performance monitoring
```

---

## 🚀 Future Enhancements

1. **Multiple Palletizer Support**: Server can manage multiple devices
2. **Cloud Deployment**: Deploy server to cloud for remote access
3. **Advanced Motion Planning**: Trajectory optimization and collision avoidance
4. **Machine Learning**: Predictive maintenance and optimization
5. **Data Analytics**: Performance monitoring and reporting
6. **Mobile App**: Native mobile application for control
7. **Voice Control**: Integration with voice assistants
8. **AR/VR Interface**: 3D visualization and control

This new architecture provides a solid foundation for advanced palletizer control with unlimited scalability and features.